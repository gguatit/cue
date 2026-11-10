use std::fs::File;
use std::io::Read;
use std::mem::{size_of, size_of_val};
use std::os::windows::io::{AsRawHandle, FromRawHandle};
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::mpsc;
use std::time::{Duration, Instant};

use serde_json::{Value, json};
use windows::core::{BOOL, PCWSTR};
use windows::Win32::Foundation::{CloseHandle, ERROR_PIPE_CONNECTED, HANDLE, HLOCAL};
use windows::Win32::Security::Authorization::{
    ConvertStringSecurityDescriptorToSecurityDescriptorW, SDDL_REVISION_1,
};
use windows::Win32::Security::{PSECURITY_DESCRIPTOR, SECURITY_ATTRIBUTES};
use windows::Win32::Storage::FileSystem::PIPE_ACCESS_DUPLEX;
use windows::Win32::System::JobObjects::{
    AssignProcessToJobObject, CreateJobObjectW, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JobObjectExtendedLimitInformation,
    SetInformationJobObject,
};
use windows::Win32::System::Pipes::{
    ConnectNamedPipe, CreateNamedPipeW, PIPE_READMODE_BYTE, PIPE_TYPE_BYTE, PIPE_WAIT,
    PeekNamedPipe,
};

const MAX_FRAME: u32 = 1024 * 1024;
const PIPE_TIMEOUT: Duration = Duration::from_secs(5);
const START_TIMEOUT: Duration = Duration::from_secs(10);

pub struct RuneBridge {
    child: Child,
    pipe: File,
    job: Option<Job>,
    next_id: u64,
}

struct Job(isize);

impl Drop for Job {
    fn drop(&mut self) {
        unsafe {
            let _ = CloseHandle(HANDLE(self.0 as _));
        }
    }
}

fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(Some(0)).collect()
}

fn security_attributes() -> Result<(SECURITY_ATTRIBUTES, PSECURITY_DESCRIPTOR), String> {
    let sddl = wide("D:P(A;;GA;;;SY)(A;;GA;;;OW)");
    let mut descriptor = PSECURITY_DESCRIPTOR::default();
    unsafe {
        ConvertStringSecurityDescriptorToSecurityDescriptorW(
            PCWSTR(sddl.as_ptr()),
            SDDL_REVISION_1,
            &mut descriptor,
            None,
        )
    }
    .map_err(|error| format!("rune bridge security descriptor: {error}"))?;
    let attributes = SECURITY_ATTRIBUTES {
        nLength: size_of::<SECURITY_ATTRIBUTES>() as u32,
        lpSecurityDescriptor: descriptor.0,
        bInheritHandle: BOOL(0),
    };
    Ok((attributes, descriptor))
}

fn assign_job(child: &Child) -> Result<Job, String> {
    let job = unsafe { CreateJobObjectW(None, PCWSTR::null()) }
        .map_err(|error| format!("rune bridge create job: {error}"))?;
    let mut info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
    info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
    unsafe {
        SetInformationJobObject(
            job,
            JobObjectExtendedLimitInformation,
            &info as *const _ as *const _,
            size_of_val(&info) as u32,
        )
    }
    .map_err(|error| format!("rune bridge job limits: {error}"))?;
    unsafe { AssignProcessToJobObject(job, HANDLE(child.as_raw_handle())) }
        .map_err(|error| format!("rune bridge job assign: {error}"))?;
    Ok(Job(job.0 as isize))
}

fn send(pipe: &mut File, value: Value) -> Result<(), String> {
    let body = serde_json::to_vec(&value).map_err(|error| format!("rune bridge json: {error}"))?;
    if body.is_empty() || body.len() > MAX_FRAME as usize {
        return Err("rune bridge frame too large".to_string());
    }
    use std::io::Write;
    pipe.write_all(&(body.len() as u32).to_le_bytes())
        .and_then(|_| pipe.write_all(&body))
        .map_err(|error| format!("rune bridge write: {error}"))
}

fn read(pipe: &mut File, timeout: Duration) -> Result<Value, String> {
    let handle = HANDLE(pipe.as_raw_handle());
    let deadline = Instant::now() + timeout;
    let mut available = 0u32;
    loop {
        unsafe { PeekNamedPipe(handle, None, 0, None, Some(&mut available), None) }
            .map_err(|error| format!("rune bridge peek: {error}"))?;
        if available >= 4 {
            break;
        }
        if Instant::now() >= deadline {
            return Err("rune bridge timeout".to_string());
        }
        std::thread::sleep(Duration::from_millis(20));
    }
    let mut header = [0u8; 4];
    pipe.read_exact(&mut header)
        .map_err(|error| format!("rune bridge read header: {error}"))?;
    let length = u32::from_le_bytes(header);
    if length == 0 || length > MAX_FRAME {
        return Err(format!("rune bridge invalid frame length {length}"));
    }
    loop {
        unsafe { PeekNamedPipe(handle, None, 0, None, Some(&mut available), None) }
            .map_err(|error| format!("rune bridge peek body: {error}"))?;
        if available >= length {
            break;
        }
        if Instant::now() >= deadline {
            return Err("rune bridge body timeout".to_string());
        }
        std::thread::sleep(Duration::from_millis(20));
    }
    let mut body = vec![0u8; length as usize];
    pipe.read_exact(&mut body)
        .map_err(|error| format!("rune bridge read body: {error}"))?;
    serde_json::from_slice(&body).map_err(|error| format!("rune bridge json: {error}"))
}

impl RuneBridge {
    pub fn start(sidecar: &Path) -> Result<Self, String> {
        let nonce = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|error| error.to_string())?
            .as_nanos();
        let name = format!("cue-rune-{}-{nonce}", std::process::id());
        let path = wide(&format!("\\\\.\\pipe\\{name}"));
        let (security, descriptor) = security_attributes()?;
        let handle = unsafe {
            CreateNamedPipeW(
                PCWSTR(path.as_ptr()),
                PIPE_ACCESS_DUPLEX,
                PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT,
                1,
                64 * 1024,
                64 * 1024,
                0,
                Some(&security),
            )
        };
        unsafe {
            let _ = windows::Win32::Foundation::LocalFree(Some(HLOCAL(descriptor.0)));
        }
        if handle.is_invalid() {
            return Err("rune bridge create pipe failed".to_string());
        }

        let mut child = Command::new(sidecar)
            .arg("--pipe")
            .arg(&name)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|error| format!("rune bridge spawn: {error}"))?;
        let job = assign_job(&child).ok();

        let raw = handle.0 as isize;
        let (tx, rx) = mpsc::channel();
        std::thread::spawn(move || {
            let result = unsafe { ConnectNamedPipe(HANDLE(raw as _), None) }
                .map_err(|error| error.code().0 as u32);
            let _ = tx.send(result);
        });
        match rx.recv_timeout(START_TIMEOUT) {
            Ok(Ok(())) => {}
            Ok(Err(code)) if code == ERROR_PIPE_CONNECTED.0 => {}
            Ok(Err(code)) => {
                let _ = child.kill();
                return Err(format!("rune bridge connect failed: {code}"));
            }
            Err(_) => {
                let _ = child.kill();
                return Err("rune bridge connect timeout".to_string());
            }
        }

        let mut pipe = unsafe { File::from_raw_handle(handle.0) };
        send(&mut pipe, json!({"type":"hello","protocol":1}))?;
        let ready = read(&mut pipe, START_TIMEOUT)?;
        if ready.get("type").and_then(Value::as_str) != Some("ready") {
            let _ = child.kill();
            return Err(format!("rune bridge not ready: {ready}"));
        }
        Ok(Self {
            child,
            pipe,
            job,
            next_id: 1,
        })
    }

    pub fn show(
        &mut self,
        answer: &str,
        style: &str,
        duration_ms: u64,
        rect: (i32, i32, i32, i32),
        scale: f64,
    ) -> Result<(), String> {
        let id = self.next_id;
        self.next_id = self.next_id.wrapping_add(1);
        send(
            &mut self.pipe,
            json!({
                "type": "show_overlay",
                "id": id,
                "answer": answer,
                "style": style,
                "durationMs": duration_ms,
                "rect": { "x": rect.0, "y": rect.1, "w": rect.2, "h": rect.3 },
                "scale": scale,
                "protect": true,
            }),
        )?;
        let ack = read(&mut self.pipe, PIPE_TIMEOUT)?;
        if ack.get("type").and_then(Value::as_str) != Some("overlay_ack") {
            return Err(format!("rune bridge show rejected: {ack}"));
        }
        if ack.get("affinity").and_then(Value::as_u64) != Some(0x11) {
            return Err("rune bridge overlay is not capture-protected".to_string());
        }
        if ack.get("visible").and_then(Value::as_bool) != Some(true) {
            return Err("rune bridge overlay is not visible".to_string());
        }
        Ok(())
    }

    pub fn hide(&mut self) -> Result<(), String> {
        let id = self.next_id;
        self.next_id = self.next_id.wrapping_add(1);
        send(
            &mut self.pipe,
            json!({"type":"hide_overlay","id":id}),
        )?;
        let ack = read(&mut self.pipe, PIPE_TIMEOUT)?;
        if ack.get("type").and_then(Value::as_str) != Some("overlay_ack") {
            return Err(format!("rune bridge hide rejected: {ack}"));
        }
        Ok(())
    }
}

impl Drop for RuneBridge {
    fn drop(&mut self) {
        let _ = self.child.kill();
        if let Some(job) = self.job.take() {
            drop(job);
        }
    }
}
