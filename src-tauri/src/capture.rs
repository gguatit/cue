use ::windows::Win32::Foundation::POINT;
use ::windows::Win32::Graphics::Gdi::{
    BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetDIBits,
    GetMonitorInfoW, MonitorFromPoint, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER,
    BI_RGB, DIB_RGB_COLORS, GDI_ERROR, HGDIOBJ, MONITOR_DEFAULTTONEAREST, MONITORINFO, SRCCOPY,
};
use ::windows::Win32::UI::WindowsAndMessaging::GetCursorPos;
use base64::Engine;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct MonitorRect {
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
}

pub struct Capture {
    pub b64: String,
    pub img_w: u32,
    pub img_h: u32,
    pub cursor_x: i32,
    pub cursor_y: i32,
    pub monitor: MonitorRect,
}

const MAX_EDGE: f64 = 1920.0;
const MAX_CAPTURE_PIXELS: u64 = 40_000_000;

pub fn capture_fits(w: u32, h: u32) -> bool {
    (w as u64).saturating_mul(h as u64) <= MAX_CAPTURE_PIXELS
}

pub const CROP_WIDTH: i32 = 1600;
pub const CROP_HEIGHT: i32 = 1000;

pub fn crop_region(
    monitor: MonitorRect,
    cursor: (i32, i32),
    width: i32,
    height: i32,
) -> MonitorRect {
    let w = width.min(monitor.w).max(1);
    let h = height.min(monitor.h).max(1);
    let max_x = (monitor.x + monitor.w - w).max(monitor.x);
    let max_y = (monitor.y + monitor.h - h).max(monitor.y);
    MonitorRect {
        x: (cursor.0 - width / 2).clamp(monitor.x, max_x),
        y: (cursor.1 - height / 2).clamp(monitor.y, max_y),
        w,
        h,
    }
}

#[cfg(test)]
pub fn encode_capture(
    rgba: Vec<u8>,
    w: u32,
    h: u32,
    cursor: (i32, i32),
    monitor: MonitorRect,
) -> Result<Capture, String> {
    encode_capture_crop(rgba, w, h, cursor, monitor, None)
}

pub fn encode_capture_crop(
    rgba: Vec<u8>,
    w: u32,
    h: u32,
    cursor: (i32, i32),
    monitor: MonitorRect,
    crop: Option<MonitorRect>,
) -> Result<Capture, String> {
    let (rgba, w, h, origin) = match crop {
        Some(c) => {
            let rx = (c.x - monitor.x).clamp(0, w.saturating_sub(1) as i32) as u32;
            let ry = (c.y - monitor.y).clamp(0, h.saturating_sub(1) as i32) as u32;
            let cw = (c.w.max(1) as u32).min(w - rx);
            let ch = (c.h.max(1) as u32).min(h - ry);
            (
                crop_rgba(&rgba, w, rx, ry, cw, ch)?,
                cw,
                ch,
                (monitor.x + rx as i32, monitor.y + ry as i32),
            )
        }
        None => (rgba, w, h, (monitor.x, monitor.y)),
    };
    let img = image::RgbaImage::from_raw(w, h, rgba).ok_or("capture")?;
    let rgb = image::DynamicImage::ImageRgba8(img).to_rgb8();
    let max_edge = w.max(h) as f64;
    let scale = if max_edge > MAX_EDGE { MAX_EDGE / max_edge } else { 1.0 };
    let (iw, ih) = if scale < 1.0 {
        (
            ((w as f64 * scale).round() as u32).max(1),
            ((h as f64 * scale).round() as u32).max(1),
        )
    } else {
        (w, h)
    };
    let rgb = if scale < 1.0 {
        image::imageops::resize(&rgb, iw, ih, image::imageops::FilterType::CatmullRom)
    } else {
        rgb
    };
    let mut jpeg: Vec<u8> = Vec::new();
    image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg, 80)
        .encode_image(&rgb)
        .map_err(|_| "capture")?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&jpeg);
    Ok(Capture {
        b64,
        img_w: iw,
        img_h: ih,
        cursor_x: ((cursor.0 - origin.0) as f64 * scale).round() as i32,
        cursor_y: ((cursor.1 - origin.1) as f64 * scale).round() as i32,
        monitor,
    })
}

fn crop_rgba(src: &[u8], src_w: u32, x: u32, y: u32, w: u32, h: u32) -> Result<Vec<u8>, String> {
    let mut out = Vec::with_capacity((w * h * 4) as usize);
    for row in y..y.saturating_add(h) {
        let start = ((row as usize) * src_w as usize + x as usize) * 4;
        let end = start + w as usize * 4;
        let slice = src.get(start..end).ok_or("capture")?;
        out.extend_from_slice(slice);
    }
    Ok(out)
}

pub fn cursor_monitor() -> Result<((i32, i32), MonitorRect), String> {
    unsafe {
        let mut pt = POINT::default();
        GetCursorPos(&mut pt).map_err(|_| "capture")?;
        let hmon = MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST);
        let mut mi = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        if !GetMonitorInfoW(hmon, &mut mi).as_bool() {
            return Err("capture".into());
        }
        let rc = mi.rcMonitor;
        Ok((
            (pt.x, pt.y),
            MonitorRect {
                x: rc.left,
                y: rc.top,
                w: rc.right - rc.left,
                h: rc.bottom - rc.top,
            },
        ))
    }
}

pub fn resolve_anchor<F>(
    last: Option<(i32, i32, MonitorRect)>,
    fallback: F,
) -> Result<((i32, i32), MonitorRect), String>
where
    F: FnOnce() -> Result<((i32, i32), MonitorRect), String>,
{
    match last {
        Some((cx, cy, mon)) => Ok(((cx, cy), mon)),
        None => fallback(),
    }
}

pub fn raw_capture() -> Result<(Vec<u8>, u32, u32, (i32, i32), MonitorRect), String> {
    let ((cx, cy), mon) = cursor_monitor()?;
    let w = mon.w;
    let h = mon.h;
    if w <= 0 || h <= 0 || !capture_fits(w as u32, h as u32) {
        return Err("capture".into());
    }
    unsafe {
        let screen = GetDC(None);
        if screen.is_invalid() {
            return Err("capture".into());
        }
        let mem = CreateCompatibleDC(Some(screen));
        if mem.is_invalid() {
            ReleaseDC(None, screen);
            return Err("capture".into());
        }
        let bmp = CreateCompatibleBitmap(screen, w, h);
        if bmp.is_invalid() {
            let _ = DeleteDC(mem);
            ReleaseDC(None, screen);
            return Err("capture".into());
        }
        let old = SelectObject(mem, HGDIOBJ(bmp.0));
        let selected = !old.is_invalid();
        let mut copied =
            selected && BitBlt(mem, 0, 0, w, h, Some(screen), mon.x, mon.y, SRCCOPY).is_ok();
        let mut buf = vec![0u8; (w as usize) * (h as usize) * 4];
        if copied {
            let mut bi = BITMAPINFO {
                bmiHeader: BITMAPINFOHEADER {
                    biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                    biWidth: w,
                    biHeight: -h,
                    biPlanes: 1,
                    biBitCount: 32,
                    biCompression: BI_RGB.0,
                    ..Default::default()
                },
                ..Default::default()
            };
            let restored =
                !selected || SelectObject(mem, old).0 as isize != GDI_ERROR as isize;
            if restored {
                let lines = GetDIBits(
                    mem,
                    bmp,
                    0,
                    h as u32,
                    Some(buf.as_mut_ptr() as *mut _),
                    &mut bi,
                    DIB_RGB_COLORS,
                );
                copied = lines == h;
            } else {
                copied = false;
            }
        } else if selected {
            SelectObject(mem, old);
        }
        let _ = DeleteObject(HGDIOBJ(bmp.0));
        let _ = DeleteDC(mem);
        ReleaseDC(None, screen);
        if !copied {
            return Err("capture".into());
        }
        for px in buf.chunks_exact_mut(4) {
            px.swap(0, 2);
        }
        Ok((buf, w as u32, h as u32, (cx, cy), mon))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rect(x: i32, y: i32, w: i32, h: i32) -> MonitorRect {
        MonitorRect { x, y, w, h }
    }

    #[test]
    fn encode_scales_and_maps_cursor() {
        let rgba = vec![128u8; 3840 * 1080 * 4];
        let c = encode_capture(rgba, 3840, 1080, (2000, 500), rect(0, 0, 3840, 1080)).unwrap();
        assert_eq!((c.img_w, c.img_h), (1920, 540));
        assert_eq!((c.cursor_x, c.cursor_y), (1000, 250));
        let raw = base64::engine::general_purpose::STANDARD.decode(&c.b64).unwrap();
        assert_eq!(&raw[..2], &[0xFF, 0xD8], "JPEG SOI");
    }

    #[test]
    fn encode_no_scale_when_small() {
        let rgba = vec![10u8; 800 * 600 * 4];
        let c = encode_capture(rgba, 800, 600, (10, 10), rect(0, 0, 800, 600)).unwrap();
        assert_eq!((c.img_w, c.img_h), (800, 600));
        assert_eq!((c.cursor_x, c.cursor_y), (10, 10));
    }

    #[test]
    fn crop_region_centers_on_cursor() {
        let r = crop_region(rect(0, 0, 2560, 1440), (1280, 720), 1600, 1000);
        assert_eq!(r, rect(480, 220, 1600, 1000));
    }

    #[test]
    fn crop_region_clamps_at_top_left() {
        let r = crop_region(rect(0, 0, 1920, 1080), (10, 20), 1600, 1000);
        assert_eq!(r, rect(0, 0, 1600, 1000));
    }

    #[test]
    fn crop_region_fits_a_small_monitor() {
        let r = crop_region(rect(0, 0, 800, 600), (400, 300), 1600, 1000);
        assert_eq!(r, rect(0, 0, 800, 600));
    }

    #[test]
    fn encode_cropped_capture_maps_cursor_into_crop_space() {
        let rgba = vec![90u8; 2560 * 1440 * 4];
        let mon = rect(0, 0, 2560, 1440);
        let crop = crop_region(mon, (1280, 720), CROP_WIDTH, CROP_HEIGHT);
        let c = encode_capture_crop(rgba, 2560, 1440, (1280, 720), mon, Some(crop)).unwrap();
        assert_eq!((c.img_w, c.img_h), (1600, 1000));
        assert_eq!((c.cursor_x, c.cursor_y), (800, 500));
        assert_eq!(c.monitor, mon);
    }

    #[test]
    fn resolve_anchor_prefers_last_capture() {
        let last = Some((10, 20, rect(0, 0, 1920, 1080)));
        let got = resolve_anchor(last, || Err("fallback called".into())).unwrap();
        assert_eq!(got, ((10, 20), rect(0, 0, 1920, 1080)));
    }

    #[test]
    fn resolve_anchor_falls_back_without_capture() {
        let got = resolve_anchor(None, || Ok(((5, 6), rect(-1920, 0, 1920, 1080)))).unwrap();
        assert_eq!(got, ((5, 6), rect(-1920, 0, 1920, 1080)));
    }

    #[test]
    fn resolve_anchor_propagates_fallback_error() {
        let err = resolve_anchor(None, || Err("capture".into())).unwrap_err();
        assert_eq!(err, "capture");
    }

    #[test]
    fn capture_pixel_limit() {
        assert!(capture_fits(1920, 1080));
        assert!(capture_fits(7680, 4320));
        assert!(!capture_fits(20000, 20000));
    }

    #[test]
    fn crop_rejects_a_short_buffer() {
        assert_eq!(
            crop_rgba(&[0u8; 4], 1, 0, 0, 2, 2).unwrap_err(),
            "capture"
        );
    }
}
