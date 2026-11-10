use std::io::{BufRead, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

use raw_window_handle::RawWindowHandle;
use rune::{
    AppSpec, Color, Cx, El, ScrollSpec, WindowHandle, WindowOptions, WindowSpec, col, el,
    run_windows, text,
};
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{
    GWL_EXSTYLE, GetWindowDisplayAffinity, GetWindowLongPtrW, IsWindowVisible, SWP_FRAMECHANGED,
    SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SW_HIDE, SW_SHOWNOACTIVATE, SetWindowDisplayAffinity,
    SetWindowLongPtrW, SetWindowPos, ShowWindow, WDA_EXCLUDEFROMCAPTURE, WS_EX_APPWINDOW,
    WS_EX_LAYERED, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW, WS_EX_TRANSPARENT,
};

fn log(message: &str) {
    use std::io::Write;
    if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(std::env::temp_dir().join("rune-overlay-poc.log"))
    {
        let _ = writeln!(file, "{message}");
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum OverlayMode {
    Visible,
    Hidden,
    Offscreen,
}

impl OverlayMode {
    fn from_env() -> Self {
        match std::env::var("RUNE_POC_MODE").as_deref() {
            Ok("hidden") => Self::Hidden,
            Ok("visible") => Self::Visible,
            _ => Self::Offscreen,
        }
    }
}

struct OverlayEntry {
    window: WindowHandle,
    home: (i32, i32),
    mode: OverlayMode,
}

static OVERLAY_HANDLES: OnceLock<Mutex<Vec<OverlayEntry>>> = OnceLock::new();
static LIVE_OVERLAY: OnceLock<Mutex<Option<WindowHandle>>> = OnceLock::new();
static LIVE_HWND: OnceLock<Mutex<Option<isize>>> = OnceLock::new();
static HARDEN_AT: OnceLock<Instant> = OnceLock::new();
static REHARDEN_AT: OnceLock<Mutex<Option<Instant>>> = OnceLock::new();
static HARDENED: AtomicBool = AtomicBool::new(false);
static NO_WDA: AtomicBool = AtomicBool::new(false);
static AUTO_HIDE: AtomicBool = AtomicBool::new(false);
static AUTO_STAGE: AtomicBool = AtomicBool::new(false);
static AUTO_DONE: AtomicBool = AtomicBool::new(false);
static STDIO: AtomicBool = AtomicBool::new(false);
static STDIO_READY: AtomicBool = AtomicBool::new(false);

fn live_hwnd() -> Option<HWND> {
    let raw = LIVE_HWND
        .get()
        .and_then(|slot| slot.lock().expect("live hwnd").to_owned())?;
    Some(HWND(raw as *mut _))
}

fn set_live_visible(visible: bool) {
    let Some(hwnd) = live_hwnd() else {
        log("no live hwnd");
        return;
    };
    let start = Instant::now();
    unsafe {
        let _ = ShowWindow(
            hwnd,
            if visible {
                SW_SHOWNOACTIVATE
            } else {
                SW_HIDE
            },
        );
    }
    log(&format!(
        "overlay {} native in {:?}",
        if visible { "show" } else { "hide" },
        start.elapsed()
    ));
    if visible {
        // Rune's queued show rewrites the EX styles; harden again after the
        // show has been drained. Use the stored HWND because WindowHandle's
        // raw handle is only available on the Rune UI thread.
        *REHARDEN_AT.get_or_init(|| Mutex::new(None)).lock().expect("reharden") =
            Some(Instant::now());
    }
}

fn live_state() -> Option<(u32, bool)> {
    let hwnd = live_hwnd()?;
    unsafe {
        let mut affinity = 0u32;
        if GetWindowDisplayAffinity(hwnd, &mut affinity).is_err() {
            return None;
        }
        Some((affinity, IsWindowVisible(hwnd).as_bool()))
    }
}

fn write_line(line: &str) {
    let mut out = std::io::stdout().lock();
    let _ = writeln!(out, "{line}");
    let _ = out.flush();
}

fn signal_stdio_ready() {
    if STDIO.load(Ordering::SeqCst) && !STDIO_READY.swap(true, Ordering::SeqCst) {
        write_line("ready");
    }
}

fn stdio_loop() {
    let stdin = std::io::stdin();
    for line in stdin.lock().lines() {
        let Ok(line) = line else {
            break;
        };
        match line.trim() {
            "show" => {
                set_live_visible(true);
                // Rune's queued show resets the EX styles; wait for it to drain
                // before reporting that the protected overlay is usable.
                std::thread::sleep(Duration::from_millis(150));
                reharden_live();
                match live_state() {
                    Some((affinity, visible)) => write_line(&format!(
                        "ack show affinity=0x{affinity:x} visible={visible}"
                    )),
                    None => write_line("ack show affinity=0x0 visible=false"),
                }
            }
            "hide" => {
                set_live_visible(false);
                std::thread::sleep(Duration::from_millis(20));
                match live_state() {
                    Some((affinity, visible)) => write_line(&format!(
                        "ack hide affinity=0x{affinity:x} visible={visible}"
                    )),
                    None => write_line("ack hide affinity=0x0 visible=false"),
                }
            }
            "ping" => write_line("pong"),
            "quit" => std::process::exit(0),
            "" => {}
            other => write_line(&format!("error unknown_command={other}")),
        }
    }
}

#[derive(Clone, Default)]
struct State {
    overlay: bool,
    click_count: u32,
}

fn init() -> State {
    State::default()
}

fn with_hwnd<R>(window: &WindowHandle, f: impl FnOnce(HWND) -> R) -> Result<R, String> {
    window.with_raw_handle(|handle| {
        let RawWindowHandle::Win32(win32) = handle.as_raw() else {
            return Err("not a Win32 window".to_string());
        };
        Ok(f(HWND(win32.hwnd.get() as *mut _)))
    })?
}

fn protect_now(window: &WindowHandle) -> Result<(), String> {
    if NO_WDA.load(Ordering::SeqCst) {
        log("WDA skipped for visual capture");
        return Ok(());
    }
    with_hwnd(window, |hwnd| unsafe {
        SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)
            .map_err(|error| format!("set display affinity: {error}"))?;
        let mut affinity = 0u32;
        GetWindowDisplayAffinity(hwnd, &mut affinity)
            .map_err(|error| format!("get display affinity: {error}"))?;
        log(&format!("initial display affinity {affinity:#x}"));
        if affinity != WDA_EXCLUDEFROMCAPTURE.0 {
            return Err(format!("unexpected display affinity {affinity:#x}"));
        }
        Ok(())
    })?
}

fn queue_overlay(window: WindowHandle, home: (i32, i32), mode: OverlayMode) {
    log(&format!(
        "queue_overlay mode={} home={home:?}",
        match mode {
            OverlayMode::Visible => "visible",
            OverlayMode::Hidden => "hidden",
            OverlayMode::Offscreen => "offscreen",
        }
    ));
    // WDA must be on before any pixel can reach the display. This is safe while
    // the window is still offscreen or hidden.
    if let Err(error) = protect_now(&window) {
        log(&format!("initial WDA failed: {error}"));
        window.hide();
        return;
    }
    OVERLAY_HANDLES
        .get_or_init(|| Mutex::new(Vec::new()))
        .lock()
        .expect("overlay handles")
        .push(OverlayEntry { window, home, mode });
    HARDEN_AT.get_or_init(Instant::now);
}

fn apply_overlay_styles() {
    let Some(handles) = OVERLAY_HANDLES.get() else {
        return;
    };
    let drained: Vec<OverlayEntry> = {
        let mut guard = handles.lock().expect("overlay handles");
        guard.drain(..).collect()
    };
    for entry in drained {
        let OverlayEntry { window, home, mode } = entry;
        if mode == OverlayMode::Hidden {
            // Rune's hidden window path is under test: show it only after the
            // first frame has had a chance to build.
            window.show();
        }
        let mut raw_hwnd = 0isize;
        let result = with_hwnd(&window, |hwnd| unsafe {
            raw_hwnd = hwnd.0 as isize;
            let current = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;
            let next = (current
                | WS_EX_LAYERED.0
                | WS_EX_TRANSPARENT.0
                | WS_EX_TOOLWINDOW.0
                | WS_EX_NOACTIVATE.0)
                & !WS_EX_APPWINDOW.0;
            log(&format!(
                "hwnd {:?} current {current:#x} next {next:#x}",
                hwnd.0
            ));
            SetWindowLongPtrW(hwnd, GWL_EXSTYLE, next as isize);
            SetWindowPos(
                hwnd,
                None,
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_FRAMECHANGED,
            )
            .map_err(|error| format!("set window pos: {error}"))?;
            if !NO_WDA.load(Ordering::SeqCst) {
                SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)
                    .map_err(|error| format!("set display affinity: {error}"))?;
                let mut affinity = 0u32;
                GetWindowDisplayAffinity(hwnd, &mut affinity)
                    .map_err(|error| format!("get display affinity: {error}"))?;
                log(&format!("display affinity {affinity:#x}"));
                if affinity != WDA_EXCLUDEFROMCAPTURE.0 {
                    return Err(format!("unexpected display affinity {affinity:#x}"));
                }
            }
            Ok(())
        });
        match result {
            Ok(Ok(())) => {
                if mode == OverlayMode::Offscreen {
                    // The first offscreen frame is built and protected; only
                    // now move the window over the target display.
                    window.set_position(home);
                    log(&format!("moved overlay onscreen to {home:?}"));
                }
                LIVE_OVERLAY
                    .get_or_init(|| Mutex::new(None))
                    .lock()
                    .expect("live overlay")
                    .replace(window.clone());
                LIVE_HWND
                    .get_or_init(|| Mutex::new(None))
                    .lock()
                    .expect("live hwnd")
                    .replace(raw_hwnd);
                log("apply_overlay_styles ok");
                signal_stdio_ready();
            }
            Ok(Err(error)) | Err(error) => {
                log(&format!("overlay hardening failed: {error}"));
                window.hide();
            }
        }
    }
    HARDENED.store(true, Ordering::SeqCst);
}

fn reharden_live() {
    let Some(hwnd) = live_hwnd() else {
        return;
    };
    let result = (|| unsafe {
        let current = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;
        let next = (current
            | WS_EX_LAYERED.0
            | WS_EX_TRANSPARENT.0
            | WS_EX_TOOLWINDOW.0
            | WS_EX_NOACTIVATE.0)
            & !WS_EX_APPWINDOW.0;
        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, next as isize);
        SetWindowPos(
            hwnd,
            None,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_FRAMECHANGED,
        )
        .map_err(|error| format!("set window pos: {error}"))?;
        if !NO_WDA.load(Ordering::SeqCst) {
            SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)
                .map_err(|error| format!("set display affinity: {error}"))?;
        }
        Ok::<(), String>(())
    })();
    match result {
        Ok(()) => log("reharden_live ok"),
        Err(error) => {
            log(&format!("reharden_live failed: {error}"));
            unsafe {
                let _ = ShowWindow(hwnd, SW_HIDE);
            }
        }
    }
}

fn poll(_: &mut State, _: f64, tx: &mut rune::Tx) -> bool {
    match HARDEN_AT.get() {
        Some(at) if !HARDENED.load(Ordering::SeqCst) && at.elapsed() >= Duration::from_millis(350) => {
            apply_overlay_styles()
        }
        Some(_) if !HARDENED.load(Ordering::SeqCst) => {
            tx.wake_after(Duration::from_millis(50));
            return false;
        }
        _ => {}
    }
    if let Some(slot) = REHARDEN_AT.get() {
        let due = *slot.lock().expect("reharden");
        if let Some(at) = due {
            if at.elapsed() >= Duration::from_millis(120) {
                reharden_live();
                *slot.lock().expect("reharden") = None;
            } else {
                tx.wake_after(Duration::from_millis(30));
            }
        }
    }
    if AUTO_HIDE.load(Ordering::SeqCst) && !AUTO_DONE.load(Ordering::SeqCst) {
        let at = HARDEN_AT.get().expect("harden time");
        if !AUTO_STAGE.load(Ordering::SeqCst) && at.elapsed() >= Duration::from_millis(800) {
            set_live_visible(false);
            AUTO_STAGE.store(true, Ordering::SeqCst);
        } else if AUTO_STAGE.load(Ordering::SeqCst) && at.elapsed() >= Duration::from_millis(1400) {
            set_live_visible(true);
            AUTO_DONE.store(true, Ordering::SeqCst);
        } else {
            tx.wake_after(Duration::from_millis(50));
        }
    }
    false
}

const LONG_TEXT: &str = "정답은 B입니다. 긴 설명 텍스트의 줄바꿈과 스크롤을 확인합니다. \
이 문장은 한국어와 English text를 섞어서 표시합니다. The quick brown fox jumps over the lazy dog. \
문제의 보기가 길어지거나 설명이 여러 줄이 되더라도 카드 안에서 읽을 수 있어야 합니다. \
Rune의 텍스트 레이아웃과 스크롤 뷰포트가 실제 오버레이 크기에서 동작하는지 확인하는 샘플입니다. \
정답은 B입니다. 긴 설명 텍스트의 줄바꿈과 스크롤을 확인합니다. \
이 문장은 한국어와 English text를 섞어서 표시합니다. The quick brown fox jumps over the lazy dog. \
문제의 보기가 길어지거나 설명이 여러 줄이 되더라도 카드 안에서 읽을 수 있어야 합니다. \
Rune의 텍스트 레이아웃과 스크롤 뷰포트가 실제 오버레이 크기에서 동작하는지 확인하는 샘플입니다. \
정답은 B입니다. 긴 설명 텍스트의 줄바꿈과 스크롤을 확인합니다. \
이 문장은 한국어와 English text를 섞어서 표시합니다. The quick brown fox jumps over the lazy dog. \
문제의 보기가 길어지거나 설명이 여러 줄이 되더라도 카드 안에서 읽을 수 있어야 합니다. \
Rune의 텍스트 레이아웃과 스크롤 뷰포트가 실제 오버레이 크기에서 동작하는지 확인하는 샘플입니다.";

fn view(s: &State, _: &mut Cx<State>) -> El {
    if s.overlay {
        return el()
            .w_full()
            .h_full()
            .child(
                col()
                    .w(900.0)
                    .h(600.0)
                    .padding(16.0)
                    .gap(12.0)
                    .radius(10.0)
                    .fill(Color { r: 1.0, g: 1.0, b: 1.0, a: 0.55 })
                    .child(
                        text("RUNE OVERLAY / 정답은 B입니다")
                            .color(Color {
                                r: 0.02,
                                g: 0.02,
                                b: 0.02,
                                a: 1.0,
                            }),
                    )
                    .child(
                        el()
                            .w_full()
                            .grow(1.0)
                            .min_h(0.0)
                            .scroll(ScrollSpec { stick_bottom: false })
                            .child(
                                text(LONG_TEXT)
                                    .wrap()
                                    .w_full()
                                    .color(Color {
                                        r: 0.02,
                                        g: 0.02,
                                        b: 0.02,
                                        a: 1.0,
                                    }),
                            ),
                    ),
            );
    }

    col()
        .w_full()
        .h_full()
        .padding(32.0)
        .gap(16.0)
        .fill(Color {
            r: 0.96,
            g: 0.95,
            b: 0.92,
            a: 1.0,
        })
        .child(text(format!("underlying clicks: {}", s.click_count)).color(Color {
            r: 0.05,
            g: 0.05,
            b: 0.05,
            a: 1.0,
        }))
        .child(
            el()
                .padding(12.0)
                .radius(8.0)
                .fill(Color {
                    r: 0.1,
                    g: 0.1,
                    b: 0.12,
                    a: 1.0,
                })
                .child(text("click through the overlay").color(Color {
                    r: 1.0,
                    g: 1.0,
                    b: 1.0,
                    a: 1.0,
                }))
                .on_press(|s: &mut State| {
                    s.click_count += 1;
                    eprintln!("underlying button click {}", s.click_count);
                }),
        )
        .child(
            el()
                .padding(12.0)
                .radius(8.0)
                .fill(Color {
                    r: 0.8,
                    g: 0.15,
                    b: 0.15,
                    a: 1.0,
                })
                .child(text("hide overlay").color(Color {
                    r: 1.0,
                    g: 1.0,
                    b: 1.0,
                    a: 1.0,
                }))
                .on_press(|_: &mut State| set_live_visible(false)),
        )
        .child(
            el()
                .padding(12.0)
                .radius(8.0)
                .fill(Color {
                    r: 0.1,
                    g: 0.45,
                    b: 0.2,
                    a: 1.0,
                })
                .child(text("show overlay").color(Color {
                    r: 1.0,
                    g: 1.0,
                    b: 1.0,
                    a: 1.0,
                }))
                .on_press(|_: &mut State| set_live_visible(true)),
        )
        .on_press(|s: &mut State| {
            s.click_count += 1;
            eprintln!("underlying root click {}", s.click_count);
        })
}

fn spec() -> AppSpec<State> {
    AppSpec {
        poll: Some(poll),
        ..AppSpec::new("Rune overlay PoC", (640.0, 420.0), init, view)
    }
}

fn main() {
    let mode = OverlayMode::from_env();
    let stdio = std::env::args().any(|arg| arg == "--stdio");
    STDIO.store(stdio, Ordering::SeqCst);
    NO_WDA.store(std::env::var_os("RUNE_POC_NO_WDA").is_some(), Ordering::SeqCst);
    AUTO_HIDE.store(std::env::var_os("RUNE_POC_AUTOHIDE").is_some(), Ordering::SeqCst);
    if stdio {
        std::thread::spawn(stdio_loop);
    }
    run_windows(move |displays| {
        let mut windows = if stdio {
            Vec::new()
        } else {
            vec![WindowSpec::new("controls", spec()).state(init())]
        };

        for (index, display) in displays.iter().enumerate() {
            let home = display.position;
            let mut options = WindowOptions::overlay(display);
            match mode {
                OverlayMode::Hidden => options.visible = false,
                OverlayMode::Offscreen => {
                    // Leave the display: the first frame is built and protected
                    // offscreen, then moved onscreen after hardening.
                    options.position = Some((
                        display.position.0 - display.size.0 as i32 - 64,
                        display.position.1,
                    ));
                }
                OverlayMode::Visible => {}
            }
            windows.push(
                WindowSpec::new(format!("overlay-{index}"), spec())
                    .state(State {
                        overlay: true,
                        click_count: 0,
                    })
                    .options(options)
                    .on_created(move |window| {
                        log("overlay on_created");
                        queue_overlay(window, home, mode);
                    }),
            );
        }

        windows
    });
}

