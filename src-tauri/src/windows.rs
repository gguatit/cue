use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

use crate::capture::MonitorRect;

pub const BROWSER_ARGS: &str = "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --autoplay-policy=no-user-gesture-required --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-networking --disable-component-update --disable-sync --disable-domain-reliability --no-default-browser-check";

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

pub fn set_titlebar_theme(win: &WebviewWindow, dark: bool) -> Result<(), String> {
    use ::windows::Win32::Foundation::HWND;
    use ::windows::Win32::Graphics::Dwm::{
        DwmSetWindowAttribute, DWMWA_USE_IMMERSIVE_DARK_MODE,
    };
    let hwnd = HWND(
        win.hwnd()
            .map_err(|_| "stealth".to_string())?
            .0,
    );
    let value: i32 = if dark { 1 } else { 0 };
    unsafe {
        DwmSetWindowAttribute(
            hwnd,
            DWMWA_USE_IMMERSIVE_DARK_MODE,
            &value as *const i32 as *const core::ffi::c_void,
            std::mem::size_of::<i32>() as u32,
        )
        .map_err(|_| "stealth".to_string())
    }
}

pub fn capture_affinity(win: &WebviewWindow) -> Result<u32, String> {
    use ::windows::Win32::Foundation::HWND;
    use ::windows::Win32::UI::WindowsAndMessaging::GetWindowDisplayAffinity;
    let hwnd = HWND(
        win.hwnd()
            .map_err(|_| "stealth".to_string())?
            .0,
    );
    let mut affinity = 0u32;
    unsafe {
        GetWindowDisplayAffinity(hwnd, &mut affinity)
            .map_err(|_| "stealth".to_string())?;
    }
    Ok(affinity)
}

pub const BADGE_SIZE: (i32, i32) = (120, 72);
pub const VERIFICATION_HEIGHT: i32 = 30;
pub const VERIFICATION_MIN_WIDTH: i32 = 160;
#[cfg(test)]
pub const TEXT_MIN_SIZE: (i32, i32) = (320, 160);
#[cfg(test)]
pub const TEXT_CURSOR_SIZE: (i32, i32) = (360, 220);
pub const TEXT_MAX_RATIO: f64 = 0.7;
pub const TEXT_MARGIN: i32 = 24;
pub const TEXT_CURSOR_GAP: i32 = 16;

const TEXT_PADDING: f64 = 40.0;
const TEXT_OUTER_PADDING: f64 = 16.0;
const TEXT_BORDER: f64 = 2.0;
const TEXT_PEEK_HEIGHT: f64 = 92.0;

pub fn text_size_for(
    scale: f64,
    len: usize,
    peek: bool,
    cursor: bool,
    work: MonitorRect,
) -> (i32, i32) {
    let s = if scale > 0.0 { scale } else { 1.0 };
    let chars = len.max(1);
    let base_width = if cursor {
        if chars <= 30 {
            260.0
        } else if chars <= 100 {
            320.0
        } else {
            360.0
        }
    } else if chars <= 30 {
        260.0
    } else if chars <= 100 {
        340.0
    } else if chars <= 220 {
        420.0
    } else {
        520.0
    };
    let font = if chars > 160 { 14.0 } else { 18.0 };
    let chars_per_line =
        ((base_width - TEXT_PADDING - TEXT_OUTER_PADDING - TEXT_BORDER) / font).max(1.0);
    let lines = ((chars as f64) / chars_per_line).ceil().max(1.0);
    // OverlayView uses leading-relaxed (1.625), not the font size itself.
    let line_height = (font * 1.625).ceil();
    let height = TEXT_OUTER_PADDING
        + TEXT_BORDER
        + TEXT_PADDING
        + lines * line_height
        + if peek { TEXT_PEEK_HEIGHT } else { 0.0 };
    let max_w = (work.w as f64 * if cursor { 0.6 } else { TEXT_MAX_RATIO })
        .floor()
        .max(1.0);
    let max_h = (work.h as f64 * if cursor { 0.5 } else { TEXT_MAX_RATIO })
        .floor()
        .max(1.0);
    (
        (base_width * s).round().clamp(1.0, max_w) as i32,
        (height * s).round().clamp(80.0, max_h) as i32,
    )
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TextPosition {
    Center,
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
    Camera,
    Cursor,
}

impl TextPosition {
    pub fn parse(value: &str) -> Self {
        match value {
            "center" => Self::Center,
            "top-left" => Self::TopLeft,
            "top-right" => Self::TopRight,
            "bottom-left" => Self::BottomLeft,
            "camera" => Self::Camera,
            "cursor" => Self::Cursor,
            _ => Self::BottomRight,
        }
    }
}

#[cfg(test)]
pub fn text_size(scale: f64, len: usize, work: MonitorRect) -> (i32, i32) {
    text_size_for(scale, len, false, false, work)
}

pub fn text_position(work: MonitorRect, size: (i32, i32), position: TextPosition) -> (i32, i32) {
    let left = work.x + TEXT_MARGIN;
    let right = (work.x + work.w - size.0 - TEXT_MARGIN).max(work.x);
    let top = work.y + TEXT_MARGIN;
    let bottom = (work.y + work.h - size.1 - TEXT_MARGIN).max(work.y);
    let center_x = (work.x + (work.w - size.0) / 2).max(work.x);
    let center_y = (work.y + (work.h - size.1) / 2).max(work.y);
    match position {
        TextPosition::Center => (center_x, center_y),
        TextPosition::TopLeft => (left, top),
        TextPosition::TopRight => (right, top),
        TextPosition::BottomLeft => (left, bottom),
        TextPosition::Camera => (center_x, top),
        TextPosition::BottomRight | TextPosition::Cursor => (right, bottom),
    }
}

#[cfg(test)]
pub fn text_size_cursor(scale: f64, len: usize, peek: bool, work: MonitorRect) -> (i32, i32) {
    text_size_for(scale, len, peek, true, work)
}

pub fn text_position_near_cursor(
    cursor: (i32, i32),
    work: MonitorRect,
    size: (i32, i32),
) -> (i32, i32) {
    let max_x = (work.x + work.w - size.0).max(work.x);
    let max_y = (work.y + work.h - size.1).max(work.y);
    let mut x = cursor.0 + TEXT_CURSOR_GAP;
    let mut y = cursor.1 + TEXT_CURSOR_GAP;
    if x + size.0 > work.x + work.w {
        x = cursor.0 - size.0 - TEXT_CURSOR_GAP;
    }
    if y + size.1 > work.y + work.h {
        y = cursor.1 - size.1 - TEXT_CURSOR_GAP;
    }
    (x.clamp(work.x, max_x), y.clamp(work.y, max_y))
}

pub fn badge_size(scale: f64, len: usize) -> (i32, i32) {
    let s = if scale > 0.0 { scale } else { 1.0 };
    let extra = len.saturating_sub(1) as f64 * 28.0;
    (
        ((BADGE_SIZE.0 as f64 + extra) * s).round() as i32,
        (BADGE_SIZE.1 as f64 * s).round() as i32,
    )
}

pub fn badge_size_with_verification(scale: f64, len: usize, verified: bool) -> (i32, i32) {
    let (width, height) = badge_size(scale, len);
    if !verified {
        return (width, height);
    }
    let s = if scale > 0.0 { scale } else { 1.0 };
    (
        width.max((VERIFICATION_MIN_WIDTH as f64 * s).round() as i32),
        height + (VERIFICATION_HEIGHT as f64 * s).round() as i32,
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
        .title("Settings")
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
        .title("")
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
    let _ = app.emit("main-shown", ());
    // Panic clearing hides the tray; opening the window must bring it back.
    if let Some(state) = app.try_state::<crate::commands::AppState>() {
        state
            .tray_visible
            .store(true, std::sync::atomic::Ordering::Relaxed);
        if let Ok(guard) = state.tray.lock() {
            if let Some(tray) = guard.as_ref() {
                let _ = tray.set_visible(true);
            }
        }
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
    fn verification_badge_adds_a_label_row() {
        assert_eq!(
            badge_size_with_verification(1.0, 1, false),
            badge_size(1.0, 1)
        );
        assert_eq!(
            badge_size_with_verification(1.0, 1, true),
            (VERIFICATION_MIN_WIDTH, badge_size(1.0, 1).1 + VERIFICATION_HEIGHT)
        );
        assert_eq!(
            badge_size_with_verification(2.0, 1, true),
            (
                VERIFICATION_MIN_WIDTH * 2,
                badge_size(2.0, 1).1 + VERIFICATION_HEIGHT * 2
            )
        );
    }

    #[test]
    fn text_panel_uses_the_minimum_for_short_text() {
        assert_eq!(text_size(1.0, 8, rect(0, 0, 1920, 1080)), (260, 88));
        assert_eq!(text_size(0.0, 8, rect(0, 0, 1920, 1080)), (260, 88));
    }

    #[test]
    fn text_panel_scales_with_dpi() {
        assert_eq!(text_size(1.5, 8, rect(0, 0, 1920, 1080)), (390, 132));
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
        assert_eq!(text_size(1.0, 10000, rect(0, 0, 1000, 600)), (520, 420));
        assert_eq!(text_size(2.0, 10000, rect(0, 0, 1000, 600)), (700, 420));
    }

    #[test]
    fn text_panel_positions_at_every_preset() {
        let work = rect(0, 0, 1920, 1080);
        assert_eq!(
            text_position(work, TEXT_MIN_SIZE, TextPosition::BottomRight),
            (1576, 896)
        );
        assert_eq!(
            text_position(work, TEXT_MIN_SIZE, TextPosition::BottomLeft),
            (24, 896)
        );
        assert_eq!(
            text_position(work, TEXT_MIN_SIZE, TextPosition::TopLeft),
            (24, 24)
        );
        assert_eq!(
            text_position(work, TEXT_MIN_SIZE, TextPosition::TopRight),
            (1576, 24)
        );
        assert_eq!(
            text_position(work, TEXT_MIN_SIZE, TextPosition::Center),
            (800, 460)
        );
        assert_eq!(
            text_position(work, TEXT_MIN_SIZE, TextPosition::Camera),
            (800, 24)
        );
        assert_eq!(
            text_position(
                rect(-1920, 0, 1920, 1080),
                TEXT_MIN_SIZE,
                TextPosition::BottomRight
            ),
            (-344, 896)
        );
        assert_eq!(
            text_position(rect(-1920, 0, 1920, 1080), TEXT_MIN_SIZE, TextPosition::TopLeft),
            (-1896, 24)
        );
    }

    #[test]
    fn text_position_parser_falls_back_to_bottom_right() {
        assert_eq!(TextPosition::parse("center"), TextPosition::Center);
        assert_eq!(TextPosition::parse("camera"), TextPosition::Camera);
        assert_eq!(TextPosition::parse("cursor"), TextPosition::Cursor);
        assert_eq!(TextPosition::parse("nope"), TextPosition::BottomRight);
    }

    #[test]
    fn cursor_text_position_prefers_below_and_right() {
        assert_eq!(
            text_position_near_cursor((500, 500), rect(0, 0, 1920, 1080), TEXT_CURSOR_SIZE),
            (516, 516)
        );
    }

    #[test]
    fn cursor_text_position_flips_at_screen_edges() {
        assert_eq!(
            text_position_near_cursor((1900, 1070), rect(0, 0, 1920, 1080), TEXT_CURSOR_SIZE),
            (1524, 834)
        );
    }

    #[test]
    fn cursor_text_position_handles_negative_monitor_origin() {
        assert_eq!(
            text_position_near_cursor((-1900, 10), rect(-1920, 0, 1920, 1080), TEXT_CURSOR_SIZE),
            (-1884, 26)
        );
        assert_eq!(
            text_position_near_cursor((-10, 10), rect(-1920, 0, 1920, 1080), TEXT_CURSOR_SIZE),
            (-386, 26)
        );
    }

    #[test]
    fn text_size_grows_with_content_and_caps_at_the_work_area() {
        let work = rect(0, 0, 1920, 1080);
        let short = text_size_for(1.0, 1, false, true, work);
        let medium = text_size_for(1.0, 120, false, true, work);
        let long = text_size_for(1.0, 400, false, false, work);
        assert_eq!(short, (260, 88));
        assert!(medium.0 >= short.0 && medium.1 > short.1);
        assert!(long.0 > short.0 && long.1 > medium.1);
        assert_eq!(text_size_for(1.0, 1, true, true, work).1, short.1 + 92);
        assert_eq!(text_size_cursor(2.0, 1, false, rect(0, 0, 800, 600)), (480, 176));
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
