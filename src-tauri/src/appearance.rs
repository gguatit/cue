use winreg::enums::HKEY_CURRENT_USER;
use winreg::RegKey;

const MIN_LUMINANCE: f64 = 0.45;

fn luminance(r: u8, g: u8, b: u8) -> f64 {
    (0.299 * r as f64 + 0.587 * g as f64 + 0.114 * b as f64) / 255.0
}

fn ensure_light(r: u8, g: u8, b: u8) -> (u8, u8, u8) {
    let lum = luminance(r, g, b);
    if lum >= MIN_LUMINANCE {
        return (r, g, b);
    }
    let t = (MIN_LUMINANCE - lum) / (1.0 - lum);
    let mix = |c: u8| (c as f64 + (255.0 - c as f64) * t).round() as u8;
    (mix(r), mix(g), mix(b))
}

pub fn accent_from_dwm(value: u32) -> String {
    let r = ((value >> 16) & 0xFF) as u8;
    let g = ((value >> 8) & 0xFF) as u8;
    let b = (value & 0xFF) as u8;
    let (r, g, b) = ensure_light(r, g, b);
    format!("#{r:02x}{g:02x}{b:02x}")
}

pub fn system_accent() -> Result<String, String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let key = hkcu
        .open_subkey("Software\\Microsoft\\Windows\\DWM")
        .map_err(|_| "appearance".to_string())?;
    let value: u32 = key
        .get_value("ColorizationColor")
        .map_err(|_| "appearance".to_string())?;
    Ok(accent_from_dwm(value))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_rgb_and_keeps_a_light_accent() {
        assert_eq!(accent_from_dwm(0xFF_FB_BF_24), "#fbbf24");
    }

    #[test]
    fn lightens_a_dark_accent_for_black_text() {
        let accent = accent_from_dwm(0xFF_00_00_00);
        assert!(accent.starts_with('#'));
        let value = u32::from_str_radix(accent.trim_start_matches('#'), 16).unwrap();
        assert!(luminance((value >> 16) as u8, (value >> 8) as u8, value as u8) >= MIN_LUMINANCE);
    }
}
