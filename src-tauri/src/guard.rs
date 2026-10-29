use std::path::{Path, PathBuf};
use std::process::Command;
use std::thread;
use std::time::{Duration, Instant};

use crate::elevation;

windows_service::define_windows_service!(ffi_service_main, service_main);

pub const CHECK_INTERVAL: Duration = Duration::from_secs(2);
const TASK_REFRESH: Duration = Duration::from_secs(60);

pub fn marker_path() -> Option<PathBuf> {
    std::env::var_os("LOCALAPPDATA").map(|base| marker_path_in(Path::new(&base)))
}

pub fn quit_flag_path() -> Option<PathBuf> {
    elevation::program_dir().map(|d| d.join("quit.flag"))
}

pub fn local_quit_flag_path() -> Option<PathBuf> {
    std::env::var_os("LOCALAPPDATA").map(|base| Path::new(&base).join("Cue").join("quit.flag"))
}

const QUIT_WINDOW_SECS: u64 = 5;

fn write_quit_flag(path: Option<PathBuf>) {
    let Some(path) = path else { return };
    if let Some(dir) = path.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let _ = std::fs::write(path, now.to_string());
}

fn read_quit_flag(path: Option<PathBuf>) -> bool {
    let Some(path) = path else { return false };
    let Ok(text) = std::fs::read_to_string(path) else {
        return false;
    };
    let Ok(stamp) = text.trim().parse::<u64>() else {
        return false;
    };
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    now.saturating_sub(stamp) <= QUIT_WINDOW_SECS
}

/// Normal Quit records a short-lived flag so a watchdog tick that already read
/// the markers cannot relaunch the app after the user quit it. The user guard
/// reads the per-user copy because ProgramData is no longer user-writable.
pub fn set_quit_flag() {
    write_quit_flag(local_quit_flag_path());
    write_quit_flag(quit_flag_path());
}

pub fn quit_flag_active() -> bool {
    read_quit_flag(local_quit_flag_path()) || read_quit_flag(quit_flag_path())
}

fn clear_quit_flag() {
    if let Some(path) = local_quit_flag_path() {
        let _ = std::fs::remove_file(path);
    }
    if let Some(path) = quit_flag_path() {
        let _ = std::fs::remove_file(path);
    }
}

pub fn marker_path_in(local_app_data: &Path) -> PathBuf {
    local_app_data.join("Cue").join("run.marker")
}

pub fn marker_exists() -> bool {
    marker_path().map(|p| p.exists()).unwrap_or(false)
}

pub fn armed() -> bool {
    marker_exists() || elevation::program_marker_exists()
}

/// The SYSTEM service runs in session 0, where `LOCALAPPDATA` belongs to the
/// service account, so it must trust only the shared ProgramData marker.
pub fn service_armed() -> bool {
    elevation::program_marker_exists()
}

pub fn create_marker() -> Result<(), String> {
    let path = marker_path().ok_or("guard")?;
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|_| "guard")?;
    }
    std::fs::write(path, b"").map_err(|_| "guard".to_string())
}

pub fn remove_marker() -> Result<(), String> {
    let Some(path) = marker_path() else {
        return Ok(());
    };
    match std::fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(_) => Err("guard".into()),
    }
}

/// Normal Quit clears both markers and records the quit flag so the guard and
/// the SYSTEM watcher stop.
pub fn disarm() {
    set_quit_flag();
    let _ = remove_marker();
    let _ = elevation::remove_program_marker();
    let _ = elevation::delete_guard_tasks();
}

pub fn enable(app: &Path) -> Result<(), String> {
    create_marker()?;
    if elevation::service_running() {
        return Ok(());
    }
    if !elevation::service_installed() {
        elevation::delete_tasks()?;
    }
    let guard = spawn_user_guard(app)?;
    let _ = elevation::install_user_tasks(app, &guard);
    Ok(())
}

fn spawn_user_guard(app: &Path) -> Result<PathBuf, String> {
    if elevation::is_elevated() {
        return Err("guard".into());
    }
    let guard = elevation::ensure_user_guard_copy()?;
    Command::new(&guard)
        .arg("--guard")
        .arg("--app")
        .arg(app)
        .spawn()
        .map_err(|_| "guard".to_string())?;
    Ok(guard)
}

/// Turning the guard off keeps the elevated autostart task and the shared
/// marker that the administrator-mode service depends on.
pub fn disable() -> Result<(), String> {
    let _ = remove_marker();
    let _ = elevation::delete_guard_tasks();
    Ok(())
}

pub fn spawn_guard(app: &Path) -> Result<PathBuf, String> {
    if elevation::is_elevated() {
        return Err("guard".into());
    }
    let guard = elevation::ensure_user_guard_copy()?;
    Command::new(&guard)
        .arg("--guard")
        .arg("--app")
        .arg(app)
        .spawn()
        .map_err(|_| "guard".to_string())?;
    Ok(guard)
}

pub fn app_path() -> Option<PathBuf> {
    elevation::read_service_app()
}

/// Long-lived user guard. A second guard exits so two guards can never
/// mistake each other for the app and stop recovery.
pub fn run_guard(app: Option<PathBuf>) {
    if elevation::service_running() {
        return;
    }
    let Some(_mutex) = acquire_mutex(false) else {
        return;
    };
    let app = app.or_else(app_path);
    let Some(app) = app else {
        return;
    };
    let mut last_refresh = Instant::now();
    loop {
        // Administrator mode is handled by the service and the protected copy;
        // a leftover per-user guard must not keep relaunching the normal app.
        if elevation::program_marker_exists() || !armed() {
            return;
        }
        if !quit_flag_active() && !process_running(&app) {
            let _ = Command::new(&app).arg("--background").spawn();
        }
        if last_refresh.elapsed() >= TASK_REFRESH {
            if let Ok(guard) = elevation::ensure_user_guard_copy() {
                let _ = elevation::install_user_tasks(&app, &guard);
            }
            last_refresh = Instant::now();
        }
        thread::sleep(CHECK_INTERVAL);
    }
}

/// Long-lived SYSTEM service. SCM restarts this process within 5 s if an
/// administrator kills it; it idles while the shared marker is absent.
pub fn run_service() -> Result<(), String> {
    windows_service::service_dispatcher::start(elevation::SERVICE_NAME, ffi_service_main)
        .map_err(|_| "guard".to_string())
}

fn service_main(_args: Vec<std::ffi::OsString>) {
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Arc;
    use windows_service::service::{
        ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus,
        ServiceType,
    };
    use windows_service::service_control_handler::{self, ServiceControlHandlerResult};

    let stop = Arc::new(AtomicBool::new(false));
    let handler_stop = Arc::clone(&stop);
    let Ok(handler) = service_control_handler::register(
        elevation::SERVICE_NAME,
        move |control| match control {
            ServiceControl::Stop | ServiceControl::Shutdown => {
                handler_stop.store(true, Ordering::SeqCst);
                ServiceControlHandlerResult::NoError
            }
            ServiceControl::Interrogate => ServiceControlHandlerResult::NoError,
            _ => ServiceControlHandlerResult::NotImplemented,
        },
    ) else {
        return;
    };
    let running = ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: ServiceState::Running,
        controls_accepted: ServiceControlAccept::STOP | ServiceControlAccept::SHUTDOWN,
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: Duration::default(),
        process_id: None,
    };
    let _ = handler.set_service_status(running);
    service_loop(&stop);
    let _ = handler.set_service_status(ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: ServiceState::Stopped,
        controls_accepted: ServiceControlAccept::empty(),
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: Duration::default(),
        process_id: None,
    });
}

fn service_loop(stop: &std::sync::atomic::AtomicBool) {
    use std::sync::atomic::Ordering;

    let app = app_path();
    let mut last_refresh = Instant::now();
    while !stop.load(Ordering::SeqCst) {
        if service_armed() {
            if let Some(app) = app.as_deref() {
                if last_refresh.elapsed() >= TASK_REFRESH {
                    let _ = elevation::install_elevated_task(app);
                    last_refresh = Instant::now();
                }
                if !quit_flag_active() && !process_running(app) {
                    let _ = elevation::schtasks_ok(&["/Run", "/TN", elevation::ELEVATED_TASK]);
                }
            }
        }
        thread::sleep(CHECK_INTERVAL);
    }
}

/// Called by `--admin-teardown`: stop the service, remove every task/marker.
pub fn teardown() -> Result<(), String> {
    elevation::stop_service();
    elevation::delete_service()?;
    elevation::delete_tasks()?;
    clear_quit_flag();
    remove_marker()?;
    elevation::remove_program_marker()?;
    elevation::clear_admin_prepare_failed();
    elevation::clear_service_config();
    elevation::clear_legacy_config();
    Ok(())
}

fn should_revive(armed: bool, quit: bool, running: bool, service: bool) -> bool {
    armed && !quit && !running && !service
}

/// Runs once from the SYSTEM task: revive the elevated app if it is gone.
pub fn run_system(app: Option<PathBuf>) {
    let armed = service_armed();
    let quit = quit_flag_active();
    let service = elevation::service_installed();
    let Some(app) = app.or_else(app_path) else {
        return;
    };
    if should_revive(armed, quit, process_running(&app), service) {
        let _ = elevation::schtasks_ok(&["/Run", "/TN", elevation::ELEVATED_TASK]);
    }
}

pub fn guard_running() -> bool {
    process_named("cue-guard.exe")
}

pub fn process_running(path: &Path) -> bool {
    let Some(name) = path.file_name().and_then(|name| name.to_str()) else {
        return false;
    };
    let Some(target) = canonical(path) else {
        return false;
    };
    process_paths_named(Some(name))
        .into_iter()
        .any(|path| canonical(&path).as_deref() == Some(target.as_path()))
}

fn canonical(path: &Path) -> Option<PathBuf> {
    std::fs::canonicalize(path).ok().or_else(|| Some(path.to_path_buf()))
}

fn same_exe_name(left: &str, right: &str) -> bool {
    left.eq_ignore_ascii_case(right)
}

fn process_named(name: &str) -> bool {
    !process_paths_named(Some(name)).is_empty()
}

fn process_paths_named(name: Option<&str>) -> Vec<PathBuf> {
    use ::windows::Win32::Foundation::CloseHandle;
    use ::windows::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
        TH32CS_SNAPPROCESS,
    };
    use ::windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use ::windows::core::PWSTR;

    let mut out = Vec::new();
    unsafe {
        let Ok(snapshot) = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) else {
            return out;
        };
        let mut entry = PROCESSENTRY32W::default();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;
        if Process32FirstW(snapshot, &mut entry).is_ok() {
            loop {
                let len = entry
                    .szExeFile
                    .iter()
                    .position(|&c| c == 0)
                    .unwrap_or(entry.szExeFile.len());
                let exe = String::from_utf16_lossy(&entry.szExeFile[..len]);
                if name.is_none_or(|target| same_exe_name(&exe, target)) {
                    let handle = OpenProcess(
                        PROCESS_QUERY_LIMITED_INFORMATION,
                        false,
                        entry.th32ProcessID,
                    );
                    if let Ok(handle) = handle {
                        let mut buf = [0u16; 1024];
                        let mut length = buf.len() as u32;
                        if QueryFullProcessImageNameW(
                            handle,
                            Default::default(),
                            PWSTR(buf.as_mut_ptr()),
                            &mut length,
                        )
                        .is_ok()
                        {
                            out.push(PathBuf::from(String::from_utf16_lossy(
                                &buf[..length as usize],
                            )));
                        }
                        let _ = CloseHandle(handle);
                    }
                }
                if Process32NextW(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }
        let _ = CloseHandle(snapshot);
    }
    out
}

struct MutexHandle(::windows::Win32::Foundation::HANDLE);

impl Drop for MutexHandle {
    fn drop(&mut self) {
        unsafe {
            let _ = ::windows::Win32::Foundation::CloseHandle(self.0);
        }
    }
}

fn acquire_mutex(global_only: bool) -> Option<MutexHandle> {
    use ::windows::Win32::Foundation::{GetLastError, ERROR_ALREADY_EXISTS};
    use ::windows::Win32::System::Threading::CreateMutexW;
    unsafe {
        let names: &[::windows::core::PCWSTR] = if global_only {
            &[::windows::core::w!("Global\\CueGuard")]
        } else {
            &[
                ::windows::core::w!("Global\\CueGuard"),
                ::windows::core::w!("Local\\CueGuard"),
            ]
        };
        for name in names {
            if let Ok(handle) = CreateMutexW(None, false, *name) {
                if GetLastError() == ERROR_ALREADY_EXISTS {
                    let _ = ::windows::Win32::Foundation::CloseHandle(handle);
                    return None;
                }
                return Some(MutexHandle(handle));
            }
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn marker_path_uses_local_app_data() {
        assert_eq!(
            marker_path_in(Path::new(r"C:\Users\tester\AppData\Local")),
            PathBuf::from(r"C:\Users\tester\AppData\Local\Cue\run.marker")
        );
    }

    #[test]
    fn missing_path_is_not_running() {
        assert!(!process_running(Path::new(r"C:\definitely\missing\cue.exe")));
    }

    #[test]
    fn system_task_only_revives_when_armed_and_not_quit() {
        assert!(should_revive(true, false, false, false));
        assert!(!should_revive(false, false, false, false));
        assert!(!should_revive(true, true, false, false));
        assert!(!should_revive(true, false, true, false));
        // 서비스가 있으면 SYSTEM 작업은 중복이며, 사용자 쓰기 가능한 exe를
        // SYSTEM으로 실행할 수 있으므로 절대 깨우지 않는다.
        assert!(!should_revive(true, false, false, true));
    }

    #[test]
    fn executable_names_compare_case_insensitively() {
        assert!(same_exe_name("CUE.EXE", "cue.exe"));
        assert!(!same_exe_name("cue.exe", "cue-guard.exe"));
    }
}
