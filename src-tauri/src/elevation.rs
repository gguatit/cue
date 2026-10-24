use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;

use winreg::enums::{HKEY_LOCAL_MACHINE, KEY_READ, KEY_WRITE};
use winreg::RegKey;

pub const ELEVATED_TASK: &str = "Cue Elevated";
pub const GUARD_TASK: &str = "Cue Guard";
pub const BOOT_TASK: &str = "Cue Guard Boot";
pub const SYSTEM_TASK: &str = "Cue Guard System";
pub const TASKS: [&str; 4] = [ELEVATED_TASK, GUARD_TASK, BOOT_TASK, SYSTEM_TASK];
pub const SERVICE_NAME: &str = "CueWatchdog";

const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub const CONFIG_KEY: &str = r"Software\Cue";
const CONFIG_APP: &str = "App";
const CONFIG_USER: &str = "User";

pub fn program_dir() -> Option<PathBuf> {
    use ::windows::Win32::UI::Shell::CSIDL_COMMON_APPDATA;
    known_folder(CSIDL_COMMON_APPDATA).map(|base| program_dir_in(&base))
}

pub fn program_dir_in(program_data: &Path) -> PathBuf {
    program_data.join("Cue")
}

pub fn guard_exe() -> Option<PathBuf> {
    program_dir().map(|d| d.join("cue-guard.exe"))
}

#[cfg(test)]
pub fn admin_app_exe_in(program_data: &Path) -> PathBuf {
    program_dir_in(program_data).join("cue.exe")
}

pub fn admin_app_exe() -> Option<PathBuf> {
    program_dir().map(|d| d.join("cue.exe"))
}

fn same_path(a: &Path, b: &Path) -> bool {
    a.to_string_lossy().eq_ignore_ascii_case(&b.to_string_lossy())
}

pub fn is_admin_app(path: &Path) -> bool {
    admin_app_exe().is_some_and(|admin| same_path(&admin, path))
}

pub fn user_guard_exe() -> Option<PathBuf> {
    std::env::var_os("LOCALAPPDATA").map(|base| Path::new(&base).join("Cue").join("cue-guard.exe"))
}

#[cfg(test)]
fn system32_in(windows_dir: &Path, name: &str) -> PathBuf {
    windows_dir.join("System32").join(name)
}

fn is_under(path: &Path, root: &Path) -> bool {
    let p = path.to_string_lossy().to_ascii_lowercase();
    let r = root.to_string_lossy().to_ascii_lowercase();
    p == r || p.starts_with(&(r + "\\"))
}

fn is_reparse(path: &Path) -> bool {
    use std::os::windows::fs::MetadataExt;
    std::fs::symlink_metadata(path)
        .map(|m| m.file_attributes() & 0x400 != 0)
        .unwrap_or(false)
}

fn contains_reparse(dir: &Path) -> bool {
    use std::os::windows::fs::MetadataExt;
    let Ok(entries) = std::fs::read_dir(dir) else {
        return false;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(meta) = std::fs::symlink_metadata(&path) else {
            continue;
        };
        if meta.file_attributes() & 0x400 != 0 {
            return true;
        }
        if meta.is_dir() && contains_reparse(&path) {
            return true;
        }
    }
    false
}

fn known_folder(csidl: u32) -> Option<PathBuf> {
    use ::windows::Win32::UI::Shell::SHGetFolderPathW;
    let mut buf = [0u16; 260];
    unsafe {
        SHGetFolderPathW(None, csidl as i32, None, 0, &mut buf).ok()?;
    }
    let len = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
    Some(PathBuf::from(String::from_utf16_lossy(&buf[..len])))
}

/// 서비스가 실행할 exe는 관리자만 쓸 수 있는 위치여야 한다. 사용자 쓰기
/// 가능한 exe를 HIGHEST/SYSTEM 작업이 실행하면 권한 상승 경로가 된다.
pub fn app_path_is_protected(path: &Path) -> bool {
    use ::windows::Win32::UI::Shell::{CSIDL_PROGRAM_FILES, CSIDL_PROGRAM_FILESX86};
    [CSIDL_PROGRAM_FILES, CSIDL_PROGRAM_FILESX86]
        .iter()
        .filter_map(|csidl| known_folder(*csidl))
        .any(|root| is_under(path, &root))
}

/// An app path is safe for the elevated task when it is either installed under
/// Program Files or is the installer-created copy in the hardened ProgramData
/// folder.
pub fn is_admin_path(path: &Path) -> bool {
    app_path_is_protected(path) || is_admin_app(path)
}

fn pick_admin_app(current: &Path, admin: Option<&Path>) -> Result<PathBuf, String> {
    if is_admin_path(current) {
        return Ok(current.to_path_buf());
    }
    admin
        .map(Path::to_path_buf)
        .ok_or_else(|| "admin_copy".to_string())
}

/// A normal install can live in a user-writable folder. In that case admin
/// mode runs the copy the installer placed in ProgramData, never the normal
/// install path. The elevated task and the SYSTEM service both use protected
/// binaries.
pub fn admin_app_for(current: &Path) -> Result<PathBuf, String> {
    let chosen = pick_admin_app(current, admin_app_exe().as_deref())?;
    if chosen == current {
        return Ok(chosen);
    }
    if is_elevated() || !chosen.is_file() || is_reparse(&chosen) || !program_dir_locked() {
        return Err("admin_copy".into());
    }
    Ok(chosen)
}

/// The installer hardens ProgramData\Cue. If that failed (or was undone), a
/// non-elevated user can write there, so refuse to trust the copy.
fn program_dir_locked() -> bool {
    program_dir().map(|dir| dir_is_locked(&dir)).unwrap_or(false)
}

fn dir_is_locked(dir: &Path) -> bool {
    for attempt in 0..8 {
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let probe = dir.join(format!(
            ".cue-write-{}-{stamp}-{attempt}",
            std::process::id()
        ));
        match std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&probe)
        {
            Ok(_) => {
                let _ = std::fs::remove_file(&probe);
                return false;
            }
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(e) if e.kind() == std::io::ErrorKind::PermissionDenied => return true,
            // Unknown errors are not proof of a locked folder. Stay closed so
            // administrator mode is rejected rather than trusted.
            Err(_) => return false,
        }
    }
    false
}

fn system_directory() -> Option<PathBuf> {
    use ::windows::Win32::System::SystemInformation::GetSystemDirectoryW;
    let mut buf = [0u16; 260];
    let len = unsafe { GetSystemDirectoryW(Some(&mut buf)) } as usize;
    if len == 0 || len >= buf.len() {
        return None;
    }
    Some(PathBuf::from(String::from_utf16_lossy(&buf[..len])))
}

fn windows_directory() -> Option<PathBuf> {
    use ::windows::Win32::System::SystemInformation::GetWindowsDirectoryW;
    let mut buf = [0u16; 260];
    let len = unsafe { GetWindowsDirectoryW(Some(&mut buf)) } as usize;
    if len == 0 || len >= buf.len() {
        return None;
    }
    Some(PathBuf::from(String::from_utf16_lossy(&buf[..len])))
}

pub(crate) fn system32(name: &str) -> PathBuf {
    system_directory()
        .unwrap_or_else(|| PathBuf::from(r"C:\Windows\System32"))
        .join(name)
}

pub(crate) fn windows_dir(name: &str) -> PathBuf {
    windows_directory()
        .unwrap_or_else(|| PathBuf::from(r"C:\Windows"))
        .join(name)
}

pub fn write_service_config(app: &Path, user: &str) -> Result<(), String> {
    if user.trim().is_empty() || !is_admin_path(app) {
        return Err("guard".into());
    }
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let (key, _) = hklm
        .create_subkey_with_flags(CONFIG_KEY, KEY_READ | KEY_WRITE)
        .map_err(|_| "guard".to_string())?;
    key.set_value(CONFIG_APP, &app.to_string_lossy().to_string())
        .map_err(|_| "guard".to_string())?;
    key.set_value(CONFIG_USER, &user.to_string())
        .map_err(|_| "guard".to_string())?;
    Ok(())
}

pub fn read_service_app() -> Option<PathBuf> {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let key = hklm.open_subkey_with_flags(CONFIG_KEY, KEY_READ).ok()?;
    let app: String = key.get_value(CONFIG_APP).ok()?;
    let path = PathBuf::from(app.trim());
    (path.is_absolute() && path.exists() && is_admin_path(&path)).then_some(path)
}

pub fn read_service_user() -> Option<String> {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let key = hklm.open_subkey_with_flags(CONFIG_KEY, KEY_READ).ok()?;
    let user: String = key.get_value(CONFIG_USER).ok()?;
    let user = user.trim().to_string();
    (!user.is_empty()).then_some(user)
}

pub fn clear_service_config() {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let _ = hklm.delete_subkey_all(CONFIG_KEY);
}

pub fn clear_legacy_config() {
    let Some(dir) = program_dir() else { return };
    let _ = std::fs::remove_file(dir.join("app.txt"));
    let _ = std::fs::remove_file(dir.join("user.txt"));
}

pub fn current_user() -> String {
    let domain = std::env::var("USERDOMAIN").unwrap_or_default();
    let name = std::env::var("USERNAME").unwrap_or_default();
    if domain.is_empty() {
        name
    } else {
        format!("{domain}\\{name}")
    }
}

pub fn program_marker() -> Option<PathBuf> {
    program_dir().map(|d| d.join("guard.enabled"))
}

pub fn program_marker_exists() -> bool {
    program_marker().map(|p| p.exists()).unwrap_or(false)
}

pub fn create_program_marker() -> Result<(), String> {
    let path = program_marker().ok_or("guard")?;
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|_| "guard")?;
    }
    std::fs::write(path, b"").map_err(|_| "guard".to_string())
}

pub fn remove_program_marker() -> Result<(), String> {
    let Some(path) = program_marker() else {
        return Ok(());
    };
    match std::fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(_) => Err("guard".into()),
    }
}

fn icacls(args: &[&std::ffi::OsStr]) -> bool {
    Command::new(system32("icacls.exe"))
        .args(args)
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// ProgramData\Cue를 SYSTEM/Administrators 전용으로 만든다. 기존에 사용자가
/// 만든 폴더·파일도 소유자와 DACL을 함께 바로잡는다.
pub fn harden_program_dir() -> Result<(), String> {
    let dir = program_dir().ok_or("guard")?;
    std::fs::create_dir_all(&dir).map_err(|_| "guard".to_string())?;
    if is_reparse(&dir) || contains_reparse(&dir) {
        return Err("guard".into());
    }
    let dir_os = dir.as_os_str();

    if !icacls(&[
        dir_os,
        std::ffi::OsStr::new("/setowner"),
        std::ffi::OsStr::new("*S-1-5-32-544"),
        std::ffi::OsStr::new("/T"),
        std::ffi::OsStr::new("/Q"),
    ]) {
        return Err("guard".into());
    }
    // Explicit ACEs from a user-created folder survive `/grant:r`; reset the
    // DACL first so only the privileged grants below remain.
    if !icacls(&[dir_os, std::ffi::OsStr::new("/reset"), std::ffi::OsStr::new("/Q")]) {
        return Err("guard".into());
    }
    if !icacls(&[
        dir_os,
        std::ffi::OsStr::new("/inheritance:r"),
        std::ffi::OsStr::new("/grant:r"),
        std::ffi::OsStr::new("*S-1-5-18:(OI)(CI)F"),
        std::ffi::OsStr::new("*S-1-5-32-544:(OI)(CI)F"),
        std::ffi::OsStr::new("*S-1-5-32-545:(OI)(CI)RX"),
    ]) {
        return Err("guard".into());
    }

    let has_children = std::fs::read_dir(&dir)
        .map(|mut entries| entries.next().is_some())
        .unwrap_or(false);
    if has_children {
        let children = std::ffi::OsString::from(format!("{}\\*", dir.display()));
        if !icacls(&[
            children.as_os_str(),
            std::ffi::OsStr::new("/reset"),
            std::ffi::OsStr::new("/T"),
            std::ffi::OsStr::new("/Q"),
        ]) {
            return Err("guard".into());
        }
        if !icacls(&[
            children.as_os_str(),
            std::ffi::OsStr::new("/inheritance:r"),
            std::ffi::OsStr::new("/grant:r"),
            std::ffi::OsStr::new("*S-1-5-18:F"),
            std::ffi::OsStr::new("*S-1-5-32-544:F"),
            std::ffi::OsStr::new("*S-1-5-32-545:RX"),
            std::ffi::OsStr::new("/T"),
            std::ffi::OsStr::new("/Q"),
        ]) {
            return Err("guard".into());
        }
    }
    Ok(())
}

pub fn copy_guard(source: &Path, target: &Path, allow_reuse: bool) -> Result<(), String> {
    if source == target {
        return Ok(());
    }
    if is_reparse(target) {
        return Err("guard".into());
    }
    // Copy to a fresh file and rename it into place. Overwriting the target
    // would follow a user-planted hard link and would keep its old ACL.
    let mut temp_name = target
        .file_name()
        .ok_or_else(|| "guard".to_string())?
        .to_os_string();
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    temp_name.push(format!(".tmp-{}-{stamp}", std::process::id()));
    let temp = target.with_file_name(temp_name);
    let _ = std::fs::remove_file(&temp);
    if std::fs::copy(source, &temp).is_err() {
        let _ = std::fs::remove_file(&temp);
        return if allow_reuse && target.is_file() {
            Ok(())
        } else {
            Err("guard".into())
        };
    }
    if target.exists() && std::fs::remove_file(target).is_err() {
        let _ = std::fs::remove_file(&temp);
        return if allow_reuse && target.is_file() {
            Ok(())
        } else {
            Err("guard".into())
        };
    }
    if std::fs::rename(&temp, target).is_err() {
        let _ = std::fs::remove_file(&temp);
        return Err("guard".into());
    }
    Ok(())
}

/// Copy the running executable to ProgramData so `taskkill /IM cue.exe` cannot
/// kill the guard together with the app.
pub fn ensure_guard_copy() -> Result<PathBuf, String> {
    harden_program_dir()?;
    let target = guard_exe().ok_or("guard")?;
    let source = std::env::current_exe().map_err(|_| "guard".to_string())?;
    copy_guard(&source, &target, false)?;
    Ok(target)
}

/// Create the protected copy the elevated task and service run. The installer
/// calls this elevated, so the copy never comes from a user-writable path at
/// admin-enable time.
pub fn prepare_admin_copy() -> Result<(), String> {
    if !is_elevated() {
        return Err("admin".into());
    }
    let source = std::env::current_exe().map_err(|_| "guard".to_string())?;
    if is_admin_path(&source) {
        restore_admin_runtime(&source)?;
        return Ok(());
    }
    harden_program_dir()?;
    let target = admin_app_exe().ok_or("guard")?;
    if service_installed() {
        stop_service();
    }
    copy_guard(&source, &target, false)?;
    restore_admin_runtime(&target)?;
    Ok(())
}

fn resolve_admin_user(stored: Option<String>, current: &str) -> Option<String> {
    stored
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .or_else(|| {
            let current = current.trim();
            (!current.is_empty()).then(|| current.to_string())
        })
}

fn restore_admin_runtime(app: &Path) -> Result<(), String> {
    let user = resolve_admin_user(read_service_user(), &current_user());
    if let Some(user) = user.as_deref() {
        write_service_config(app, user)?;
    }
    let admin_on = program_marker_exists() || service_installed();
    if admin_on && user.is_none() {
        return Err("admin".into());
    }
    if program_marker_exists() {
        install_elevated_task(app)?;
    }
    if admin_on {
        if service_installed() {
            stop_service();
        }
        ensure_guard_copy()?;
        install_service()?;
    }
    Ok(())
}

pub fn ensure_user_guard_copy() -> Result<PathBuf, String> {
    let target = user_guard_exe().ok_or("guard")?;
    if let Some(dir) = target.parent() {
        std::fs::create_dir_all(dir).map_err(|_| "guard")?;
    }
    let source = std::env::current_exe().map_err(|_| "guard".to_string())?;
    copy_guard(&source, &target, true)?;
    Ok(target)
}

pub fn is_elevated() -> bool {
    use ::windows::Win32::Foundation::CloseHandle;
    use ::windows::Win32::Security::{
        GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY,
    };
    use ::windows::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};
    unsafe {
        let mut token = ::windows::Win32::Foundation::HANDLE::default();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token).is_err() {
            return false;
        }
        let mut info = TOKEN_ELEVATION::default();
        let mut size = 0u32;
        let ok = GetTokenInformation(
            token,
            TokenElevation,
            Some(&mut info as *mut _ as *mut _),
            std::mem::size_of::<TOKEN_ELEVATION>() as u32,
            &mut size,
        )
        .is_ok();
        let _ = CloseHandle(token);
        ok && info.TokenIsElevated != 0
    }
}

pub fn relaunch_elevated_exe(exe: &Path, extra_arg: &str) -> Result<(), String> {
    use ::windows::Win32::UI::Shell::ShellExecuteW;
    use ::windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;
    use ::windows::core::{HSTRING, PCWSTR};
    let op = HSTRING::from("runas");
    let file = HSTRING::from(exe.to_string_lossy().as_ref());
    let params = HSTRING::from(format!("--background --elevated {extra_arg}"));
    let r = unsafe {
        ShellExecuteW(
            None,
            PCWSTR(op.as_ptr()),
            PCWSTR(file.as_ptr()),
            PCWSTR(params.as_ptr()),
            PCWSTR::null(),
            SW_SHOWNORMAL,
        )
    };
    if (r.0 as isize) <= 32 {
        Err("admin".into())
    } else {
        Ok(())
    }
}

const DEFENDER_PROCESSES: [&str; 2] = ["cue.exe", "cue-guard.exe"];

fn powershell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

fn defender_script(paths: &[PathBuf], processes: &[&str]) -> String {
    let mut script = String::from("$ErrorActionPreference='Stop';try{");
    for path in paths {
        script.push_str(&format!(
            "Add-MpPreference -ExclusionPath {} -ErrorAction Stop;",
            powershell_quote(&path.to_string_lossy())
        ));
    }
    for process in processes {
        script.push_str(&format!(
            "Add-MpPreference -ExclusionProcess {} -ErrorAction Stop;",
            powershell_quote(process)
        ));
    }
    script.push_str("exit 0}catch{exit 1}");
    script
}

/// Ask Defender to exclude the app folder and guard copy. Returns false when
/// the user cancels the UAC prompt.
pub fn add_defender_exclusion() -> Result<bool, String> {
    use ::windows::Win32::Foundation::{CloseHandle, WAIT_OBJECT_0};
    use ::windows::Win32::System::Threading::{GetExitCodeProcess, WaitForSingleObject};
    use ::windows::Win32::UI::Shell::{
        ShellExecuteExW, SEE_MASK_NOCLOSEPROCESS, SHELLEXECUTEINFOW,
    };
    use ::windows::Win32::UI::WindowsAndMessaging::SW_HIDE;
    use ::windows::core::{HSTRING, PCWSTR};
    use base64::Engine;

    let app_dir = std::env::current_exe()
        .map_err(|_| "defender".to_string())?
        .parent()
        .ok_or_else(|| "defender".to_string())?
        .to_path_buf();
    let mut paths = vec![app_dir];
    if let Some(dir) = program_dir() {
        paths.push(dir);
    }
    let script = defender_script(&paths, &DEFENDER_PROCESSES);
    let encoded = base64::engine::general_purpose::STANDARD.encode(
        script
            .encode_utf16()
            .flat_map(|unit| unit.to_le_bytes())
            .collect::<Vec<_>>(),
    );
    let powershell = system32(r"WindowsPowerShell\v1.0\powershell.exe");
    let file = HSTRING::from(powershell.to_string_lossy().as_ref());
    let params = HSTRING::from(format!(
        "-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -EncodedCommand {encoded}"
    ));
    let verb = HSTRING::from("runas");
    let mut info = SHELLEXECUTEINFOW {
        cbSize: std::mem::size_of::<SHELLEXECUTEINFOW>() as u32,
        fMask: SEE_MASK_NOCLOSEPROCESS,
        lpVerb: PCWSTR(verb.as_ptr()),
        lpFile: PCWSTR(file.as_ptr()),
        lpParameters: PCWSTR(params.as_ptr()),
        nShow: SW_HIDE.0,
        ..Default::default()
    };
    if let Err(error) = unsafe { ShellExecuteExW(&mut info) } {
        return if error.code().0 as u32 == 0x8007_04C7 {
            Ok(false)
        } else {
            Err("defender".into())
        };
    }
    if info.hProcess.is_invalid() {
        return Err("defender".into());
    }
    let wait = unsafe { WaitForSingleObject(info.hProcess, 60_000) };
    let mut code = 1u32;
    if wait == WAIT_OBJECT_0 {
        let _ = unsafe { GetExitCodeProcess(info.hProcess, &mut code) };
    }
    let _ = unsafe { CloseHandle(info.hProcess) };
    if wait != WAIT_OBJECT_0 {
        return Err("defender".into());
    }
    if code == 0 {
        Ok(true)
    } else {
        Err("defender".into())
    }
}

/// Remove the per-user Run entry so only the elevated task starts Cue when
/// administrator mode is on.
pub fn remove_run_key() {
    let _ = Command::new(system32("reg.exe"))
        .args([
            "delete",
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
            "/v",
            "cue",
            "/f",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
}

pub fn schtasks_ok(args: &[&str]) -> bool {
    Command::new(system32("schtasks.exe"))
        .args(args)
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

pub fn task_exists(name: &str) -> bool {
    schtasks_ok(&["/Query", "/TN", name])
}

pub fn delete_tasks() -> Result<(), String> {
    let mut failed = false;
    for name in TASKS {
        if !schtasks_ok(&["/Delete", "/TN", name, "/F"]) && task_exists(name) {
            failed = true;
        }
    }
    if failed {
        Err("admin".into())
    } else {
        Ok(())
    }
}

pub fn install_tasks(app: &Path, guard: &Path) -> Result<(), String> {
    if !is_elevated()
        || !is_admin_path(app)
        || guard_exe().as_deref() != Some(guard)
    {
        return Err("guard".into());
    }
    harden_program_dir()?;
    let app_action = format!("\"{}\" --background --elevated", app.display());
    let guard_action = format!("\"{}\" --guard --app \"{}\"", guard.display(), app.display());
    let system_action = format!("\"{}\" --system --app \"{}\"", guard.display(), app.display());

    let mut ok = true;
    ok &= schtasks_ok(&[
        "/Create", "/SC", "ONLOGON", "/TN", ELEVATED_TASK, "/TR", &app_action, "/RL", "HIGHEST",
        "/IT", "/F",
    ]);
    ok &= schtasks_ok(&[
        "/Create", "/SC", "MINUTE", "/MO", "1", "/TN", GUARD_TASK, "/TR", &guard_action, "/RL",
        "HIGHEST", "/IT", "/F",
    ]);
    ok &= schtasks_ok(&[
        "/Create", "/SC", "ONLOGON", "/TN", BOOT_TASK, "/TR", &guard_action, "/RL", "HIGHEST",
        "/IT", "/F",
    ]);
    ok &= schtasks_ok(&[
        "/Create", "/SC", "MINUTE", "/MO", "1", "/TN", SYSTEM_TASK, "/TR", &system_action, "/RU",
        "SYSTEM", "/RL", "HIGHEST", "/F",
    ]);

    if ok {
        Ok(())
    } else {
        Err("admin".into())
    }
}

fn user_task_args(name: &str, action: &str, onlogon: bool) -> Vec<String> {
    let mut args: Vec<String> = vec![
        "/Create".into(),
        "/SC".into(),
        (if onlogon { "ONLOGON" } else { "MINUTE" }).into(),
    ];
    if !onlogon {
        args.push("/MO".into());
        args.push("1".into());
    }
    args.extend([
        "/TN".into(),
        name.into(),
        "/TR".into(),
        action.into(),
        "/IT".into(),
        "/F".into(),
    ]);
    args
}

/// Non-admin guard tasks. They never use `/RU SYSTEM` or `/RL HIGHEST`, so a
/// user-writable guard copy cannot be scheduled with elevated privileges.
pub fn install_user_tasks(app: &Path, guard: &Path) -> Result<(), String> {
    let guard_action = format!("\"{}\" --guard --app \"{}\"", guard.display(), app.display());
    let mut ok = true;
    for (name, onlogon) in [(GUARD_TASK, false), (BOOT_TASK, true)] {
        let args = user_task_args(name, &guard_action, onlogon);
        let refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
        ok &= schtasks_ok(&refs);
    }
    if ok {
        Ok(())
    } else {
        Err("guard".into())
    }
}

/// Create only the elevated autostart task (used when the watchdog service is
/// the guard, so the per-user guard tasks are not needed).
fn elevated_task_args(action: &str, user: Option<&str>) -> Result<Vec<String>, String> {
    let user = user.map(str::trim).filter(|u| !u.is_empty()).ok_or("guard")?;
    Ok(vec![
        "/Create".into(),
        "/SC".into(),
        "ONLOGON".into(),
        "/TN".into(),
        ELEVATED_TASK.into(),
        "/TR".into(),
        action.into(),
        "/RL".into(),
        "HIGHEST".into(),
        "/RU".into(),
        user.into(),
        "/IT".into(),
        "/F".into(),
    ])
}

pub fn install_elevated_task(app: &Path) -> Result<(), String> {
    if !is_admin_path(app) {
        return Err("guard".into());
    }
    let action = format!("\"{}\" --background --elevated", app.display());
    let user = read_service_user().ok_or("guard")?;
    let args = elevated_task_args(&action, Some(&user))?;
    let refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    if schtasks_ok(&refs) {
        Ok(())
    } else {
        Err("admin".into())
    }
}

/// Delete the per-user guard tasks but keep the elevated autostart task.
pub fn delete_guard_tasks() -> Result<(), String> {
    let mut failed = false;
    for name in [GUARD_TASK, BOOT_TASK, SYSTEM_TASK] {
        if !schtasks_ok(&["/Delete", "/TN", name, "/F"]) && task_exists(name) {
            failed = true;
        }
    }
    if failed {
        Err("admin".into())
    } else {
        Ok(())
    }
}

fn sc(args: &[&str]) -> bool {
    Command::new(system32("sc.exe"))
        .args(args)
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn sc_output(args: &[&str]) -> Option<String> {
    let out = Command::new(system32("sc.exe"))
        .args(args)
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;
    Some(String::from_utf8_lossy(&out.stdout).into_owned())
}

pub fn parse_service_running(output: &str) -> bool {
    output.to_ascii_uppercase().contains("RUNNING")
}

pub fn service_installed() -> bool {
    sc(&["query", SERVICE_NAME])
}

pub fn service_running() -> bool {
    sc_output(&["query", SERVICE_NAME])
        .map(|o| parse_service_running(&o))
        .unwrap_or(false)
}

fn service_stopped() -> bool {
    if !service_installed() {
        return true;
    }
    sc_output(&["query", SERVICE_NAME])
        .map(|o| o.to_ascii_uppercase().contains("STOPPED"))
        .unwrap_or(true)
}

/// Register and start the SYSTEM watchdog service. The service's SCM recovery
/// actions restart it within 5 s even if an administrator kills the process.
pub fn install_service() -> Result<(), String> {
    harden_program_dir()?;
    let guard = guard_exe().ok_or("guard")?;
    if !guard.is_file() || is_reparse(&guard) {
        return Err("guard".into());
    }
    let bin = format!("\"{}\" --service", guard.display());
    let mut ok = sc(&[
        "create",
        SERVICE_NAME,
        "binPath=",
        &bin,
        "start=",
        "auto",
        "DisplayName=",
        "Cue Watchdog",
    ]);
    if !ok {
        ok = sc(&[
            "config",
            SERVICE_NAME,
            "binPath=",
            &bin,
            "start=",
            "auto",
        ]);
    }
    let _ = sc(&[
        "description",
        SERVICE_NAME,
        "Keeps Cue running.",
    ]);
    let _ = sc(&[
        "failure",
        SERVICE_NAME,
        "reset=",
        "0",
        "actions=",
        "restart/5000/restart/5000/restart/5000",
    ]);
    if !ok {
        return Err("admin".into());
    }
    let _ = sc(&["start", SERVICE_NAME]);
    Ok(())
}

pub fn stop_service() {
    let _ = sc(&["stop", SERVICE_NAME]);
    // `sc stop` is asynchronous; wait until the SCM releases the exe before
    // the strict guard copy overwrites it.
    for _ in 0..50 {
        if !service_running() && service_stopped() {
            return;
        }
        std::thread::sleep(std::time::Duration::from_millis(200));
    }
}

pub fn delete_service() -> Result<(), String> {
    let _ = sc(&["delete", SERVICE_NAME]);
    for _ in 0..50 {
        if !service_installed() {
            return Ok(());
        }
        std::thread::sleep(std::time::Duration::from_millis(100));
    }
    Err("admin".into())
}

#[allow(dead_code)]
pub fn remove_guard_copy() {
    if let Some(path) = guard_exe() {
        let _ = std::fs::remove_file(path);
    }
    clear_legacy_config();
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtectionStatus {
    pub elevated: bool,
    pub admin_tasks: bool,
    pub guard_tasks: bool,
    pub program_marker: bool,
    pub service_installed: bool,
    pub service_running: bool,
}

pub fn status() -> ProtectionStatus {
    ProtectionStatus {
        elevated: is_elevated(),
        admin_tasks: task_exists(ELEVATED_TASK),
        guard_tasks: task_exists(GUARD_TASK) || task_exists(SYSTEM_TASK),
        program_marker: program_marker_exists(),
        service_installed: service_installed(),
        service_running: service_running(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn program_dir_is_under_program_data() {
        assert_eq!(
            program_dir_in(Path::new(r"C:\ProgramData")),
            PathBuf::from(r"C:\ProgramData\Cue")
        );
    }

    #[test]
    fn task_names_are_distinct() {
        let mut names = TASKS.to_vec();
        names.sort();
        names.dedup();
        assert_eq!(names.len(), TASKS.len());
    }

    #[test]
    fn service_state_is_parsed_from_sc_output() {
        let running = "SERVICE_NAME: CueWatchdog\n        TYPE               : 10  WIN32_OWN_PROCESS\n        STATE              : 4  RUNNING";
        let stopped = "STATE              : 1  STOPPED";
        assert!(parse_service_running(running));
        assert!(!parse_service_running(stopped));
    }

    #[test]
    fn defender_script_quotes_paths_and_processes() {
        let script = defender_script(
            &[PathBuf::from(r"C:\O'Brien\Cue")],
            &["cue.exe", "cue-guard.exe"],
        );
        assert!(script.contains(r"C:\O''Brien\Cue"));
        assert!(script.contains("Add-MpPreference -ExclusionProcess 'cue.exe'"));
        assert!(script.contains("Add-MpPreference -ExclusionProcess 'cue-guard.exe'"));
    }

    #[test]
    fn elevated_task_requires_a_user() {
        assert_eq!(elevated_task_args("x", None).unwrap_err(), "guard");
        assert_eq!(elevated_task_args("x", Some("  ")).unwrap_err(), "guard");
        let args = elevated_task_args("x", Some(r"KALPHA\comma")).unwrap();
        assert!(args.windows(2).any(|w| w == ["/RU", r"KALPHA\comma"]));
        assert!(args.iter().any(|a| a == "/IT"));
    }

    #[test]
    fn admin_user_falls_back_to_the_installer_user() {
        assert_eq!(
            resolve_admin_user(Some(" KALPHA\\comma ".into()), r"OTHER\user"),
            Some(r"KALPHA\comma".into())
        );
        assert_eq!(
            resolve_admin_user(None, r"KALPHA\comma"),
            Some(r"KALPHA\comma".into())
        );
        assert_eq!(resolve_admin_user(Some("  ".into()), ""), None);
    }

    #[test]
    fn system32_path_is_absolute() {
        assert_eq!(
            system32_in(Path::new(r"C:\Windows"), "schtasks.exe"),
            PathBuf::from(r"C:\Windows\System32\schtasks.exe")
        );
    }

    #[test]
    fn protected_app_path_is_bounded() {
        let root = Path::new(r"C:\Program Files");
        assert!(is_under(Path::new(r"C:\Program Files\Cue\cue.exe"), root));
        assert!(!is_under(Path::new(r"C:\home\Cue_App\Cue\cue.exe"), root));
        assert!(!is_under(Path::new(r"C:\Program Files (x86)\Cue\cue.exe"), root));
    }

    #[test]
    fn admin_copy_lives_in_program_data() {
        assert_eq!(
            admin_app_exe_in(Path::new(r"C:\ProgramData")),
            PathBuf::from(r"C:\ProgramData\Cue\cue.exe")
        );
    }

    #[test]
    fn admin_path_comparison_is_case_insensitive() {
        assert!(same_path(
            Path::new(r"C:\ProgramData\Cue\cue.exe"),
            Path::new(r"c:\programdata\cue\CUE.EXE")
        ));
    }

    #[test]
    fn writable_directory_is_not_locked() {
        let dir = std::env::temp_dir().join(format!("cue-probe-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        assert!(!dir_is_locked(&dir));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn admin_app_prefers_a_protected_install() {
        let protected = Path::new(r"C:\Program Files\Cue\cue.exe");
        let admin = Path::new(r"C:\ProgramData\Cue\cue.exe");
        assert_eq!(pick_admin_app(protected, Some(admin)).unwrap(), protected);
        assert_eq!(
            pick_admin_app(Path::new(r"C:\home\Cue\cue.exe"), Some(admin)).unwrap(),
            admin
        );
        assert_eq!(
            pick_admin_app(Path::new(r"C:\home\Cue\cue.exe"), None).unwrap_err(),
            "admin_copy"
        );
    }

    #[test]
    fn program_data_copy_is_an_admin_path() {
        let admin = admin_app_exe().unwrap();
        assert!(is_admin_app(&admin));
        assert!(is_admin_path(&admin));
    }

    #[test]
    fn non_admin_tasks_never_request_system_or_highest() {
        let args = user_task_args("Cue Guard", "cmd", false);
        assert!(args.windows(2).any(|w| w == ["/SC", "MINUTE"]));
        assert!(!args.iter().any(|a| a == "SYSTEM" || a == "HIGHEST"));
        assert!(!args.iter().any(|a| a == "/RU" || a == "/RL"));
        let boot = user_task_args("Cue Guard Boot", "cmd", true);
        assert!(boot.windows(2).any(|w| w == ["/SC", "ONLOGON"]));
    }

    #[test]
    fn strict_guard_copy_does_not_reuse_a_locked_target() {
        use std::os::windows::fs::OpenOptionsExt;
        let root = std::env::temp_dir().join(format!("cue-copy-{}", std::process::id()));
        let src = root.join("src.exe");
        let dst = root.join("dst.exe");
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        std::fs::write(&src, b"new").unwrap();
        std::fs::write(&dst, b"old").unwrap();
        let _lock = std::fs::OpenOptions::new()
            .read(true)
            .share_mode(0)
            .open(&dst)
            .unwrap();

        assert_eq!(copy_guard(&src, &dst, false).unwrap_err(), "guard");
        assert!(copy_guard(&src, &dst, true).is_ok());

        drop(_lock);
        let _ = std::fs::remove_dir_all(&root);
    }
}
