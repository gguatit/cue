use std::error::Error;
use std::fs::File;
use std::io::Read;
use std::mem::{size_of, size_of_val};
use std::os::windows::io::{AsRawHandle, FromRawHandle};
use std::process::{Child, Command, Stdio};
use std::sync::mpsc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use rune_overlay_poc::bridge::{MAX_FRAME, write_frame};
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

fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(Some(0)).collect()
}

fn send(file: &mut File, value: Value) -> Result<(), String> {
    write_frame(file, &value).map_err(|error| format!("write: {error}"))
}

fn read_frame_timeout(file: &mut File, timeout: Duration) -> Result<Value, String> {
    let handle = HANDLE(file.as_raw_handle());
    let deadline = Instant::now() + timeout;
    let mut available = 0u32;

    loop {
        unsafe { PeekNamedPipe(handle, None, 0, None, Some(&mut available), None) }
            .map_err(|error| format!("peek header: {error}"))?;
        if available >= 4 {
            break;
        }
        if Instant::now() >= deadline {
            return Err("timed out waiting for frame header".to_string());
        }
        std::thread::sleep(Duration::from_millis(20));
    }

    let mut header = [0u8; 4];
    file.read_exact(&mut header)
        .map_err(|error| format!("read header: {error}"))?;
    let length = u32::from_le_bytes(header);
    if length == 0 || length > MAX_FRAME {
        return Err(format!("invalid frame length {length}"));
    }

    loop {
        unsafe { PeekNamedPipe(handle, None, 0, None, Some(&mut available), None) }
            .map_err(|error| format!("peek body: {error}"))?;
        if available >= length {
            break;
        }
        if Instant::now() >= deadline {
            return Err("timed out waiting for frame body".to_string());
        }
        std::thread::sleep(Duration::from_millis(20));
    }

    let mut body = vec![0u8; length as usize];
    file.read_exact(&mut body)
        .map_err(|error| format!("read body: {error}"))?;
    serde_json::from_slice(&body).map_err(|error| format!("json: {error}"))
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
    .map_err(|error| format!("security descriptor: {error}"))?;
    let attributes = SECURITY_ATTRIBUTES {
        nLength: size_of::<SECURITY_ATTRIBUTES>() as u32,
        lpSecurityDescriptor: descriptor.0,
        bInheritHandle: BOOL(0),
    };
    Ok((attributes, descriptor))
}

struct Job(HANDLE);

impl Drop for Job {
    fn drop(&mut self) {
        unsafe {
            let _ = CloseHandle(self.0);
        }
    }
}

fn assign_job(child: &Child) -> Result<Job, String> {
    let job = unsafe { CreateJobObjectW(None, PCWSTR::null()) }
        .map_err(|error| format!("create job: {error}"))?;
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
    .map_err(|error| format!("job limits: {error}"))?;
    unsafe { AssignProcessToJobObject(job, HANDLE(child.as_raw_handle())) }
        .map_err(|error| format!("job assign: {error}"))?;
    Ok(Job(job))
}

fn expect(value: &Value, field: &str, expected: &Value) -> Result<(), String> {
    match value.get(field) {
        Some(actual) if actual == expected => Ok(()),
        Some(actual) => Err(format!("expected {field}={expected}, got {actual}")),
        None => Err(format!("missing {field} in {value}")),
    }
}

fn run(child: &mut Child, file: &mut File) -> Result<(), String> {
    let start = Instant::now();
    send(file, json!({"type":"hello","protocol":1}))?;
    let ready = read_frame_timeout(file, Duration::from_secs(15))?;
    expect(&ready, "type", &json!("ready"))?;
    expect(&ready, "protocol", &json!(1))?;
    println!("ready_ms={}", start.elapsed().as_millis());

    for cycle in 0..20 {
        let show_start = Instant::now();
        send(file, json!({"type":"show_overlay","id":cycle,"answer":"B","style":"badge"}))?;
        let ack = read_frame_timeout(file, Duration::from_secs(5))?;
        expect(&ack, "type", &json!("overlay_ack"))?;
        expect(&ack, "affinity", &json!(17))?;
        expect(&ack, "visible", &json!(true))?;
        if cycle == 0 {
            println!("show_ms={}", show_start.elapsed().as_millis());
        }

        send(file, json!({"type":"ping","id":cycle}))?;
        let pong = read_frame_timeout(file, Duration::from_secs(5))?;
        expect(&pong, "type", &json!("pong"))?;

        send(file, json!({"type":"hide_overlay","id":cycle}))?;
        let ack = read_frame_timeout(file, Duration::from_secs(5))?;
        expect(&ack, "type", &json!("overlay_ack"))?;
        expect(&ack, "affinity", &json!(17))?;
        expect(&ack, "visible", &json!(false))?;
    }
    println!("cycles=20 elapsed_ms={}", start.elapsed().as_millis());

    send(file, json!({"type":"shutdown"}))?;
    let exit_start = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) if exit_start.elapsed() < Duration::from_secs(5) => {
                std::thread::sleep(Duration::from_millis(50));
            }
            Ok(None) => return Err("sidecar did not exit".to_string()),
            Err(error) => return Err(format!("wait: {error}")),
        }
    }
    Ok(())
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
        return Err("CreateNamedPipeW failed".into());
    }

    let mut child = Command::new(&exe)
        .arg("--pipe")
        .arg(&name)
        .stdout(Stdio::null())
        .stderr(Stdio::inherit())
        .spawn()?;
    let _job = match assign_job(&child) {
        Ok(job) => Some(job),
        Err(error) => {
            eprintln!("bridge-host: job object warning: {error}");
            None
        }
    };

    let raw_handle = handle.0 as isize;
    let (connected_tx, connected_rx) = mpsc::channel();
    std::thread::spawn(move || {
        let result = unsafe { ConnectNamedPipe(HANDLE(raw_handle as _), None) }
            .map_err(|error| error.code().0 as u32);
        let _ = connected_tx.send(result);
    });
    match connected_rx.recv_timeout(Duration::from_secs(10)) {
        Ok(Ok(())) => {}
        Ok(Err(code)) if code == ERROR_PIPE_CONNECTED.0 => {}
        Ok(Err(code)) => {
            let _ = child.kill();
            return Err(format!("ConnectNamedPipe failed: {code}").into());
        }
        Err(_) => {
            let _ = child.kill();
            return Err("ConnectNamedPipe timed out".into());
        }
    }

    let mut file = unsafe { File::from_raw_handle(handle.0) };
    let result = run(&mut child, &mut file);
    if result.is_err() {
        let _ = child.kill();
    }
    result.map_err(|error| error.into())
}
