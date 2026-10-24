use tauri::image::Image;
use tauri::menu::{Menu, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager};

use crate::commands::{promote_tray_icon_once, AppState, MenuHandles};
use crate::windows;

pub fn create(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItemBuilder::with_id("open", "Open").build(app)?;
    let help = MenuItemBuilder::with_id("help", "Help").build(app)?;
    let last = MenuItemBuilder::with_id("last", "Last answer").build(app)?;
    let copy = MenuItemBuilder::with_id("copy", "Copy last answer").build(app)?;
    let clear = MenuItemBuilder::with_id("clear", "Clear").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
    let menu = Menu::with_items(app, &[&open, &help, &last, &copy, &clear, &quit])?;

    let tray = TrayIconBuilder::with_id("main")
        .icon(load_default_icon())
        .tooltip("System")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => windows::show_main(app),
            "help" => {
                windows::show_main(app);
                let _ = app.emit("open-help", ());
            }
            "last" => {
                let _ = app.emit("show-last", ());
            }
            "copy" => {
                let _ = app.emit("copy-last", ());
            }
            "clear" => {
                let _ = app.emit("tray-clear", ());
            }
            "quit" => {
                crate::guard::disarm();
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                windows::show_main(tray.app_handle());
            }
        })
        .build(app)?;

    let state = app.state::<AppState>();
    if let Ok(mut g) = state.tray.lock() {
        *g = Some(tray);
    }
    if let Ok(mut g) = state.menu.lock() {
        *g = Some(MenuHandles { open, help, last, copy, clear, quit });
    }
    std::thread::spawn(promote_tray_icon_once);
    Ok(())
}

fn load_default_icon() -> Image<'static> {
    let bytes = include_bytes!("../icons/32x32.png");
    match image::load_from_memory(bytes) {
        Ok(img) => {
            let rgba = img.to_rgba8();
            let (w, h) = rgba.dimensions();
            Image::new_owned(rgba.into_raw(), w, h)
        }
        Err(_) => Image::new_owned(vec![0u8; 32 * 32 * 4], 32, 32),
    }
}
