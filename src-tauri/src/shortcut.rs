use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU8, Ordering};
use std::sync::{Mutex, OnceLock};

use tauri::{AppHandle, Emitter};
use windows::core::Error;
use windows::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, HHOOK, KBDLLHOOKSTRUCT, SetWindowsHookExW, WH_KEYBOARD_LL, WM_KEYDOWN,
    WM_KEYUP, WM_SYSKEYDOWN, WM_SYSKEYUP,
};

pub const MOD_CTRL: u8 = 1;
pub const MOD_ALT: u8 = 2;
pub const MOD_SHIFT: u8 = 4;
pub const MOD_SUPER: u8 = 8;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ShortcutSpec {
    pub mods: u8,
    pub key: Option<u32>,
}

impl ShortcutSpec {
    pub fn parse(accel: &str) -> Result<Self, String> {
        let mut mods = 0u8;
        let mut key: Option<u32> = None;
        for part in accel.split('+') {
            match part.trim().to_ascii_lowercase().as_str() {
                "control" | "ctrl" => mods |= MOD_CTRL,
                "alt" => mods |= MOD_ALT,
                "shift" => mods |= MOD_SHIFT,
                "super" | "meta" | "win" => mods |= MOD_SUPER,
                other => {
                    if key.is_some() {
                        return Err("shortcut".into());
                    }
                    key = Some(parse_key(other)?);
                }
            }
        }
        if key.is_none() && mods.count_ones() < 2 {
            return Err("shortcut".into());
        }
        if key.is_some() && mods == 0 {
            return Err("shortcut".into());
        }
        Ok(ShortcutSpec { mods, key })
    }
}

fn parse_key(s: &str) -> Result<u32, String> {
    let mut chars = s.chars();
    if let (Some(c), None) = (chars.next(), chars.next()) {
        if c.is_ascii_alphanumeric() {
            return Ok(c.to_ascii_uppercase() as u32);
        }
    }
    if let Some(n) = s.strip_prefix('f').and_then(|n| n.parse::<u32>().ok()) {
        if (1..=12).contains(&n) {
            return Ok(0x70 + n - 1);
        }
    }
    Err("shortcut".into())
}

pub struct HookCtx {
    pub app: AppHandle,
    pub spec: Mutex<Option<ShortcutSpec>>,
    pub panic: Mutex<Option<ShortcutSpec>>,
    pub settings: Mutex<()>,
    pub recording: AtomicBool,
    pub hook_installed: AtomicBool,
}

static CTX: OnceLock<HookCtx> = OnceLock::new();
static MODS: AtomicU8 = AtomicU8::new(0);
static MODS_LATCH: AtomicBool = AtomicBool::new(false);
static KEY_LATCH: AtomicBool = AtomicBool::new(false);
static PANIC_MODS_LATCH: AtomicBool = AtomicBool::new(false);
static PANIC_KEY_LATCH: AtomicBool = AtomicBool::new(false);
// vkCode whose down/up events are consumed so the hotkey never reaches the foreground app.
static SUPPRESS: AtomicU32 = AtomicU32::new(0);

pub fn install(app: &AppHandle, spec: ShortcutSpec) {
    let ctx = CTX.get_or_init(|| HookCtx {
        app: app.clone(),
        spec: Mutex::new(None),
        panic: Mutex::new(None),
        settings: Mutex::new(()),
        recording: AtomicBool::new(false),
        hook_installed: AtomicBool::new(false),
    });
    if let Ok(mut g) = ctx.spec.lock() {
        *g = Some(spec);
    }
    let hmod = unsafe { GetModuleHandleW(None) }.ok().map(Into::into);
    let hook = unsafe { SetWindowsHookExW(WH_KEYBOARD_LL, Some(hook_proc), hmod, 0) };
    ctx.hook_installed
        .store(hook_install_ok(&hook), Ordering::Relaxed);
}

fn hook_install_ok(result: &Result<HHOOK, Error>) -> bool {
    result.is_ok()
}

pub fn set_spec(accel: &str) -> Result<(), String> {
    let spec = ShortcutSpec::parse(accel)?;
    let ctx = CTX.get().ok_or("shortcut")?;
    let _settings = ctx.settings.lock().map_err(|_| "shortcut")?;
    if let Ok(panic) = ctx.panic.lock() {
        if *panic == Some(spec) {
            return Err("shortcut".into());
        }
    }
    let mut g = ctx.spec.lock().map_err(|_| "shortcut")?;
    *g = Some(spec);
    Ok(())
}

pub fn set_panic_spec(accel: &str) -> Result<(), String> {
    let spec = ShortcutSpec::parse(accel)?;
    let ctx = CTX.get().ok_or("shortcut")?;
    let _settings = ctx.settings.lock().map_err(|_| "shortcut")?;
    if let Ok(answer) = ctx.spec.lock() {
        if *answer == Some(spec) {
            return Err("shortcut".into());
        }
    }
    let mut g = ctx.panic.lock().map_err(|_| "shortcut")?;
    *g = Some(spec);
    Ok(())
}

pub fn set_recording(recording: bool) {
    if let Some(ctx) = CTX.get() {
        ctx.recording.store(recording, Ordering::Relaxed);
        if recording {
            // Keys held before/while recording would otherwise leave stale latches behind.
            MODS.store(0, Ordering::Relaxed);
            MODS_LATCH.store(false, Ordering::Relaxed);
            KEY_LATCH.store(false, Ordering::Relaxed);
            PANIC_MODS_LATCH.store(false, Ordering::Relaxed);
            PANIC_KEY_LATCH.store(false, Ordering::Relaxed);
            SUPPRESS.store(0, Ordering::Relaxed);
        }
    }
}

pub fn installed() -> bool {
    CTX.get()
        .map_or(false, |c| c.hook_installed.load(Ordering::Relaxed))
}

fn group_of(vk: u32) -> u8 {
    match vk {
        0xA2 | 0xA3 => MOD_CTRL,
        0xA4 | 0xA5 => MOD_ALT,
        0xA0 | 0xA1 => MOD_SHIFT,
        0x5B | 0x5C => MOD_SUPER,
        _ => 0,
    }
}

fn mods_from(ctrl: bool, alt: bool, shift: bool, win: bool) -> u8 {
    (ctrl as u8) | ((alt as u8) << 1) | ((shift as u8) << 2) | ((win as u8) << 3)
}

fn current_mods() -> u8 {
    use ::windows::Win32::UI::Input::KeyboardAndMouse::{
        GetAsyncKeyState, VK_CONTROL, VK_LWIN, VK_MENU, VK_RWIN, VK_SHIFT,
    };
    unsafe {
        let down = |vk: i32| (GetAsyncKeyState(vk) as u16 & 0x8000) != 0;
        mods_from(
            down(VK_CONTROL.0 as i32),
            down(VK_MENU.0 as i32),
            down(VK_SHIFT.0 as i32),
            down(VK_LWIN.0 as i32) || down(VK_RWIN.0 as i32),
        )
    }
}

unsafe extern "system" fn hook_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code >= 0 {
        if let Some(ctx) = CTX.get() {
            if !ctx.recording.load(Ordering::Relaxed) {
                let kb = unsafe { &*(lparam.0 as *const KBDLLHOOKSTRUCT) };
                let msg = wparam.0 as u32;
                let down = msg == WM_KEYDOWN || msg == WM_SYSKEYDOWN;
                let up = msg == WM_KEYUP || msg == WM_SYSKEYUP;
                let group = group_of(kb.vkCode);
                // 다른 모디파이어의 실제 상태를 다시 읽고, 이번 이벤트의 키만
                // down/up으로 보정한다. 키업을 놓쳐도 고정되지 않는다.
                let mut mods = current_mods();
                if group != 0 {
                    if down {
                        mods |= group;
                    } else if up {
                        mods &= !group;
                    }
                }
                MODS.store(mods, Ordering::Relaxed);
                if down || up {
                    let mut fired = false;
                    if let Ok(guard) = ctx.panic.try_lock() {
                        if let Some(spec) = *guard {
                            if check_spec(
                                spec,
                                kb,
                                group,
                                down,
                                up,
                                &PANIC_MODS_LATCH,
                                &PANIC_KEY_LATCH,
                            ) {
                                fire_panic(ctx);
                                fired = true;
                            }
                        }
                    }
                    if !fired {
                        if let Ok(guard) = ctx.spec.try_lock() {
                            if let Some(spec) = *guard {
                                if check_spec(spec, kb, group, down, up, &MODS_LATCH, &KEY_LATCH) {
                                    fire(ctx);
                                }
                            }
                        }
                    }
                }
                let suppressed = SUPPRESS.load(Ordering::Relaxed);
                if suppressed != 0 && suppressed == kb.vkCode {
                    if up {
                        SUPPRESS.store(0, Ordering::Relaxed);
                    }
                    return LRESULT(1);
                }
            }
        }
    }
    unsafe { CallNextHookEx(None, code, wparam, lparam) }
}

fn check_spec(
    spec: ShortcutSpec,
    kb: &KBDLLHOOKSTRUCT,
    group: u8,
    down: bool,
    up: bool,
    mods_latch: &AtomicBool,
    key_latch: &AtomicBool,
) -> bool {
    match spec.key {
        None => {
            let m = MODS.load(Ordering::Relaxed);
            if group != 0 && down && m == spec.mods && !mods_latch.swap(true, Ordering::Relaxed) {
                SUPPRESS.store(kb.vkCode, Ordering::Relaxed);
                return true;
            }
            if m != spec.mods {
                mods_latch.store(false, Ordering::Relaxed);
            }
            false
        }
        Some(vk) => {
            if down && kb.vkCode == vk {
                if MODS.load(Ordering::Relaxed) == spec.mods
                    && !key_latch.swap(true, Ordering::Relaxed)
                {
                    SUPPRESS.store(kb.vkCode, Ordering::Relaxed);
                    return true;
                }
            } else if up && kb.vkCode == vk {
                key_latch.store(false, Ordering::Relaxed);
            }
            false
        }
    }
}

fn fire(ctx: &HookCtx) {
    let sample = crate::windows::pointer_over_main(&ctx.app);
    let _ = ctx.app.emit("trigger-answer", serde_json::json!({ "sample": sample }));
}

fn fire_panic(ctx: &HookCtx) {
    let _ = ctx.app.emit("panic", ());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_modifier_only() {
        let s = ShortcutSpec::parse("Control+Alt+Super").unwrap();
        assert_eq!(s.mods, MOD_CTRL | MOD_ALT | MOD_SUPER);
        assert!(s.key.is_none());
    }

    #[test]
    fn parse_keyed() {
        let s = ShortcutSpec::parse("Ctrl+Shift+A").unwrap();
        assert_eq!(s.mods, MOD_CTRL | MOD_SHIFT);
        assert_eq!(s.key, Some(65));
    }

    #[test]
    fn parse_panic_shortcut() {
        let s = ShortcutSpec::parse("Control+Alt+Shift+X").unwrap();
        assert_eq!(s.mods, MOD_CTRL | MOD_ALT | MOD_SHIFT);
        assert_eq!(s.key, Some(88));
    }

    #[test]
    fn parse_function_key() {
        assert_eq!(ShortcutSpec::parse("Alt+F4").unwrap().key, Some(0x73));
    }

    #[test]
    fn reject_single_modifier() {
        assert!(ShortcutSpec::parse("Control").is_err());
    }

    #[test]
    fn reject_no_modifier() {
        assert!(ShortcutSpec::parse("A").is_err());
    }

    #[test]
    fn reject_unknown_key() {
        assert!(ShortcutSpec::parse("Control+Hype").is_err());
    }

    #[test]
    fn modifiers_are_recomputed_from_key_state() {
        assert_eq!(mods_from(false, false, false, false), 0);
        assert_eq!(mods_from(true, false, false, false), 1);
        assert_eq!(mods_from(true, true, true, true), 15);
    }

    #[test]
    fn install_flag_reflects_hook_result() {
        assert!(hook_install_ok(&Ok(HHOOK::default())));
        assert!(!hook_install_ok(&Err(Error::from_hresult(
            windows::core::HRESULT(-1)
        ))));
    }
}
