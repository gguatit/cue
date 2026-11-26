#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai;
mod air;
mod appearance;
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
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use commands::AppState;
use tauri::Emitter;
use tauri_plugin_autostart::ManagerExt;

const BLUR_GRACE_MS: u64 = 150;

fn blur_is_current(token: u64, generation: &AtomicU64) -> bool {
    generation.load(Ordering::SeqCst) == token
}

fn arg_value(name: &str) -> Option<PathBuf> {
    let mut args = std::env::args();
    while let Some(arg) = args.next() {
        if arg == name {
            return args.next().map(PathBuf::from);
        }
    }
    None
}

fn is_elevated_launch(args: &[String]) -> bool {
    args.iter()
        .any(|arg| arg == "--elevated" || arg == "--admin-check")
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
            if !elevation::is_elevated()
                && !guard::guard_running()
                && !elevation::service_running()
            {
                let _ = guard::spawn_guard(&app);
            }
            ticks += 1;
            // Task repair is a maintenance job; every 5 minutes is enough.
            if ticks % 30 == 0 && elevation::is_elevated() && elevation::program_marker_exists() {
                if let Ok(exe) = std::env::current_exe() {
                    if elevation::service_running() {
                        if elevation::install_elevated_task(&exe).is_err() {
                            elevation::record_admin_prepare_failure();
                        }
                    } else {
                        match elevation::ensure_guard_copy() {
                            Ok(guard) => {
                                if elevation::install_tasks(&exe, &guard).is_err() {
                                    elevation::record_admin_prepare_failure();
                                }
                            }
                            Err(_) => elevation::record_admin_prepare_failure(),
                        }
                    }
                }
            }
        }
    });
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let app_arg = arg_value("--app");
    if args.iter().any(|a| a == "--guard") {
        guard::run_guard(app_arg);
        return;
    }
    if args.iter().any(|a| a == "--system") {
        guard::run_system(app_arg);
        return;
    }
    if args.iter().any(|a| a == "--service") {
        let _ = guard::run_service();
        return;
    }
    if args.iter().any(|a| a == "--admin-teardown") {
        let _ = guard::teardown();
        return;
    }
    if args.iter().any(|a| a == "--admin-prepare") {
        let code = if elevation::prepare_admin_copy().is_ok() { 0 } else { 1 };
        std::process::exit(code);
    }
    let background = args.iter().any(|a| a == "--background");
    let elevated = is_elevated_launch(&args) && elevation::is_elevated();
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
            commands::set_free_shortcut,
            commands::set_overlay_prewarm,
            commands::set_predictive,
            commands::set_cue_air,
            commands::cue_air_status,
            commands::regenerate_cue_air,
            commands::publish_cue_air,
            commands::set_mouse_trigger,
            commands::set_gesture_test,
            commands::set_panic_shortcut,
            commands::set_shortcut_recording,
            commands::shortcut_installed,
            commands::capture_and_answer,
            commands::cancel_answer,
            commands::clear_clipboard,
            commands::show_overlay,
            commands::stream_done,
            commands::overlay_ready,
            commands::hide_overlay,
            commands::hide_main,
            commands::meeting_active,
            commands::meeting_signals,
            commands::copy_text,
            commands::blink_answer,
            commands::blink_brightness,
            commands::check_extra,
            commands::test_connection,
            commands::list_models,
            commands::set_api_key,
            commands::has_api_key,
            commands::clear_api_key,
            commands::set_hide_from_taskbar,
            commands::set_content_protection,
            commands::capture_protection_status,
            commands::runtime_status,
            commands::refresh_input,
            commands::open_taskbar_settings,
            commands::tray_icon_shown,
            commands::open_external,
            commands::system_accent,
            commands::set_titlebar_theme,
            commands::set_autostart,
            commands::get_autostart,
            commands::set_guard,
            commands::repair_guard,
            commands::guard_enabled,
            commands::repair_protection,
            commands::protection_status,
            commands::add_defender_exclusion,
            commands::defender_exclusion_status,
            commands::set_admin_mode,
            commands::take_repair_pending,
            commands::check_update,
            commands::preflight_update,
            commands::install_update,
            commands::cleanup_update_files,
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
                let setup = (|| -> Result<(), String> {
                    elevation::harden_program_dir().map_err(|_| "admin")?;
                    elevation::ensure_guard_copy().map_err(|_| "admin")?;
                    elevation::write_service_config(&exe, &user).map_err(|_| "admin")?;
                    elevation::clear_legacy_config();
                    elevation::create_program_marker().map_err(|_| "admin")?;
                    elevation::install_elevated_task(&exe).map_err(|_| "admin")?;
                    elevation::delete_guard_tasks().map_err(|_| "admin")?;
                    elevation::install_service().map_err(|_| "admin")?;
                    Ok(())
                })();
                if setup.is_err() {
                    elevation::record_admin_prepare_failure();
                    return Err("admin".into());
                }
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
                    let repair = (|| -> Result<(), String> {
                        elevation::harden_program_dir().map_err(|_| "admin")?;
                        elevation::write_service_config(&exe, &elevation::current_user())
                            .map_err(|_| "admin")?;
                        elevation::clear_legacy_config();
                        elevation::create_program_marker().map_err(|_| "admin")?;
                        if elevation::service_installed() {
                            elevation::stop_service();
                        }
                        elevation::ensure_guard_copy().map_err(|_| "admin")?;
                        elevation::install_elevated_task(&exe).map_err(|_| "admin")?;
                        elevation::install_service().map_err(|_| "admin")?;
                        Ok(())
                    })();
                    if repair.is_err() {
                        elevation::record_admin_prepare_failure();
                    } else {
                        elevation::remove_run_key();
                        elevation::clear_admin_prepare_failed();
                    }
                }
            }
            tray::create(&handle)?;
            if let Ok(spec) = shortcut::ShortcutSpec::parse("Control+Alt+Super") {
                shortcut::install(&handle, spec);
            }
            let main = windows::create_main(&handle, !background)?;
            let w = main.clone();
            let blur_generation = Arc::new(AtomicU64::new(0));
            main.on_window_event(move |e| {
                match e {
                    tauri::WindowEvent::CloseRequested { api, .. } => {
                        api.prevent_close();
                        let _ = w.hide();
                    }
                    tauri::WindowEvent::Focused(false) => {
                        // Windows drops focus briefly during a native window drag.
                        // Hide only if focus has not returned by the grace deadline.
                        let token = blur_generation.fetch_add(1, Ordering::SeqCst) + 1;
                        let w = w.clone();
                        let generation = blur_generation.clone();
                        std::thread::spawn(move || {
                            std::thread::sleep(Duration::from_millis(BLUR_GRACE_MS));
                            if blur_is_current(token, &generation) {
                                let _ = w.emit("main-blurred", ());
                            }
                        });
                    }
                    tauri::WindowEvent::Focused(true) => {
                        blur_generation.fetch_add(1, Ordering::SeqCst);
                        shortcut::refresh_hooks();
                    }
                    _ => {}
                }
            });
            if let Ok(exe) = std::env::current_exe() {
                watch_guard(exe);
            }
            std::thread::spawn(crate::updates::cleanup_temp_installers);
            let hook_handle = handle.clone();
            std::thread::spawn(move || loop {
                std::thread::sleep(std::time::Duration::from_secs(60));
                let app = hook_handle.clone();
                // Low-level hooks only receive input while their installing
                // thread pumps messages. Reinstalling from this worker thread
                // would silently kill both hooks after the first refresh.
                let _ = hook_handle.run_on_main_thread(move || {
                    shortcut::refresh_hooks();
                    tray::refresh_visibility(&app);
                });
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, _event| {});
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn focus_cancels_a_pending_blur() {
        let generation = AtomicU64::new(0);
        let token = generation.fetch_add(1, Ordering::SeqCst) + 1;
        assert!(blur_is_current(token, &generation));
        generation.fetch_add(1, Ordering::SeqCst);
        assert!(!blur_is_current(token, &generation));
    }

    #[test]
    fn admin_check_counts_as_an_elevated_launch() {
        let args = |rest: &[&str]| {
            std::iter::once("cue")
                .chain(rest.iter().copied())
                .map(str::to_string)
                .collect::<Vec<_>>()
        };
        assert!(is_elevated_launch(&args(&["--admin-check"])));
        assert!(is_elevated_launch(&args(&["--elevated"])));
        assert!(!is_elevated_launch(&args(&["--background"])));
    }
}
