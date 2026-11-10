use std::error::Error;
use std::fs::File;
use std::io::{BufRead, BufReader, Write};
use std::os::windows::io::FromRawHandle;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use windows::core::PCWSTR;
use windows::Win32::Foundation::ERROR_PIPE_CONNECTED;
use windows::Win32::Storage::FileSystem::PIPE_ACCESS_DUPLEX;
use windows::Win32::System::Pipes::{
    ConnectNamedPipe, CreateNamedPipeW, PIPE_READMODE_BYTE, PIPE_TYPE_BYTE, PIPE_WAIT,
};

fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(Some(0)).collect()
}

fn send(file: &mut File, line: &str) -> Result<(), String> {
    // Pipe writes are synchronous; flushing a named pipe can block until the
    // other end drains it.
    writeln!(file, "{line}").map_err(|error| format!("write: {error}"))
}

fn read_line(reader: &mut BufReader<File>) -> Result<String, String> {
    let mut line = String::new();
    let read = reader
        .read_line(&mut line)
        .map_err(|error| format!("read: {error}"))?;
    if read == 0 {
        return Err("pipe closed".to_string());
    }
    Ok(line.trim().to_string())
}

fn expect(ack: &str, needle: &str) -> Result<(), String> {
    if ack.contains(needle) {
        Ok(())
    } else {
        Err(format!("expected {needle}, got {ack}"))
    }
}

fn wait_exit(child: &mut Child) -> Result<(), String> {
    let start = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(_)) => return Ok(()),
            Ok(None) if start.elapsed() < Duration::from_secs(5) => {
                std::thread::sleep(Duration::from_millis(50));
            }
            Ok(None) => return Err("sidecar did not exit".to_string()),
            Err(error) => return Err(format!("wait: {error}")),
        }
    }
}

fn run(
    child: &mut Child,
    mut file: File,
    mut reader: BufReader<File>,
) -> Result<(), String> {
    send(&mut file, "hello")?;
    let ready = read_line(&mut reader)?;
    if ready != "ready" {
        return Err(format!("expected ready, got {ready}"));
    }
    println!("ready");

    let start = Instant::now();
    for cycle in 0..20 {
        let show_start = Instant::now();
        send(&mut file, "show")?;
        let ack = read_line(&mut reader)?;
        expect(&ack, "affinity=0x11")?;
        expect(&ack, "visible=true")?;
        if cycle == 0 {
            println!("show_ms={}", show_start.elapsed().as_millis());
        }

        send(&mut file, "ping")?;
        if read_line(&mut reader)? != "pong" {
            return Err("ping failed".to_string());
        }

        send(&mut file, "hide")?;
        let ack = read_line(&mut reader)?;
        expect(&ack, "affinity=0x11")?;
        expect(&ack, "visible=false")?;
    }
    println!("cycles=20 elapsed_ms={}", start.elapsed().as_millis());

    send(&mut file, "quit")?;
    drop(file);
    wait_exit(child)
}

fn main() {
    if let Err(error) = real_main() {
        eprintln!("bridge-host failed: {error}");
        std::process::exit(1);
    }
}

fn real_main() -> Result<(), Box<dyn Error>> {
    let exe = std::env::current_exe()?.with_file_name("rune-overlay-poc.exe");
    if !exe.exists() {
        return Err(format!("sidecar not found: {}", exe.display()).into());
    }

    let nonce = SystemTime::now().duration_since(UNIX_EPOCH)?.as_nanos();
    let name = format!("cue-rune-poc-{}-{nonce}", std::process::id());
    let path = format!("\\\\.\\pipe\\{name}");
    let path = wide(&path);

    let handle = unsafe {
        CreateNamedPipeW(
            PCWSTR(path.as_ptr()),
            PIPE_ACCESS_DUPLEX,
            PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT,
            1,
            64 * 1024,
            64 * 1024,
            0,
            None,
        )
    };
    if handle.is_invalid() {
        return Err("CreateNamedPipeW failed".into());
    }

    let mut child = Command::new(&exe)
        .arg("--pipe")
        .arg(&name)
        .stdout(Stdio::null())
        .stderr(Stdio::inherit())
        .spawn()?;

    let connected = unsafe { ConnectNamedPipe(handle, None) };
    if let Err(error) = connected {
        if error.code().0 as u32 != ERROR_PIPE_CONNECTED.0 {
            let _ = child.kill();
            return Err(format!("ConnectNamedPipe: {error}").into());
        }
    }

    let file = unsafe { File::from_raw_handle(handle.0) };
    let reader = BufReader::new(file.try_clone()?);
    let result = run(&mut child, file, reader);
    if result.is_err() {
        let _ = child.kill();
    }
    result.map_err(|error| error.into())
}
