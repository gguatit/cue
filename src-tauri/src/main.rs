#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai;
mod brightness;
mod capture;
mod commands;
mod elevation;
mod guard;
mod led;
mod meeting;
mod models;
mod secrets;
mod shortcut;
mod tray;
mod updates;
mod windows;

use std::path::PathBuf;
use std::time::Duration;

use commands::AppState;
use tauri_plugin_autostart::ManagerExt;

fn arg_value(name: &str) -> Option<PathBuf> {
    let mut args = std::env::args();
    while let Some(arg) = args.next() {
        if arg == name {
            return args.next().map(PathBuf::from);
        }
    }
    None
}

fn wait_for_app_mutex() -> ::windows::Win32::Foundation::HANDLE {
    use ::windows::Win32::Foundation::{CloseHandle, GetLastError, ERROR_ALREADY_EXISTS};
    use ::windows::Win32::System::Threading::CreateMutexW;
    unsafe {
        for _ in 0..50 {
            if let Ok(handle) = CreateMutexW(None, true, ::windows::core::w!("Local\\CueApp")) {
                if GetLastError() == ERROR_ALREADY_EXISTS {
                    let _ = CloseHandle(handle);
                    std::thread::sleep(Duration::from_millis(200));
                    continue;
                }
                return handle;
            }
            std::thread::sleep(Duration::from_millis(200));
        }
        CreateMutexW(None, true, ::windows::core::w!("Local\\CueApp"))
            .expect("app mutex")
    }
}

fn watch_guard(app: PathBuf) {
    std::thread::spawn(move || {
        let mut ticks = 0u32;
        loop {
            std::thread::sleep(Duration::from_secs(10));
            if !guard::armed() {
                continue;
            }
            if !guard::guard_running()
                && !elevation::service_running()
                && !elevation::is_elevated()
            {
                let _ = guard::spawn_guard(&app);
            }
            ticks += 1;
            if ticks % 6 == 0 && elevation::is_elevated() && elevation::program_marker_exists() {
                if let Ok(exe) = std::env::current_exe() {
                    if elevation::service_running() {
                        let _ = elevation::install_elevated_task(&exe);
                    } else if let Ok(guard) = elevation::ensure_guard_copy() {
                        let _ = elevation::install_tasks(&exe, &guard);
                    }
                }
            }
        }
    });
}

fn main() {
    let app_arg = arg_value("--app");
    if std::env::args().any(|a| a == "--guard") {
        guard::run_guard(app_arg);
        return;
    }
    if std::env::args().any(|a| a == "--system") {
        guard::run_system(app_arg);
        return;
    }
    if std::env::args().any(|a| a == "--service") {
        let _ = guard::run_service();
        return;
    }
    if std::env::args().any(|a| a == "--admin-teardown") {
        let _ = guard::teardown();
        return;
    }
    if std::env::args().any(|a| a == "--admin-prepare") {
        let code = if elevation::prepare_admin_copy().is_ok() { 0 } else { 1 };
        std::process::exit(code);
    }
    let background = std::env::args().any(|a| a == "--background");
    let elevated = std::env::args().any(|a| a == "--elevated") && elevation::is_elevated();
    let admin_setup = std::env::args().any(|a| a == "--admin-setup");
    // Administrator mode is on but this instance is not elevated (for example a
    // stale Run entry or a manual start): relaunch once through UAC so the
    // setting survives reboots even if the logon task was missed.
    if !elevated
        && !admin_setup
        && !elevation::admin_prepare_failed()
        && (elevation::program_marker_exists() || elevation::service_installed())
    {
        // A normal install can be user-writable. Hand off to the protected
        // ProgramData copy instead of elevating the install the user launched.
        if let Ok(current) = std::env::current_exe() {
            if let Ok(target) = elevation::admin_app_for(&current) {
                let _ = elevation::relaunch_elevated_exe(&target, "--admin-check");
                return;
            }
        }
    }
    // The elevated relaunch waits for the old instance to release the mutex so
    // the single-instance plugin does not forward and exit.
    let _app_mutex = if elevated || admin_setup {
        wait_for_app_mutex()
    } else {
        unsafe {
            ::windows::Win32::System::Threading::CreateMutexW(
                None,
                true,
                ::windows::core::w!("Local\\CueApp"),
            )
            .expect("app mutex")
        }
    };
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if args.iter().any(|a| a == "--background") {
                return;
            }
            windows::show_main(app);
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--background"]),
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::set_tray_icons,
            commands::set_tray_visible,
            commands::set_tray_menu_labels,
            commands::set_shortcut,
            commands::set_panic_shortcut,
            commands::set_shortcut_recording,
            commands::shortcut_installed,
            commands::capture_and_answer,
            commands::cancel_answer,
            commands::clear_clipboard,
            commands::show_overlay,
            commands::hide_overlay,
            commands::hide_main,
            commands::meeting_active,
            commands::copy_text,
            commands::blink_answer,
            commands::blink_brightness,
            commands::test_connection,
            commands::list_models,
            commands::set_api_key,
            commands::has_api_key,
            commands::clear_api_key,
            commands::set_hide_from_taskbar,
            commands::set_content_protection,
            commands::capture_protection_status,
            commands::open_taskbar_settings,
            commands::tray_icon_shown,
            commands::open_external,
            commands::set_autostart,
            commands::get_autostart,
            commands::set_guard,
            commands::repair_guard,
            commands::guard_enabled,
            commands::repair_protection,
            commands::protection_status,
            commands::add_defender_exclusion,
            commands::set_admin_mode,
            commands::check_update,
            commands::install_update,
            commands::quit_app,
        ])
        .setup(move |app| {
            let handle = app.handle().clone();
            if admin_setup {
                let exe = std::env::current_exe().map_err(|_| "admin")?;
                if !elevation::is_admin_path(&exe) {
                    return Err("admin".into());
                }
                let passed_user = arg_value("--user")
                    .and_then(|p| p.to_str().map(str::to_string))
                    .filter(|s| !s.trim().is_empty());
                let user = passed_user.unwrap_or_else(elevation::current_user);
                // Stop a running watchdog before overwriting its binary; the
                // old copy is locked and `fs::copy` would silently keep it.
                elevation::stop_service();
                elevation::harden_program_dir().map_err(|_| "admin")?;
                elevation::ensure_guard_copy().map_err(|_| "admin")?;
                elevation::write_service_config(&exe, &user).map_err(|_| "admin")?;
                elevation::clear_legacy_config();
                let _ = elevation::create_program_marker();
                let _ = elevation::install_elevated_task(&exe);
                let _ = elevation::delete_guard_tasks();
                elevation::install_service().map_err(|_| "admin")?;
                let _ = app.autolaunch().disable();
                elevation::remove_run_key();
                elevation::clear_admin_prepare_failed();
            }
            if !admin_setup
                && elevation::is_elevated()
                && (elevation::program_marker_exists() || elevation::service_installed())
            {
                if let Ok(exe) = std::env::current_exe() {
                    if !elevation::is_admin_path(&exe) {
                        return Err("admin".into());
                    }
                    elevation::harden_program_dir().map_err(|_| "admin")?;
                    elevation::write_service_config(&exe, &elevation::current_user())
                        .map_err(|_| "admin")?;
                    elevation::clear_legacy_config();
                    let _ = elevation::create_program_marker();
                    if elevation::service_installed() {
                        elevation::stop_service();
                    }
                    let _ = elevation::ensure_guard_copy();
                    let _ = elevation::install_elevated_task(&exe);
                    let _ = elevation::install_service();
                    elevation::remove_run_key();
                    elevation::clear_admin_prepare_failed();
                }
            }
            tray::create(&handle)?;
            if let Ok(spec) = shortcut::ShortcutSpec::parse("Control+Alt+Super") {
                shortcut::install(&handle, spec);
            }
            windows::create_overlay(&handle)?;
            let main = windows::create_main(&handle, !background)?;
            let w = main.clone();
            main.on_window_event(move |e| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = e {
                    api.prevent_close();
                    let _ = w.hide();
                }
            });
            if let Ok(exe) = std::env::current_exe() {
                watch_guard(exe);
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, _event| {});
}
