use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

use raw_window_handle::RawWindowHandle;
use rune::{AppSpec, Color, Cx, El, WindowHandle, WindowOptions, WindowSpec, col, el, run_windows, text};
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{
    GWL_EXSTYLE, GetWindowDisplayAffinity, GetWindowLongPtrW, SWP_FRAMECHANGED, SWP_NOACTIVATE,
    SWP_NOMOVE, SWP_NOSIZE, SW_HIDE, SW_SHOWNOACTIVATE, SetWindowDisplayAffinity,
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

static OVERLAY_HANDLES: OnceLock<Mutex<Vec<WindowHandle>>> = OnceLock::new();
static LIVE_OVERLAY: OnceLock<Mutex<Option<WindowHandle>>> = OnceLock::new();
static HARDEN_AT: OnceLock<Instant> = OnceLock::new();

fn set_live_visible(visible: bool) {
    let Some(slot) = LIVE_OVERLAY.get() else {
        log("no live overlay");
        return;
    };
    let Some(window) = slot.lock().expect("live overlay").clone() else {
        log("no live overlay handle");
        return;
    };
    let start = Instant::now();
    let result = window.with_raw_handle(|handle| {
        let RawWindowHandle::Win32(win32) = handle.as_raw() else {
            return Err("not a Win32 window".to_string());
        };
        let hwnd = HWND(win32.hwnd.get() as *mut _);
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
        Ok(())
    });
    match result {
        Ok(Ok(())) => log(&format!(
            "overlay {} native in {:?}",
            if visible { "show" } else { "hide" },
            start.elapsed()
        )),
        Ok(Err(error)) | Err(error) => log(&format!("overlay visibility failed: {error}")),
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

fn queue_overlay(window: WindowHandle) {
    log("queue_overlay");
    window.show();
    OVERLAY_HANDLES
        .get_or_init(|| Mutex::new(Vec::new()))
        .lock()
        .expect("overlay handles")
        .push(window);
    HARDEN_AT.get_or_init(Instant::now);
}

fn apply_overlay_styles() {
    let Some(handles) = OVERLAY_HANDLES.get() else {
        return;
    };
    let drained: Vec<WindowHandle> = {
        let mut guard = handles.lock().expect("overlay handles");
        guard.drain(..).collect()
    };
    for window in drained {
        let result = window.with_raw_handle(|handle| {
            let RawWindowHandle::Win32(win32) = handle.as_raw() else {
                return Err("not a Win32 window".to_string());
            };
            let hwnd = HWND(win32.hwnd.get() as *mut _);
            unsafe {
                let current = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;
                let next = (current
                    | WS_EX_LAYERED.0
                    | WS_EX_TRANSPARENT.0
                    | WS_EX_TOOLWINDOW.0
                    | WS_EX_NOACTIVATE.0)
                    & !WS_EX_APPWINDOW.0;
                log(&format!(
                    "hwnd {:?} current {current:#x} next {next:#x}",
                    win32.hwnd
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
                LIVE_OVERLAY
                    .get_or_init(|| Mutex::new(None))
                    .lock()
                    .expect("live overlay")
                    .replace(window.clone());
                log("apply_overlay_styles ok");
            }
            Ok(Err(error)) | Err(error) => {
                log(&format!("overlay hardening failed: {error}"));
                window.hide();
            }
        }
    }
}

fn poll(_: &mut State, _: f64, tx: &mut rune::Tx) -> bool {
    match HARDEN_AT.get() {
        Some(at) if at.elapsed() >= Duration::from_millis(350) => apply_overlay_styles(),
        Some(_) => tx.wake_after(Duration::from_millis(50)),
        None => {}
    }
    false
}

fn view(s: &State, _: &mut Cx<State>) -> El {
    if s.overlay {
        return el()
            .w_full()
            .h_full()
            .child(
                el()
                    .w(900.0)
                    .h(600.0)
                    .padding(16.0)
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
    run_windows(|displays| {
        let mut windows = vec![WindowSpec::new("controls", spec()).state(init())];

        for (index, display) in displays.iter().enumerate() {
            let options = WindowOptions::overlay(display);
            windows.push(
                WindowSpec::new(format!("overlay-{index}"), spec())
                    .state(State {
                        overlay: true,
                        click_count: 0,
                    })
                    .options(options)
                    .on_created(|window| {
                        log("overlay on_created");
                        queue_overlay(window);
                    }),
            );
        }

        windows
    });
}

