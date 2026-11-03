use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU8, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::Instant;

use tauri::{AppHandle, Emitter};
use windows::core::Error;
use windows::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, HHOOK, KBDLLHOOKSTRUCT, MSLLHOOKSTRUCT, SetWindowsHookExW, WH_KEYBOARD_LL,
    WH_MOUSE_LL, WM_KEYDOWN, WM_KEYUP, WM_LBUTTONDOWN, WM_LBUTTONUP, WM_MBUTTONDOWN,
    WM_MBUTTONUP, WM_MOUSEMOVE, WM_RBUTTONDOWN, WM_RBUTTONUP, WM_SYSKEYDOWN, WM_SYSKEYUP,
};

pub const MOD_CTRL: u8 = 1;
pub const MOD_ALT: u8 = 2;
pub const MOD_SHIFT: u8 = 4;
pub const MOD_SUPER: u8 = 8;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum MouseButton {
    Left,
    Right,
    Middle,
}

impl MouseButton {
    fn parse(value: &str) -> Result<Self, String> {
        match value {
            "left" => Ok(Self::Left),
            "right" => Ok(Self::Right),
            "middle" => Ok(Self::Middle),
            _ => Err("shortcut".into()),
        }
    }

    fn code(self) -> u8 {
        match self {
            Self::Left => 1,
            Self::Right => 2,
            Self::Middle => 3,
        }
    }

    fn from_code(code: u8) -> Option<Self> {
        match code {
            1 => Some(Self::Left),
            2 => Some(Self::Right),
            3 => Some(Self::Middle),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MouseTriggerMode {
    Off,
    Hold,
    Shake,
}

impl MouseTriggerMode {
    fn parse(value: &str) -> Result<Self, String> {
        match value {
            "off" => Ok(Self::Off),
            "hold" => Ok(Self::Hold),
            "shake" => Ok(Self::Shake),
            _ => Err("gesture".into()),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct MouseTriggerConfig {
    pub mode: MouseTriggerMode,
    pub hold_ms: u64,
    pub move_tolerance: i32,
    pub shake_reversals: u8,
    pub shake_window_ms: u64,
    pub shake_min_delta: i32,
    pub shake_cooldown_ms: u64,
    pub hold_cooldown_ms: u64,
}

impl Default for MouseTriggerConfig {
    fn default() -> Self {
        Self {
            mode: MouseTriggerMode::Off,
            hold_ms: 800,
            move_tolerance: 8,
            shake_reversals: 4,
            shake_window_ms: 900,
            shake_min_delta: 12,
            shake_cooldown_ms: 600,
            hold_cooldown_ms: 800,
        }
    }
}

impl MouseTriggerConfig {
    pub fn new(
        mode: &str,
        hold_ms: u64,
        move_tolerance: i32,
        shake_reversals: u8,
        shake_window_ms: u64,
        shake_min_delta: i32,
        shake_cooldown_ms: u64,
        hold_cooldown_ms: u64,
    ) -> Result<Self, String> {
        Ok(Self {
            mode: MouseTriggerMode::parse(mode)?,
            hold_ms: hold_ms.clamp(200, 3000),
            move_tolerance: move_tolerance.clamp(1, 50),
            shake_reversals: shake_reversals.clamp(2, 10),
            shake_window_ms: shake_window_ms.clamp(200, 3000),
            shake_min_delta: shake_min_delta.clamp(2, 50),
            shake_cooldown_ms: shake_cooldown_ms.min(5000),
            hold_cooldown_ms: hold_cooldown_ms.min(5000),
        })
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum GestureSignal {
    HoldStart,
    HoldCancel,
    HoldTrigger,
    ShakeProgress { reversals: u8, required: u8 },
    ShakeTrigger { reversals: u8 },
}

#[derive(Default)]
struct GestureDetector {
    hold_started: Option<u64>,
    hold_pos: (i32, i32),
    hold_cancelled: bool,
    last_hold_trigger: Option<u64>,
    shake_last_x: Option<i32>,
    shake_dir: i8,
    shake_count: u8,
    shake_last_reversal: Option<u64>,
    last_shake_trigger: Option<u64>,
}

impl GestureDetector {
    fn new() -> Self {
        Self::default()
    }

    fn reset(&mut self) {
        *self = Self::default();
    }

    fn on_down(
        &mut self,
        now_ms: u64,
        pos: (i32, i32),
        cfg: &MouseTriggerConfig,
    ) -> Option<GestureSignal> {
        if cfg.mode != MouseTriggerMode::Hold || self.hold_started.is_some() {
            return None;
        }
        if let Some(last) = self.last_hold_trigger {
            if now_ms < last.saturating_add(cfg.hold_cooldown_ms) {
                return None;
            }
        }
        self.hold_started = Some(now_ms);
        self.hold_pos = pos;
        self.hold_cancelled = false;
        Some(GestureSignal::HoldStart)
    }

    fn on_move(
        &mut self,
        now_ms: u64,
        pos: (i32, i32),
        cfg: &MouseTriggerConfig,
    ) -> Option<GestureSignal> {
        match cfg.mode {
            MouseTriggerMode::Hold => {
                let Some(_) = self.hold_started else {
                    return None;
                };
                if self.hold_cancelled {
                    return None;
                }
                let dx = (pos.0 - self.hold_pos.0).abs();
                let dy = (pos.1 - self.hold_pos.1).abs();
                if dx.max(dy) > cfg.move_tolerance {
                    self.hold_cancelled = true;
                    return Some(GestureSignal::HoldCancel);
                }
                None
            }
            MouseTriggerMode::Shake => self.shake_move(now_ms, pos, cfg),
            MouseTriggerMode::Off => None,
        }
    }

    fn on_up(
        &mut self,
        now_ms: u64,
        _pos: (i32, i32),
        cfg: &MouseTriggerConfig,
    ) -> Option<GestureSignal> {
        if cfg.mode != MouseTriggerMode::Hold {
            return None;
        }
        let Some(start) = self.hold_started.take() else {
            return None;
        };
        let cancelled = self.hold_cancelled;
        self.hold_cancelled = false;
        if cancelled {
            return None;
        }
        if now_ms.saturating_sub(start) >= cfg.hold_ms
            && self
                .last_hold_trigger
                .map_or(true, |last| now_ms >= last.saturating_add(cfg.hold_cooldown_ms))
        {
            self.last_hold_trigger = Some(now_ms);
            Some(GestureSignal::HoldTrigger)
        } else {
            Some(GestureSignal::HoldCancel)
        }
    }

    fn shake_move(
        &mut self,
        now_ms: u64,
        pos: (i32, i32),
        cfg: &MouseTriggerConfig,
    ) -> Option<GestureSignal> {
        if let Some(last) = self.last_shake_trigger {
            if now_ms < last.saturating_add(cfg.shake_cooldown_ms) {
                return None;
            }
        }
        let Some(last_x) = self.shake_last_x else {
            self.shake_last_x = Some(pos.0);
            return None;
        };
        let dx = pos.0 - last_x;
        if dx.abs() < cfg.shake_min_delta {
            return None;
        }
        self.shake_last_x = Some(pos.0);
        let dir = if dx > 0 { 1 } else { -1 };
        if self.shake_dir == 0 {
            self.shake_dir = dir;
            self.shake_last_reversal = Some(now_ms);
            return None;
        }
        if dir == self.shake_dir {
            return None;
        }
        let count = match self.shake_last_reversal {
            Some(last) if now_ms.saturating_sub(last) <= cfg.shake_window_ms => {
                self.shake_count.saturating_add(1)
            }
            _ => 1,
        };
        self.shake_count = count;
        self.shake_dir = dir;
        self.shake_last_reversal = Some(now_ms);
        if count >= cfg.shake_reversals {
            self.shake_last_x = Some(pos.0);
            self.shake_dir = 0;
            self.shake_count = 0;
            self.shake_last_reversal = None;
            self.last_shake_trigger = Some(now_ms);
            Some(GestureSignal::ShakeTrigger { reversals: count })
        } else {
            Some(GestureSignal::ShakeProgress {
                reversals: count,
                required: cfg.shake_reversals,
            })
        }
    }
}

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

fn conflicts(answer: ShortcutSpec, click: bool, panic: ShortcutSpec) -> bool {
    if answer == panic {
        return true;
    }
    if click {
        return panic.key.is_none() && (panic.mods & answer.mods) == panic.mods;
    }
    match (answer.key, panic.key) {
        (None, None) => {
            (answer.mods & panic.mods) == answer.mods
                || (panic.mods & answer.mods) == panic.mods
        }
        (None, Some(_)) => (answer.mods & panic.mods) == answer.mods,
        (Some(_), None) => (panic.mods & answer.mods) == panic.mods,
        (Some(_), Some(_)) => false,
    }
}

#[derive(Default)]
struct MouseRuntime {
    config: MouseTriggerConfig,
    detector: GestureDetector,
}

pub struct HookCtx {
    pub app: AppHandle,
    pub spec: Mutex<Option<ShortcutSpec>>,
    pub panic: Mutex<Option<ShortcutSpec>>,
    pub settings: Mutex<()>,
    pub recording: AtomicBool,
    pub hook_installed: AtomicBool,
    pub answer_click: AtomicBool,
    pub answer_button: AtomicU8,
    pub free_enabled: AtomicBool,
    pub free_button: AtomicU8,
    pub prewarm_enabled: AtomicBool,
    pub mouse_hook_installed: AtomicBool,
    mouse: Mutex<MouseRuntime>,
    gesture_test: AtomicBool,
    started: Instant,
}

static CTX: OnceLock<HookCtx> = OnceLock::new();
static MODS: AtomicU8 = AtomicU8::new(0);
static MODS_LATCH: AtomicBool = AtomicBool::new(false);
static KEY_LATCH: AtomicBool = AtomicBool::new(false);
static PANIC_MODS_LATCH: AtomicBool = AtomicBool::new(false);
static PANIC_KEY_LATCH: AtomicBool = AtomicBool::new(false);
// vkCode whose down/up events are consumed so the hotkey never reaches the foreground app.
static SUPPRESS: AtomicU32 = AtomicU32::new(0);
static MOUSE_LATCH: AtomicBool = AtomicBool::new(false);
static MOUSE_SUPPRESS: AtomicU8 = AtomicU8::new(0);
static PREWARM_LATCH: AtomicBool = AtomicBool::new(false);

pub fn install(app: &AppHandle, spec: ShortcutSpec) {
    let ctx = CTX.get_or_init(|| HookCtx {
        app: app.clone(),
        spec: Mutex::new(None),
        panic: Mutex::new(None),
        settings: Mutex::new(()),
        recording: AtomicBool::new(false),
        hook_installed: AtomicBool::new(false),
        answer_click: AtomicBool::new(false),
        answer_button: AtomicU8::new(MouseButton::Left.code()),
        free_enabled: AtomicBool::new(false),
        free_button: AtomicU8::new(MouseButton::Right.code()),
        prewarm_enabled: AtomicBool::new(false),
        mouse_hook_installed: AtomicBool::new(false),
        mouse: Mutex::new(MouseRuntime::default()),
        gesture_test: AtomicBool::new(false),
        started: Instant::now(),
    });
    if let Ok(mut g) = ctx.spec.lock() {
        *g = Some(spec);
    }
    let hmod = unsafe { GetModuleHandleW(None) }.ok().map(Into::into);
    let hook = unsafe { SetWindowsHookExW(WH_KEYBOARD_LL, Some(hook_proc), hmod, 0) };
    ctx.hook_installed
        .store(hook_install_ok(&hook), Ordering::Relaxed);
    ensure_mouse_hook(ctx);
}

fn ensure_mouse_hook(ctx: &HookCtx) -> bool {
    if ctx.mouse_hook_installed.load(Ordering::Relaxed) {
        return true;
    }
    let hmod = unsafe { GetModuleHandleW(None) }.ok().map(Into::into);
    let hook = unsafe { SetWindowsHookExW(WH_MOUSE_LL, Some(mouse_hook_proc), hmod, 0) };
    let ok = hook_install_ok(&hook);
    ctx.mouse_hook_installed.store(ok, Ordering::Relaxed);
    ok
}

fn hook_install_ok(result: &Result<HHOOK, Error>) -> bool {
    result.is_ok()
}

pub fn set_spec(accel: &str, click: bool, button: &str) -> Result<(), String> {
    let spec = ShortcutSpec::parse(accel)?;
    let button = MouseButton::parse(button)?;
    if click && spec.key.is_some() {
        return Err("shortcut".into());
    }
    let ctx = CTX.get().ok_or("shortcut")?;
    let _settings = ctx.settings.lock().map_err(|_| "shortcut")?;
    if let Ok(panic) = ctx.panic.lock() {
        if let Some(panic) = *panic {
            if conflicts(spec, click, panic) {
                return Err("shortcut".into());
            }
        }
    }
    if click && !ensure_mouse_hook(ctx) {
        return Err("shortcut".into());
    }
    let mut g = ctx.spec.lock().map_err(|_| "shortcut")?;
    *g = Some(spec);
    PREWARM_LATCH.store(false, Ordering::Relaxed);
    reset_gesture(ctx);
    ctx.answer_click.store(click, Ordering::Relaxed);
    ctx.answer_button.store(button.code(), Ordering::Relaxed);
    let free_button = MouseButton::from_code(ctx.free_button.load(Ordering::Relaxed))
        .unwrap_or(MouseButton::Right);
    if ctx.free_enabled.load(Ordering::Relaxed)
        && !can_enable_free(spec, click, button, free_button)
    {
        ctx.free_enabled.store(false, Ordering::Relaxed);
    }
    Ok(())
}

pub fn set_prewarm(enabled: bool) -> Result<(), String> {
    let ctx = CTX.get().ok_or("shortcut")?;
    ctx.prewarm_enabled.store(enabled, Ordering::Relaxed);
    Ok(())
}

pub fn set_mouse_trigger(config: MouseTriggerConfig) -> Result<(), String> {
    let ctx = CTX.get().ok_or("shortcut")?;
    let _settings = ctx.settings.lock().map_err(|_| "shortcut")?;
    if config.mode != MouseTriggerMode::Off && !ensure_mouse_hook(ctx) {
        return Err("gesture".into());
    }
    let mut runtime = ctx.mouse.lock().map_err(|_| "shortcut")?;
    runtime.config = config;
    runtime.detector.reset();
    Ok(())
}

pub fn set_gesture_test(enabled: bool) {
    if let Some(ctx) = CTX.get() {
        ctx.gesture_test.store(enabled, Ordering::Relaxed);
        reset_gesture(ctx);
    }
}

fn reset_gesture(ctx: &HookCtx) {
    if let Ok(mut runtime) = ctx.mouse.lock() {
        runtime.detector.reset();
    }
}

pub fn set_free(enabled: bool, button: &str) -> Result<(), String> {
    let button = MouseButton::parse(button)?;
    let ctx = CTX.get().ok_or("shortcut")?;
    let _settings = ctx.settings.lock().map_err(|_| "shortcut")?;
    if enabled {
        let spec = ctx
            .spec
            .lock()
            .map_err(|_| "shortcut")?
            .as_ref()
            .copied()
            .ok_or("shortcut")?;
        let answer_button = MouseButton::from_code(ctx.answer_button.load(Ordering::Relaxed))
            .unwrap_or(MouseButton::Left);
        if !can_enable_free(
            spec,
            ctx.answer_click.load(Ordering::Relaxed),
            answer_button,
            button,
        ) {
            return Err("shortcut".into());
        }
        if !ensure_mouse_hook(ctx) {
            return Err("shortcut".into());
        }
    }
    ctx.free_enabled.store(enabled, Ordering::Relaxed);
    ctx.free_button.store(button.code(), Ordering::Relaxed);
    Ok(())
}

pub fn set_panic_spec(accel: &str) -> Result<(), String> {
    let spec = ShortcutSpec::parse(accel)?;
    let ctx = CTX.get().ok_or("shortcut")?;
    let _settings = ctx.settings.lock().map_err(|_| "shortcut")?;
    if let Ok(answer) = ctx.spec.lock() {
        if let Some(answer) = *answer {
            if conflicts(answer, ctx.answer_click.load(Ordering::Relaxed), spec) {
                return Err("shortcut".into());
            }
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
            MOUSE_LATCH.store(false, Ordering::Relaxed);
            MOUSE_SUPPRESS.store(0, Ordering::Relaxed);
            PREWARM_LATCH.store(false, Ordering::Relaxed);
            reset_gesture(ctx);
        }
    }
}

pub fn installed() -> bool {
    CTX.get().map_or(false, |c| {
        let mouse_trigger = c
            .mouse
            .lock()
            .map_or(false, |runtime| runtime.config.mode != MouseTriggerMode::Off);
        let needs_mouse = c.answer_click.load(Ordering::Relaxed)
            || c.free_enabled.load(Ordering::Relaxed)
            || mouse_trigger;
        c.hook_installed.load(Ordering::Relaxed)
            && (!needs_mouse || c.mouse_hook_installed.load(Ordering::Relaxed))
    })
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
                    if !fired && ctx.answer_click.load(Ordering::Relaxed) {
                        if let Ok(guard) = ctx.spec.try_lock() {
                            if let Some(spec) = *guard {
                                if should_prewarm(
                                    spec,
                                    true,
                                    ctx.prewarm_enabled.load(Ordering::Relaxed),
                                    mods,
                                    down,
                                ) {
                                    if !PREWARM_LATCH.swap(true, Ordering::Relaxed) {
                                        prewarm_overlay(ctx);
                                    }
                                } else if mods != spec.mods {
                                    PREWARM_LATCH.store(false, Ordering::Relaxed);
                                }
                            }
                        }
                    }
                    if !fired && !ctx.answer_click.load(Ordering::Relaxed) {
                        if let Ok(guard) = ctx.spec.try_lock() {
                            if let Some(spec) = *guard {
                                if check_spec(spec, kb, group, down, up, &MODS_LATCH, &KEY_LATCH) {
                                    fire(ctx, false);
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

fn mouse_button(message: u32) -> Option<(MouseButton, bool)> {
    match message {
        WM_LBUTTONDOWN => Some((MouseButton::Left, true)),
        WM_LBUTTONUP => Some((MouseButton::Left, false)),
        WM_RBUTTONDOWN => Some((MouseButton::Right, true)),
        WM_RBUTTONUP => Some((MouseButton::Right, false)),
        WM_MBUTTONDOWN => Some((MouseButton::Middle, true)),
        WM_MBUTTONUP => Some((MouseButton::Middle, false)),
        _ => None,
    }
}

fn can_enable_free(
    spec: ShortcutSpec,
    click: bool,
    answer_button: MouseButton,
    free_button: MouseButton,
) -> bool {
    click && spec.key.is_none() && answer_button != free_button
}

fn should_prewarm(
    spec: ShortcutSpec,
    click: bool,
    enabled: bool,
    mods: u8,
    down: bool,
) -> bool {
    enabled && click && down && spec.key.is_none() && mods == spec.mods
}

fn should_fire_on_mouse(
    click: bool,
    spec: ShortcutSpec,
    selected: MouseButton,
    button: MouseButton,
    down: bool,
    mods: u8,
) -> bool {
    click && down && spec.key.is_none() && selected == button && mods == spec.mods
}

fn mouse_point(lparam: LPARAM) -> (i32, i32) {
    let ms = unsafe { &*(lparam.0 as *const MSLLHOOKSTRUCT) };
    (ms.pt.x, ms.pt.y)
}

fn fire_mouse(ctx: &HookCtx) {
    if crate::windows::pointer_over_main(&ctx.app) {
        return;
    }
    let _ = ctx.app.emit(
        "trigger-answer",
        serde_json::json!({ "sample": false, "mode": "exam" }),
    );
}

fn emit_gesture_test(ctx: &HookCtx, signal: GestureSignal) {
    let payload = match signal {
        GestureSignal::HoldStart => serde_json::json!({ "kind": "hold", "phase": "down" }),
        GestureSignal::HoldCancel => serde_json::json!({ "kind": "hold", "phase": "cancel" }),
        GestureSignal::HoldTrigger => serde_json::json!({ "kind": "hold", "phase": "trigger" }),
        GestureSignal::ShakeProgress {
            reversals,
            required,
        } => serde_json::json!({
            "kind": "shake",
            "phase": "reversal",
            "reversals": reversals,
            "required": required,
        }),
        GestureSignal::ShakeTrigger { reversals } => serde_json::json!({
            "kind": "shake",
            "phase": "trigger",
            "reversals": reversals,
        }),
    };
    let _ = ctx.app.emit("gesture-test", payload);
}

fn handle_gesture(ctx: &HookCtx, signal: GestureSignal) {
    if ctx.gesture_test.load(Ordering::Relaxed) {
        emit_gesture_test(ctx, signal);
        return;
    }
    match signal {
        GestureSignal::HoldStart | GestureSignal::ShakeProgress { .. } => {
            if ctx.prewarm_enabled.load(Ordering::Relaxed) {
                prewarm_overlay(ctx);
            }
        }
        GestureSignal::HoldTrigger | GestureSignal::ShakeTrigger { .. } => fire_mouse(ctx),
        GestureSignal::HoldCancel => {}
    }
}

unsafe extern "system" fn mouse_hook_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code >= 0 {
        if let Some(ctx) = CTX.get() {
            if !ctx.recording.load(Ordering::Relaxed) {
                let msg = wparam.0 as u32;
                if msg == WM_MOUSEMOVE {
                    let pt = mouse_point(lparam);
                    let now = ctx.started.elapsed().as_millis() as u64;
                    let signal = {
                        let Ok(mut runtime) = ctx.mouse.lock() else {
                            return unsafe { CallNextHookEx(None, code, wparam, lparam) };
                        };
                        let config = runtime.config;
                        runtime.detector.on_move(now, pt, &config)
                    };
                    if let Some(signal) = signal {
                        handle_gesture(ctx, signal);
                    }
                } else if let Some((button, down)) = mouse_button(msg) {
                    if !down {
                        if MOUSE_SUPPRESS.load(Ordering::Relaxed) == button.code() {
                            MOUSE_SUPPRESS.store(0, Ordering::Relaxed);
                            MOUSE_LATCH.store(false, Ordering::Relaxed);
                            return LRESULT(1);
                        }
                        if button == MouseButton::Left {
                            let pt = mouse_point(lparam);
                            let now = ctx.started.elapsed().as_millis() as u64;
                            let signal = {
                                let Ok(mut runtime) = ctx.mouse.lock() else {
                                    return unsafe { CallNextHookEx(None, code, wparam, lparam) };
                                };
                                let config = runtime.config;
                                runtime.detector.on_up(now, pt, &config)
                            };
                            if let Some(signal) = signal {
                                handle_gesture(ctx, signal);
                            }
                        }
                    } else {
                        if let Ok(guard) = ctx.spec.try_lock() {
                            if let Some(spec) = *guard {
                                let mods = current_mods();
                                if mods != spec.mods {
                                    MOUSE_LATCH.store(false, Ordering::Relaxed);
                                }
                                let answer_button = MouseButton::from_code(
                                    ctx.answer_button.load(Ordering::Relaxed),
                                )
                                .unwrap_or(MouseButton::Left);
                                let free_button = MouseButton::from_code(
                                    ctx.free_button.load(Ordering::Relaxed),
                                )
                                .unwrap_or(MouseButton::Right);
                                let answer = should_fire_on_mouse(
                                    ctx.answer_click.load(Ordering::Relaxed),
                                    spec,
                                    answer_button,
                                    button,
                                    true,
                                    mods,
                                );
                                let free = should_fire_on_mouse(
                                    ctx.free_enabled.load(Ordering::Relaxed),
                                    spec,
                                    free_button,
                                    button,
                                    true,
                                    mods,
                                );
                                if (answer || free) && !MOUSE_LATCH.swap(true, Ordering::Relaxed)
                                {
                                    fire(ctx, free);
                                    reset_gesture(ctx);
                                    MOUSE_SUPPRESS.store(button.code(), Ordering::Relaxed);
                                    return LRESULT(1);
                                }
                            }
                        }
                        if button == MouseButton::Left {
                            let pt = mouse_point(lparam);
                            let now = ctx.started.elapsed().as_millis() as u64;
                            let signal = {
                                let Ok(mut runtime) = ctx.mouse.lock() else {
                                    return unsafe { CallNextHookEx(None, code, wparam, lparam) };
                                };
                                let config = runtime.config;
                                runtime.detector.on_down(now, pt, &config)
                            };
                            if let Some(signal) = signal {
                                handle_gesture(ctx, signal);
                            }
                        }
                    }
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

fn prewarm_overlay(ctx: &HookCtx) {
    let app = ctx.app.clone();
    let overlay_app = app.clone();
    let _ = app.run_on_main_thread(move || {
        let _ = crate::commands::ensure_overlay(&overlay_app);
    });
}

fn fire(ctx: &HookCtx, free: bool) {
    let sample = crate::windows::pointer_over_main(&ctx.app);
    let mode = if free { "free" } else { "exam" };
    let _ = ctx
        .app
        .emit("trigger-answer", serde_json::json!({ "sample": sample, "mode": mode }));
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

    #[test]
    fn keyboard_shortcut_conflicts_use_modifier_overlap() {
        let answer = ShortcutSpec::parse("Control+Alt").unwrap();
        let panic = ShortcutSpec::parse("Control+Alt+X").unwrap();
        let panic_shift = ShortcutSpec::parse("Control+Alt+Shift+X").unwrap();
        let modifier_panic = ShortcutSpec::parse("Control+Alt+Shift").unwrap();
        let keyed_answer = ShortcutSpec::parse("Control+Alt+Q").unwrap();
        let unrelated = ShortcutSpec::parse("Alt+Shift").unwrap();

        assert!(conflicts(answer, false, panic));
        assert!(!conflicts(answer, true, panic));
        assert!(conflicts(answer, false, panic_shift));
        assert!(!conflicts(answer, true, panic_shift));
        assert!(conflicts(modifier_panic, true, answer));
        assert!(!conflicts(answer, true, modifier_panic));
        assert!(conflicts(keyed_answer, false, answer));
        assert!(!conflicts(answer, false, unrelated));
        assert!(conflicts(panic, false, panic));
    }

    #[test]
    fn mouse_buttons_parse() {
        assert_eq!(MouseButton::parse("left"), Ok(MouseButton::Left));
        assert_eq!(MouseButton::parse("right"), Ok(MouseButton::Right));
        assert_eq!(MouseButton::parse("middle"), Ok(MouseButton::Middle));
        assert!(MouseButton::parse("x").is_err());
    }

    #[test]
    fn mouse_click_fires_only_for_selected_button_and_exact_modifiers() {
        let spec = ShortcutSpec::parse("Control+Alt").unwrap();
        let button = MouseButton::Left;
        assert!(should_fire_on_mouse(
            true,
            spec,
            button,
            button,
            true,
            MOD_CTRL | MOD_ALT
        ));
        assert!(!should_fire_on_mouse(
            false,
            spec,
            button,
            button,
            true,
            MOD_CTRL | MOD_ALT
        ));
        assert!(!should_fire_on_mouse(
            true,
            spec,
            MouseButton::Right,
            button,
            true,
            MOD_CTRL | MOD_ALT
        ));
        assert!(!should_fire_on_mouse(
            true,
            spec,
            button,
            button,
            false,
            MOD_CTRL | MOD_ALT
        ));
        assert!(!should_fire_on_mouse(
            true,
            spec,
            button,
            button,
            true,
            MOD_CTRL
        ));
        let keyed = ShortcutSpec::parse("Control+Alt+Q").unwrap();
        assert!(!should_fire_on_mouse(
            true,
            keyed,
            button,
            button,
            true,
            MOD_CTRL | MOD_ALT
        ));
    }

    #[test]
    fn prewarm_only_for_click_modifier_specs_when_mods_match() {
        let spec = ShortcutSpec::parse("Control+Alt").unwrap();
        assert!(should_prewarm(spec, true, true, MOD_CTRL | MOD_ALT, true));
        assert!(!should_prewarm(spec, true, false, MOD_CTRL | MOD_ALT, true));
        assert!(!should_prewarm(spec, false, true, MOD_CTRL | MOD_ALT, true));
        assert!(!should_prewarm(spec, true, true, MOD_CTRL, true));
        assert!(!should_prewarm(spec, true, true, MOD_CTRL | MOD_ALT, false));
        let keyed = ShortcutSpec::parse("Control+Alt+Q").unwrap();
        assert!(!should_prewarm(keyed, true, true, MOD_CTRL | MOD_ALT, true));
    }

    #[test]
    fn free_mode_needs_a_click_and_a_different_button() {
        let spec = ShortcutSpec::parse("Control+Alt").unwrap();
        assert!(can_enable_free(
            spec,
            true,
            MouseButton::Left,
            MouseButton::Right
        ));
        assert!(!can_enable_free(
            spec,
            false,
            MouseButton::Left,
            MouseButton::Right
        ));
        assert!(!can_enable_free(
            spec,
            true,
            MouseButton::Left,
            MouseButton::Left
        ));
        let keyed = ShortcutSpec::parse("Control+Alt+Q").unwrap();
        assert!(!can_enable_free(
            keyed,
            true,
            MouseButton::Left,
            MouseButton::Right
        ));
    }

    fn mouse_config(mode: &str) -> MouseTriggerConfig {
        MouseTriggerConfig::new(mode, 800, 8, 4, 900, 12, 600, 800).unwrap()
    }

    #[test]
    fn mouse_trigger_config_parses_and_clamps() {
        let hold = MouseTriggerConfig::new("hold", 10, 999, 1, 1, 0, 99999, 0).unwrap();
        assert_eq!(hold.mode, MouseTriggerMode::Hold);
        assert_eq!(hold.hold_ms, 200);
        assert_eq!(hold.move_tolerance, 50);
        assert_eq!(hold.shake_reversals, 2);
        assert_eq!(hold.shake_window_ms, 200);
        assert_eq!(hold.shake_min_delta, 2);
        assert_eq!(hold.shake_cooldown_ms, 5000);
        assert_eq!(hold.hold_cooldown_ms, 0);
        assert!(MouseTriggerConfig::new("nope", 800, 8, 4, 900, 12, 600, 800).is_err());
    }

    #[test]
    fn hold_gesture_needs_the_full_duration_and_no_movement() {
        let cfg = mouse_config("hold");
        let mut d = GestureDetector::new();

        assert_eq!(d.on_down(0, (0, 0), &cfg), Some(GestureSignal::HoldStart));
        assert_eq!(d.on_up(799, (0, 0), &cfg), Some(GestureSignal::HoldCancel));

        assert_eq!(d.on_down(1500, (0, 0), &cfg), Some(GestureSignal::HoldStart));
        assert_eq!(d.on_move(1700, (9, 0), &cfg), Some(GestureSignal::HoldCancel));
        assert_eq!(d.on_up(2000, (9, 0), &cfg), None);

        assert_eq!(d.on_down(2500, (0, 0), &cfg), Some(GestureSignal::HoldStart));
        assert_eq!(d.on_up(3300, (0, 0), &cfg), Some(GestureSignal::HoldTrigger));
    }

    #[test]
    fn hold_cooldown_blocks_an_immediate_second_trigger() {
        let cfg = mouse_config("hold");
        let mut d = GestureDetector::new();
        assert_eq!(d.on_down(0, (0, 0), &cfg), Some(GestureSignal::HoldStart));
        assert_eq!(d.on_up(800, (0, 0), &cfg), Some(GestureSignal::HoldTrigger));
        assert_eq!(d.on_down(900, (0, 0), &cfg), None);
        assert_eq!(d.on_down(1600, (0, 0), &cfg), Some(GestureSignal::HoldStart));
    }

    #[test]
    fn shake_gesture_counts_direction_reversals() {
        let cfg = mouse_config("shake");
        let mut d = GestureDetector::new();
        assert_eq!(d.on_move(0, (0, 0), &cfg), None);
        assert_eq!(d.on_move(10, (20, 0), &cfg), None);
        assert_eq!(
            d.on_move(20, (0, 0), &cfg),
            Some(GestureSignal::ShakeProgress {
                reversals: 1,
                required: 4
            })
        );
        assert_eq!(
            d.on_move(30, (20, 0), &cfg),
            Some(GestureSignal::ShakeProgress {
                reversals: 2,
                required: 4
            })
        );
        assert_eq!(
            d.on_move(40, (0, 0), &cfg),
            Some(GestureSignal::ShakeProgress {
                reversals: 3,
                required: 4
            })
        );
        assert_eq!(
            d.on_move(50, (20, 0), &cfg),
            Some(GestureSignal::ShakeTrigger { reversals: 4 })
        );
    }

    #[test]
    fn shake_gesture_ignores_jitter_and_expires_slow_sequences() {
        let cfg = mouse_config("shake");
        let mut d = GestureDetector::new();
        d.on_move(0, (0, 0), &cfg);
        d.on_move(10, (20, 0), &cfg);
        assert_eq!(d.on_move(20, (22, 0), &cfg), None);
        assert_eq!(
            d.on_move(30, (0, 0), &cfg),
            Some(GestureSignal::ShakeProgress {
                reversals: 1,
                required: 4
            })
        );
        assert_eq!(
            d.on_move(1000, (20, 0), &cfg),
            Some(GestureSignal::ShakeProgress {
                reversals: 1,
                required: 4
            })
        );
    }
}
