use std::net::{IpAddr, Ipv4Addr, TcpListener, UdpSocket};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::Duration;

use serde::Serialize;

const PORT_START: u16 = 3939;
const PORT_TRIES: u16 = 10;

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CueAirInfo {
    pub enabled: bool,
    pub url: String,
    pub qr_svg: String,
    pub lan: bool,
    pub error: String,
}

pub struct AirServer {
    info: CueAirInfo,
    latest: Arc<Mutex<Option<String>>>,
    stop: Arc<AtomicBool>,
    thread: Option<JoinHandle<()>>,
}

impl AirServer {
    pub fn start() -> Result<Self, String> {
        let token = format!("{:032x}", rand::random::<u128>());
        let (server, port) = bind_server()?;
        let (ip, lan) = lan_ip();
        let url = format!("http://{ip}:{port}/?token={token}");
        let qr_svg = make_qr(&url)?;
        let latest = Arc::new(Mutex::new(None));
        let stop = Arc::new(AtomicBool::new(false));
        let thread = {
            let latest = Arc::clone(&latest);
            let stop = Arc::clone(&stop);
            let token = token.clone();
            std::thread::spawn(move || serve(server, token, latest, stop))
        };
        Ok(Self {
            info: CueAirInfo {
                enabled: true,
                url,
                qr_svg,
                lan,
                error: String::new(),
            },
            latest,
            stop,
            thread: Some(thread),
        })
    }

    pub fn info(&self) -> CueAirInfo {
        self.info.clone()
    }

    pub fn publish(&self, answer: &str) {
        if let Ok(mut latest) = self.latest.lock() {
            *latest = Some(answer.to_string());
        }
    }

    pub fn stop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
        if let Some(thread) = self.thread.take() {
            let _ = thread.join();
        }
    }
}

impl Drop for AirServer {
    fn drop(&mut self) {
        self.stop();
    }
}

fn bind_server() -> Result<(tiny_http::Server, u16), String> {
    for port in PORT_START..PORT_START + PORT_TRIES {
        if TcpListener::bind(("0.0.0.0", port)).is_ok() {
            return tiny_http::Server::http(("0.0.0.0", port))
                .map(|server| (server, port))
                .map_err(|_| "air".to_string());
        }
    }
    Err("air".into())
}

fn lan_ip() -> (IpAddr, bool) {
    let Ok(socket) = UdpSocket::bind("0.0.0.0:0") else {
        return (IpAddr::V4(Ipv4Addr::LOCALHOST), false);
    };
    if socket.connect("8.8.8.8:80").is_err() {
        return (IpAddr::V4(Ipv4Addr::LOCALHOST), false);
    }
    match socket.local_addr().map(|address| address.ip()) {
        Ok(ip) if !ip.is_loopback() && !ip.is_unspecified() => (ip, true),
        _ => (IpAddr::V4(Ipv4Addr::LOCALHOST), false),
    }
}

fn make_qr(url: &str) -> Result<String, String> {
    let code = qrcode::QrCode::new(url.as_bytes()).map_err(|_| "air".to_string())?;
    Ok(code
        .render::<qrcode::render::svg::Color>()
        .min_dimensions(220, 220)
        .build())
}

fn serve(
    server: tiny_http::Server,
    token: String,
    latest: Arc<Mutex<Option<String>>>,
    stop: Arc<AtomicBool>,
) {
    while !stop.load(Ordering::SeqCst) {
        let request = match server.recv_timeout(Duration::from_millis(250)) {
            Ok(Some(request)) => request,
            Ok(None) => continue,
            Err(_) => break,
        };
        handle(request, &token, &latest);
    }
}

fn handle(request: tiny_http::Request, token: &str, latest: &Arc<Mutex<Option<String>>>) {
    let url = request.url().to_string();
    let path = url.split('?').next().unwrap_or("/");
    if path == "/" {
        let response = tiny_http::Response::from_string(include_str!("air_page.html"))
            .with_header(header("Content-Type", "text/html; charset=utf-8"));
        let _ = request.respond(response);
        return;
    }
    if path == "/api/latest" {
        if query_param(&url, "token").as_deref() != Some(token) {
            let _ = request.respond(tiny_http::Response::from_string("forbidden").with_status_code(403));
            return;
        }
        let answer = latest.lock().ok().and_then(|value| value.clone());
        let body = serde_json::json!({ "answer": answer }).to_string();
        let response = tiny_http::Response::from_string(body)
            .with_header(header("Content-Type", "application/json; charset=utf-8"))
            .with_header(header("Cache-Control", "no-store"));
        let _ = request.respond(response);
        return;
    }
    let _ = request.respond(tiny_http::Response::from_string("not found").with_status_code(404));
}

fn header(name: &str, value: &str) -> tiny_http::Header {
    tiny_http::Header::from_bytes(name.as_bytes(), value.as_bytes()).expect("valid header")
}

fn query_param(url: &str, key: &str) -> Option<String> {
    let query = url.split_once('?')?.1;
    query.split('&').find_map(|pair| {
        let (name, value) = pair.split_once('=')?;
        (name == key).then(|| value.to_string())
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};

    #[test]
    fn parses_only_the_requested_query_key() {
        assert_eq!(query_param("/?token=abc&x=1", "token"), Some("abc".into()));
        assert_eq!(query_param("/?x=1&token=abc", "token"), Some("abc".into()));
        assert_eq!(query_param("/?x=1", "token"), None);
    }

    #[test]
    fn token_is_not_empty() {
        let token = format!("{:032x}", rand::random::<u128>());
        assert_eq!(token.len(), 32);
        assert!(token.chars().all(|c| c.is_ascii_hexdigit()));
    }

    fn get(port: u16, path: &str) -> String {
        let mut stream = std::net::TcpStream::connect(("127.0.0.1", port)).unwrap();
        stream
            .write_all(format!("GET {path} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n").as_bytes())
            .unwrap();
        let mut response = String::new();
        stream.read_to_string(&mut response).unwrap();
        response
    }

    #[test]
    fn a_new_server_rotates_the_token() {
        let first = AirServer::start().unwrap();
        let first_token = query_param(&first.info().url, "token").unwrap();
        drop(first);
        let second = AirServer::start().unwrap();
        let second_info = second.info();
        let second_token = query_param(&second_info.url, "token").unwrap();
        assert_ne!(first_token, second_token);
        let port = second_info
            .url
            .split(':')
            .nth(2)
            .unwrap()
            .split('/')
            .next()
            .unwrap()
            .parse::<u16>()
            .unwrap();
        assert!(get(port, &format!("/api/latest?token={first_token}")).starts_with("HTTP/1.1 403"));
        assert!(get(port, &format!("/api/latest?token={second_token}")).starts_with("HTTP/1.1 200"));
    }

    #[test]
    fn serves_only_the_latest_answer_with_the_token() {
        let server = AirServer::start().unwrap();
        let info = server.info();
        let port = info.url.split(':').nth(2).unwrap().split('/').next().unwrap().parse::<u16>().unwrap();
        let token = query_param(&info.url, "token").unwrap();
        server.publish("B");
        let ok = get(port, &format!("/api/latest?token={token}"));
        assert!(ok.starts_with("HTTP/1.1 200"));
        assert!(ok.contains("{\"answer\":\"B\"}"));
        let denied = get(port, "/api/latest?token=wrong");
        assert!(denied.starts_with("HTTP/1.1 403"));
    }
}
