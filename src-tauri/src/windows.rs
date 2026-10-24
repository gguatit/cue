use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

use crate::capture::MonitorRect;

pub const BROWSER_ARGS: &str = "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --autoplay-policy=no-user-gesture-required --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding";

pub fn set_tool_window(win: &WebviewWindow, hidden: bool) -> Result<(), String> {
    use ::windows::Win32::Foundation::HWND;
    use ::windows::Win32::UI::WindowsAndMessaging::{
        GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos, GWL_EXSTYLE, SWP_FRAMECHANGED,
        SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER, WS_EX_APPWINDOW, WS_EX_TOOLWINDOW,
    };
    let hwnd = HWND(
        win.hwnd()
            .map_err(|_| "stealth".to_string())?
            .0,
    );
    unsafe {
        let mut style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;
        if hidden {
            style |= WS_EX_TOOLWINDOW.0;
            style &= !WS_EX_APPWINDOW.0;
        } else {
            style &= !WS_EX_TOOLWINDOW.0;
            style |= WS_EX_APPWINDOW.0;
        }
        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, style as isize);
        let _ = SetWindowPos(
            hwnd,
            None,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED,
        );
    }
    Ok(())
}

pub fn set_capture_protection(win: &WebviewWindow, enabled: bool) -> Result<(), String> {
    use ::windows::Win32::Foundation::HWND;
    use ::windows::Win32::UI::WindowsAndMessaging::{
        SetWindowDisplayAffinity, WDA_EXCLUDEFROMCAPTURE, WDA_NONE,
    };
    let hwnd = HWND(
        win.hwnd()
            .map_err(|_| "stealth".to_string())?
            .0,
    );
    unsafe {
        SetWindowDisplayAffinity(
            hwnd,
            if enabled { WDA_EXCLUDEFROMCAPTURE } else { WDA_NONE },
        )
        .map_err(|_| "stealth".to_string())
    }
}

pub const BADGE_SIZE: (i32, i32) = (120, 72);
pub const TEXT_MIN_SIZE: (i32, i32) = (320, 160);
pub const TEXT_MAX_RATIO: f64 = 0.7;

pub fn text_size(scale: f64, len: usize, work: MonitorRect) -> (i32, i32) {
    let s = if scale > 0.0 { scale } else { 1.0 };
    let chars = len.max(1) as f64;
    let lines = (chars / 44.0).ceil().max(1.0);
    let grow = (chars - 44.0).max(0.0).min(88.0) / 88.0;
    let width = (TEXT_MIN_SIZE.0 as f64 + grow * 400.0) * s;
    let height = (TEXT_MIN_SIZE.1 as f64 + (lines - 1.0) * 24.0) * s;
    let max_w = (work.w as f64 * TEXT_MAX_RATIO).floor().max(1.0) as i32;
    let max_h = (work.h as f64 * TEXT_MAX_RATIO).floor().max(1.0) as i32;
    (
        (width.round() as i32).min(max_w).max(1),
        (height.round() as i32).min(max_h).max(1),
    )
}

pub fn text_position(work: MonitorRect, size: (i32, i32)) -> (i32, i32) {
    let margin = 24;
    (
        (work.x + work.w - size.0 - margin).max(work.x),
        (work.y + work.h - size.1 - margin).max(work.y),
    )
}

pub fn badge_size(scale: f64, len: usize) -> (i32, i32) {
    let s = if scale > 0.0 { scale } else { 1.0 };
    let extra = len.saturating_sub(1) as f64 * 28.0;
    (
        ((BADGE_SIZE.0 as f64 + extra) * s).round() as i32,
        (BADGE_SIZE.1 as f64 * s).round() as i32,
    )
}

pub fn badge_position(cursor: (i32, i32), work: MonitorRect, size: (i32, i32)) -> (i32, i32) {
    let max_x = work.x + work.w - size.0;
    let max_y = work.y + work.h - size.1;
    let x = (cursor.0 + 16).min(max_x).max(work.x);
    let y = (cursor.1 - size.1 - 12).min(max_y).max(work.y);
    (x, y)
}

pub fn scale_from_dpi(dpi: u32) -> f64 {
    if dpi == 0 { 1.0 } else { dpi as f64 / 96.0 }
}

pub fn monitor_scale(mon: MonitorRect) -> f64 {
    use ::windows::Win32::Foundation::POINT;
    use ::windows::Win32::Graphics::Gdi::{MonitorFromPoint, MONITOR_DEFAULTTONEAREST};
    use ::windows::Win32::UI::HiDpi::{GetDpiForMonitor, MDT_EFFECTIVE_DPI};
    unsafe {
        let point = POINT {
            x: mon.x + mon.w / 2,
            y: mon.y + mon.h / 2,
        };
        let monitor = MonitorFromPoint(point, MONITOR_DEFAULTTONEAREST);
        let (mut x, mut y) = (96u32, 96u32);
        if GetDpiForMonitor(monitor, MDT_EFFECTIVE_DPI, &mut x, &mut y).is_ok() {
            scale_from_dpi(x)
        } else {
            1.0
        }
    }
}

pub fn create_main(app: &AppHandle, visible: bool) -> tauri::Result<WebviewWindow> {
    let win = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("Cue")
        .inner_size(880.0, 640.0)
        .min_inner_size(640.0, 480.0)
        .visible(visible)
        .additional_browser_args(BROWSER_ARGS)
        .build()?;
    let _ = set_capture_protection(&win, true);
    Ok(win)
}

pub fn create_overlay(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    let win = WebviewWindowBuilder::new(app, "overlay", WebviewUrl::App("index.html".into()))
        .title("Cue Overlay")
        .transparent(true)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .shadow(false)
        .focused(false)
        .focusable(false)
        .resizable(true)
        .visible(false)
        .additional_browser_args(BROWSER_ARGS)
        .build()?;
    let _ = set_tool_window(&win, true);
    let _ = set_capture_protection(&win, true);
    let _ = win.set_ignore_cursor_events(true);
    Ok(win)
}

pub fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

pub fn hide_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.hide();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rect(x: i32, y: i32, w: i32, h: i32) -> MonitorRect {
        MonitorRect { x, y, w, h }
    }

    #[test]
    fn dpi_converts_to_scale() {
        assert_eq!(scale_from_dpi(96), 1.0);
        assert_eq!(scale_from_dpi(120), 1.25);
        assert_eq!(scale_from_dpi(0), 1.0);
    }

    #[test]
    fn badge_near_cursor() {
        let (x, y) = badge_position((500, 500), rect(0, 0, 1920, 1080), BADGE_SIZE);
        assert_eq!((x, y), (516, 416));
    }

    #[test]
    fn badge_clamped_at_edges() {
        let (x, y) = badge_position((1910, 10), rect(0, 0, 1920, 1080), BADGE_SIZE);
        assert_eq!((x, y), (1800, 0));
    }

    #[test]
    fn badge_clamped_on_negative_monitor() {
        let (x, y) = badge_position((-1950, 5), rect(-1920, 0, 1920, 1080), BADGE_SIZE);
        assert_eq!((x, y), (-1920, 0));
    }

    #[test]
    fn badge_size_scales_with_dpi() {
        assert_eq!(badge_size(1.0, 1), BADGE_SIZE);
        assert_eq!(badge_size(2.0, 1), (240, 144));
        assert_eq!(badge_size(0.0, 1), BADGE_SIZE);
    }

    #[test]
    fn badge_size_grows_with_text_length() {
        assert_eq!(badge_size(1.0, 3), (176, 72));
        assert_eq!(badge_size(2.0, 4), (408, 144));
    }

    #[test]
    fn text_panel_uses_the_minimum_for_short_text() {
        assert_eq!(text_size(1.0, 8, rect(0, 0, 1920, 1080)), TEXT_MIN_SIZE);
        assert_eq!(text_size(0.0, 8, rect(0, 0, 1920, 1080)), TEXT_MIN_SIZE);
    }

    #[test]
    fn text_panel_scales_with_dpi() {
        assert_eq!(text_size(1.5, 8, rect(0, 0, 1920, 1080)), (480, 240));
    }

    #[test]
    fn text_panel_grows_with_text_length() {
        let short = text_size(1.0, 40, rect(0, 0, 1920, 1080));
        let long = text_size(1.0, 400, rect(0, 0, 1920, 1080));
        assert!(long.0 > short.0);
        assert!(long.1 > short.1);
    }

    #[test]
    fn text_panel_caps_at_seventy_percent_of_the_monitor() {
        assert_eq!(text_size(1.0, 10000, rect(0, 0, 1000, 600)), (700, 420));
        assert_eq!(text_size(2.0, 10000, rect(0, 0, 1000, 600)), (700, 420));
    }

    #[test]
    fn text_panel_is_docked_bottom_right() {
        assert_eq!(
            text_position(rect(0, 0, 1920, 1080), TEXT_MIN_SIZE),
            (1576, 896)
        );
        assert_eq!(
            text_position(rect(-1920, 0, 1920, 1080), TEXT_MIN_SIZE),
            (-344, 896)
        );
    }
}

pub fn pointer_over_main(app: &AppHandle) -> bool {
    let Some(w) = app.get_webview_window("main") else {
        return false;
    };
    if !w.is_visible().unwrap_or(false) || w.is_minimized().unwrap_or(false) {
        return false;
    }
    let Ok(hwnd) = w.hwnd() else { return false };
    if unsafe { windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow() }.0 != hwnd.0 {
        return false;
    }
    let (Ok(pos), Ok(size)) = (w.outer_position(), w.outer_size()) else {
        return false;
    };
    let mut pt = windows::Win32::Foundation::POINT::default();
    if unsafe { windows::Win32::UI::WindowsAndMessaging::GetCursorPos(&mut pt) }.is_err() {
        return false;
    }
    pt.x >= pos.x
        && pt.x < pos.x + size.width as i32
        && pt.y >= pos.y
        && pt.y < pos.y + size.height as i32
}
