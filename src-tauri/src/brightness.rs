use std::ffi::c_void;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;

use windows::Win32::Devices::Display::{
    DestroyPhysicalMonitors, GetMonitorBrightness, GetPhysicalMonitorsFromHMONITOR,
    SetMonitorBrightness, PHYSICAL_MONITOR,
};
use windows::Win32::Foundation::{HANDLE, POINT};
use windows::Win32::Graphics::Gdi::{
    CreateDCW, DeleteDC, GetDC, GetMonitorInfoW, MonitorFromPoint, ReleaseDC, HDC, MONITORINFOEXW,
    MONITOR_DEFAULTTONEAREST,
};
use windows::Win32::UI::ColorSystem::{GetDeviceGammaRamp, SetDeviceGammaRamp};
use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

static BUSY: AtomicBool = AtomicBool::new(false);

const DIM_MS: u64 = 250;
const BRIGHT_MS: u64 = 250;
const GAP_MS: u64 = 300;
const DIM_GAMMA: f64 = 2.0;

/// Builds a dimming gamma ramp. Windows rejects ramps whose highest value is
/// below 65535, so dim the midtones and keep the endpoints intact.
fn dim_ramp() -> [u16; 768] {
    let mut ramp = [0u16; 768];
    for channel in 0..3 {
        for i in 0..256 {
            let v = (i as f64 / 255.0).powf(DIM_GAMMA) * 65535.0;
            ramp[channel * 256 + i] = v.round() as u16;
        }
    }
    ramp
}

fn restore_value(read_ok: bool, current: u32) -> Option<u32> {
    read_ok.then_some(current)
}

/// Dims the monitor under the pointer through DDC/CI. Returns Err when the
/// monitor does not expose brightness control, so the gamma fallback can run.
fn hardware_cycle(count: u32) -> Result<(), String> {
    unsafe {
        let mut point = POINT::default();
        GetCursorPos(&mut point).map_err(|_| "brightness".to_string())?;
        let monitor = MonitorFromPoint(point, MONITOR_DEFAULTTONEAREST);
        if monitor.is_invalid() {
            return Err("brightness".into());
        }
        let mut monitors = [PHYSICAL_MONITOR {
            hPhysicalMonitor: HANDLE::default(),
            szPhysicalMonitorDescription: [0; 128],
        }; 1];
        GetPhysicalMonitorsFromHMONITOR(monitor, &mut monitors)
            .map_err(|_| "brightness".to_string())?;
        let handle = monitors[0].hPhysicalMonitor;
        let mut min = 0u32;
        let mut current = 0u32;
        let mut max = 0u32;
        let mut read_ok = false;
        let result = (|| -> Result<(), String> {
            if GetMonitorBrightness(handle, &mut min, &mut current, &mut max) == 0 {
                return Err("brightness".into());
            }
            read_ok = true;
            if max <= min || current <= min {
                return Err("brightness".into());
            }
            let dim = (min + (max - min) / 6).min(current - 1);
            for i in 0..count {
                if SetMonitorBrightness(handle, dim) == 0 {
                    return Err("brightness".into());
                }
                thread::sleep(Duration::from_millis(DIM_MS));
                if SetMonitorBrightness(handle, current) == 0 {
                    return Err("brightness".into());
                }
                thread::sleep(Duration::from_millis(BRIGHT_MS));
                if i + 1 < count {
                    thread::sleep(Duration::from_millis(GAP_MS));
                }
            }
            Ok(())
        })();
        if let Some(value) = restore_value(read_ok, current) {
            let _ = SetMonitorBrightness(handle, value);
        }
        let _ = DestroyPhysicalMonitors(&monitors);
        result
    }
}

fn monitor_dc() -> Option<HDC> {
    unsafe {
        let mut point = POINT::default();
        if GetCursorPos(&mut point).is_err() {
            return None;
        }
        let monitor = MonitorFromPoint(point, MONITOR_DEFAULTTONEAREST);
        if monitor.is_invalid() {
            return None;
        }
        let mut info = MONITORINFOEXW::default();
        info.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;
        if !GetMonitorInfoW(monitor, &mut info.monitorInfo).as_bool() {
            return None;
        }
        let hdc = CreateDCW(
            windows::core::w!("DISPLAY"),
            windows::core::PCWSTR(info.szDevice.as_ptr()),
            windows::core::PCWSTR::null(),
            None,
        );
        (!hdc.is_invalid()).then_some(hdc)
    }
}

fn gamma_cycle_on(hdc: HDC, count: u32) -> Result<(), String> {
    unsafe {
        let mut original = [0u16; 768];
        if !GetDeviceGammaRamp(hdc, original.as_mut_ptr().cast::<c_void>()).as_bool() {
            return Err("brightness".into());
        }
        let dimmed = dim_ramp();
        let result = (|| -> Result<(), String> {
            for i in 0..count {
                if !SetDeviceGammaRamp(hdc, dimmed.as_ptr().cast::<c_void>()).as_bool() {
                    return Err("brightness".into());
                }
                thread::sleep(Duration::from_millis(DIM_MS));
                if !SetDeviceGammaRamp(hdc, original.as_ptr().cast::<c_void>()).as_bool() {
                    return Err("brightness".into());
                }
                thread::sleep(Duration::from_millis(BRIGHT_MS));
                if i + 1 < count {
                    thread::sleep(Duration::from_millis(GAP_MS));
                }
            }
            Ok(())
        })();
        let _ = SetDeviceGammaRamp(hdc, original.as_ptr().cast::<c_void>());
        result
    }
}

/// Dims the display under the pointer when its device context is available,
/// then falls back to the primary display's context.
fn gamma_cycle(count: u32) -> Result<(), String> {
    if let Some(hdc) = monitor_dc() {
        let result = gamma_cycle_on(hdc, count);
        unsafe {
            let _ = DeleteDC(hdc);
        }
        if result.is_ok() {
            return result;
        }
    }
    unsafe {
        let hdc = GetDC(None);
        if hdc.is_invalid() {
            return Err("brightness".into());
        }
        let result = gamma_cycle_on(hdc, count);
        ReleaseDC(None, hdc);
        result
    }
}

/// Dims and restores the display `count` times. Hardware brightness is tried
/// first; gamma dimming is the fallback for panels without DDC/CI control.
pub fn blink(count: u32) -> Result<(), String> {
    if count == 0 || count > 9 {
        return Ok(());
    }
    if BUSY.swap(true, Ordering::SeqCst) {
        return Ok(());
    }
    let _guard = BusyGuard;
    hardware_cycle(count).or_else(|_| gamma_cycle(count))
}

struct BusyGuard;

impl Drop for BusyGuard {
    fn drop(&mut self) {
        BUSY.store(false, Ordering::SeqCst);
    }
}

#[cfg(test)]
mod tests {
    use super::{dim_ramp, restore_value};

    #[test]
    fn brightness_is_not_restored_after_a_failed_read() {
        assert_eq!(restore_value(false, 0), None);
        assert_eq!(restore_value(true, 40), Some(40));
    }

    #[test]
    fn dim_ramp_keeps_the_windows_endpoints() {
        let ramp = dim_ramp();
        for channel in 0..3 {
            assert_eq!(ramp[channel * 256], 0);
            assert_eq!(ramp[channel * 256 + 255], 65535);
            assert!(ramp[channel * 256 + 128] < 65535);
        }
    }

    #[test]
    fn dim_ramp_is_monotonic_per_channel() {
        let ramp = dim_ramp();
        for channel in 0..3 {
            for i in 1..256 {
                assert!(ramp[channel * 256 + i] >= ramp[channel * 256 + i - 1]);
            }
        }
    }
}
