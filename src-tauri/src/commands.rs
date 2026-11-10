use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use serde::Deserialize;
use tauri::State;

pub struct AppState {
    pub tray: Mutex<Option<tauri::tray::TrayIcon>>,
    pub menu: Mutex<Option<MenuHandles>>,
    pub http: reqwest::Client,
    pub capture_in_flight: AtomicBool,
    pub last_capture: Mutex<Option<(i32, i32, crate::capture::MonitorRect)>>,
    pub cancel: tokio::sync::watch::Sender<u64>,
    pub content_protection: AtomicBool,
    pub overlay_state: Mutex<OverlayDelivery>,
    pub tray_visible: AtomicBool,
    pub rune: Mutex<Option<crate::rune_bridge::RuneBridge>>,
}

#[derive(Default)]
pub struct OverlayDelivery {
    ready: bool,
    pending: Option<serde_json::Value>,
}

impl Default for AppState {
    fn default() -> Self {
        let (cancel, _) = tokio::sync::watch::channel(0u64);
        Self {
            tray: Mutex::new(None),
            menu: Mutex::new(None),
            http: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(60))
                .redirect(reqwest::redirect::Policy::none())
                .build()
                .expect("http client"),
            capture_in_flight: AtomicBool::new(false),
            last_capture: Mutex::new(None),
            cancel,
            content_protection: AtomicBool::new(true),
            overlay_state: Mutex::new(OverlayDelivery::default()),
            tray_visible: AtomicBool::new(true),
            rune: Mutex::new(None),
        }
    }
}

pub(crate) fn rune_enabled() -> bool {
    std::env::args().any(|arg| arg == "--rune-overlay")
        || std::env::var_os("CUE_RUNE_OVERLAY").is_some_and(|value| value == "1")
}

fn rune_sidecar_path() -> Option<std::path::PathBuf> {
    if let Some(path) = std::env::var_os("CUE_RUNE_SIDECAR") {
        return Some(path.into());
    }
    std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(|dir| dir.join("rune-overlay-poc.exe")))
}

fn try_rune_show(
    app: &tauri::AppHandle,
    state: &AppState,
    answer: &str,
    style: &str,
    duration_ms: u64,
    rect: (i32, i32, i32, i32),
    scale: f64,
) -> Result<(), String> {
    let Some(path) = rune_sidecar_path() else {
        return Err("rune sidecar path unavailable".to_string());
    };
    let mut guard = state.rune.lock().map_err(|_| "rune bridge".to_string())?;
    if guard.is_none() {
        *guard = Some(crate::rune_bridge::RuneBridge::start(&path)?);
    }
    let bridge = guard.as_mut().ok_or("rune bridge")?;
    bridge.show(answer, style, duration_ms, rect, scale)?;
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("overlay") {
        let _ = window.hide();
    }
    Ok(())
}

fn next_generation(value: u64) -> u64 {
    value.wrapping_add(1)
}

async fn wait_cancel(rx: &mut tokio::sync::watch::Receiver<u64>, mine: u64) {
    loop {
        if *rx.borrow() != mine {
            return;
        }
        if rx.changed().await.is_err() {
            return;
        }
    }
}

#[tauri::command]
pub fn cancel_answer(state: tauri::State<'_, AppState>) {
    state.cancel.send_modify(|value| *value = next_generation(*value));
}

#[tauri::command]
pub fn clear_clipboard() -> Result<(), String> {
    use ::windows::Win32::System::DataExchange::{CloseClipboard, EmptyClipboard, OpenClipboard};
    unsafe {
        if OpenClipboard(None).is_err() {
            return Err("clipboard".into());
        }
        let ok = EmptyClipboard().is_ok();
        let _ = CloseClipboard();
        if ok { Ok(()) } else { Err("clipboard".into()) }
    }
}

struct FlagGuard<'a>(&'a AtomicBool);

impl Drop for FlagGuard<'_> {
    fn drop(&mut self) {
        self.0.store(false, Ordering::SeqCst);
    }
}

#[derive(Clone, Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Verification {
    pub matched: bool,
    pub candidates_matched: bool,
    pub secondary: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

fn provider_key(preset: &str, base_url: &str) -> Result<String, String> {
    match crate::secrets::get_key(preset)? {
        Some(key) => Ok(key),
        None if crate::ai::key_may_be_empty(preset, base_url) => Ok(String::new()),
        None => Err("no_key".into()),
    }
}

fn verify_provider<'a>(
    preset: &'a str,
    base_url: &'a str,
    model: &'a str,
    key: &'a str,
) -> crate::ai::Provider<'a> {
    // Extra JSON is tuned for the primary model's protocol. Applying it to a
    // verifier on another protocol can make the request invalid (for example,
    // max_tokens on the Responses API).
    crate::ai::Provider {
        preset,
        base_url,
        model,
        extra: "",
        key,
    }
}

async fn answers_with_fallback(
    client: &reqwest::Client,
    provider: &crate::ai::Provider<'_>,
    fallback: Option<&crate::ai::Provider<'_>>,
    b64: &str,
    cx: i32,
    cy: i32,
    w: u32,
    h: u32,
) -> Result<Vec<String>, String> {
    match crate::ai::request_answers(client, provider, b64, cx, cy, w, h).await {
        Ok(answers) => Ok(answers),
        Err(error)
            if fallback.is_some() && crate::ai::fallback_allowed(&error) =>
        {
            crate::ai::request_answers(client, fallback.unwrap(), b64, cx, cy, w, h).await
        }
        Err(error) => Err(error),
    }
}

async fn text_with_fallback(
    client: &reqwest::Client,
    provider: &crate::ai::Provider<'_>,
    fallback: Option<&crate::ai::Provider<'_>>,
    capture: &crate::capture::Capture,
    paraphrase: bool,
    language: &str,
    level: &str,
) -> Result<String, String> {
    match crate::ai::request_text(client, provider, capture, paraphrase, language, level).await {
        Ok(text) => Ok(text),
        Err(error)
            if fallback.is_some() && crate::ai::fallback_allowed(&error) =>
        {
            crate::ai::request_text(
                client,
                fallback.unwrap(),
                capture,
                paraphrase,
                language,
                level,
            )
            .await
        }
        Err(error) => Err(error),
    }
}

async fn free_with_fallback(
    client: &reqwest::Client,
    provider: &crate::ai::Provider<'_>,
    fallback: Option<&crate::ai::Provider<'_>>,
    capture: &crate::capture::Capture,
    paraphrase: bool,
    instruction: &str,
    language: &str,
    level: &str,
) -> Result<String, String> {
    match crate::ai::request_free(
        client,
        provider,
        capture,
        paraphrase,
        instruction,
        language,
        level,
    )
    .await
    {
        Ok(text) => Ok(text),
        Err(error)
            if fallback.is_some() && crate::ai::fallback_allowed(&error) =>
        {
            crate::ai::request_free(
                client,
                fallback.unwrap(),
                capture,
                paraphrase,
                instruction,
                language,
                level,
            )
            .await
        }
        Err(error) => Err(error),
    }
}

#[derive(Debug, serde::Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum AnswerPayload {
    Choice {
        answers: Vec<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        verification: Option<Verification>,
    },
    Text {
        text: String,
    },
    None {
        reason: String,
    },
}

#[tauri::command]
pub async fn capture_and_answer(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    preset: String,
    base_url: String,
    model: String,
    extra_json: String,
    answer_type: String,
    paraphrase: bool,
    crop: bool,
    language: String,
    level: String,
    mode: String,
    free_instruction: String,
    consensus: bool,
    verify_model: String,
    fallback_model: String,
    prepare_overlay: bool,
) -> Result<AnswerPayload, String> {
    if state.capture_in_flight.swap(true, Ordering::SeqCst) {
        return Err("busy".into());
    }
    let _guard = FlagGuard(&state.capture_in_flight);
    let mut cancel_rx = state.cancel.subscribe();
    let mine = *cancel_rx.borrow();
    let work = async {
    crate::ai::validate_base_url(&preset, &base_url)?;
    let key = provider_key(&preset, &base_url)?;
    if prepare_overlay && !rune_enabled() {
        // Create the overlay on the main thread without blocking capture/AI.
        let overlay_app = app.clone();
        let _ = app.run_on_main_thread(move || {
            let _ = ensure_overlay(&overlay_app);
        });
    }
    let (cap, cursor) = tauri::async_runtime::spawn_blocking(move || {
        let (buf, w, h, cursor, mon) = crate::capture::raw_capture()?;
        let region = crop.then(|| {
            crate::capture::crop_region(
                mon,
                cursor,
                crate::capture::CROP_WIDTH,
                crate::capture::CROP_HEIGHT,
            )
        });
        let cap = crate::capture::encode_capture_crop(buf, w, h, cursor, mon, region)?;
        Ok::<_, String>((cap, cursor))
    })
    .await
    .map_err(|_| "capture".to_string())??;
    {
        let mut lc = state.last_capture.lock().map_err(|_| "capture".to_string())?;
        *lc = Some((cursor.0, cursor.1, cap.monitor));
    }
    let provider = crate::ai::Provider {
        preset: &preset,
        base_url: &base_url,
        model: &model,
        extra: &extra_json,
        key: &key,
    };
    let fallback_name = fallback_model.trim();
    let fallback = (!fallback_name.is_empty() && fallback_name != model)
        .then(|| verify_provider(&preset, &base_url, fallback_name, &key));
    if mode == "free" {
        return match free_with_fallback(
            &state.http,
            &provider,
            fallback.as_ref(),
            &cap,
            paraphrase,
            &free_instruction,
            &language,
            &level,
        )
        .await
        {
            Ok(text) => Ok(AnswerPayload::Text { text }),
            Err(error) if error == "empty_text" => Ok(AnswerPayload::None { reason: error }),
            Err(error) => Err(error),
        };
    }
    match answer_type.as_str() {
        "choice" => {
            let verify = verify_model.trim();
            if consensus && !verify.is_empty() && verify != model {
                let verifier = verify_provider(&preset, &base_url, verify, &key);
                let (primary, secondary) = tokio::join!(
                    answers_with_fallback(
                        &state.http,
                        &provider,
                        fallback.as_ref(),
                        &cap.b64,
                        cap.cursor_x,
                        cap.cursor_y,
                        cap.img_w,
                        cap.img_h,
                    ),
                    crate::ai::request_answers(
                        &state.http,
                        &verifier,
                        &cap.b64,
                        cap.cursor_x,
                        cap.cursor_y,
                        cap.img_w,
                        cap.img_h,
                    ),
                );
                let consensus = match crate::ai::merge_consensus(primary, secondary) {
                    Ok(consensus) => consensus,
                    Err(error) if error == "empty" => {
                        return Ok(AnswerPayload::None { reason: error })
                    }
                    Err(error) => return Err(error),
                };
                return Ok(AnswerPayload::Choice {
                    answers: consensus.answers,
                    verification: Some(Verification {
                        matched: consensus.matched,
                        candidates_matched: consensus.candidates_matched,
                        secondary: consensus.secondary,
                        error: consensus.error,
                    }),
                });
            }
            let answers = match answers_with_fallback(
                &state.http,
                &provider,
                fallback.as_ref(),
                &cap.b64,
                cap.cursor_x,
                cap.cursor_y,
                cap.img_w,
                cap.img_h,
            )
            .await
            {
                Ok(answers) => answers,
                Err(error) if error == "empty" => {
                    return Ok(AnswerPayload::None { reason: error })
                }
                Err(error) => return Err(error),
            };
            Ok(AnswerPayload::Choice {
                answers,
                verification: None,
            })
        }
        "text" => match text_with_fallback(
            &state.http,
            &provider,
            fallback.as_ref(),
            &cap,
            paraphrase,
            &language,
            &level,
        )
        .await
        {
            Ok(text) => Ok(AnswerPayload::Text { text }),
            Err(error) if error == "empty_text" => Ok(AnswerPayload::None { reason: error }),
            Err(error) => Err(error),
        },
        _ => Err("config".into()),
    }
    };
    tokio::select! {
        result = work => result,
        _ = wait_cancel(&mut cancel_rx, mine) => Err("cancelled".into()),
    }
}

static OVERLAY_GEN: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
static OVERLAY_CREATE_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

pub(crate) fn ensure_overlay(app: &tauri::AppHandle) -> Result<tauri::WebviewWindow, String> {
    use tauri::Manager;
    let _guard = OVERLAY_CREATE_LOCK.lock().map_err(|_| "capture")?;
    if let Some(window) = app.get_webview_window("overlay") {
        return Ok(window);
    }
    crate::windows::create_overlay(app).map_err(|_| "capture".to_string())
}

#[tauri::command]
pub async fn show_overlay(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    answer: String,
    style: String,
    duration_ms: u64,
    verification: Option<Verification>,
) -> Result<(), String> {
    use tauri::Emitter;
    let protect = state.content_protection.load(Ordering::SeqCst);
    let last = *state
        .last_capture
        .lock()
        .map_err(|_| "capture".to_string())?;
    let ((cx, cy), mon) = crate::capture::resolve_anchor(last, crate::capture::cursor_monitor)?;
    let (w, h, x, y) = if style == "flash" {
        (mon.w as u32, mon.h as u32, mon.x, mon.y)
    } else if style == "text" {
        let size = crate::windows::text_size(
            crate::windows::monitor_scale(mon),
            answer.chars().count(),
            mon,
        );
        let size = (size.0.min(mon.w).max(1), size.1.min(mon.h).max(1));
        let (tx, ty) = crate::windows::text_position(mon, size);
        (size.0 as u32, size.1 as u32, tx, ty)
    } else {
        let size = crate::windows::badge_size_with_verification(
            crate::windows::monitor_scale(mon),
            answer.chars().count(),
            verification.is_some(),
        );
        let size = (size.0.min(mon.w).max(1), size.1.min(mon.h).max(1));
        let (bx, by) = crate::windows::badge_position((cx, cy), mon, size);
        (size.0 as u32, size.1 as u32, bx, by)
    };
    if rune_enabled() {
        if try_rune_show(
            &app,
            &state,
            &answer,
            &style,
            duration_ms,
            (x, y, w as i32, h as i32),
            crate::windows::monitor_scale(mon),
        )
        .is_ok()
        {
            return Ok(());
        }
    }
    let overlay = ensure_overlay(&app)?;
    if crate::windows::set_capture_protection(&overlay, protect).is_err() {
        let _ = overlay.hide();
        return Err("stealth".into());
    }
    overlay
        .set_size(tauri::PhysicalSize::new(w, h))
        .map_err(|_| "capture")?;
    overlay
        .set_position(tauri::PhysicalPosition::new(x, y))
        .map_err(|_| "capture")?;
    let gen = OVERLAY_GEN.fetch_add(1, std::sync::atomic::Ordering::SeqCst) + 1;
    // Clear the previous answer while hidden; otherwise the old content is
    // visible for a frame before the new overlay-show event lands.
    let _ = app.emit_to("overlay", "overlay-clear", ());
    let _ = crate::windows::set_tool_window(&overlay, true);
    overlay.show().map_err(|_| "capture")?;
    let _ = crate::windows::set_tool_window(&overlay, true);
    // Fail closed: never show an answer on a window the OS will capture.
    if protect && crate::windows::capture_affinity(&overlay).ok() != Some(0x11) {
        let _ = overlay.hide();
        return Err("stealth".into());
    }
    let payload = if style == "text" {
        serde_json::json!({
            "answer": answer.clone(),
            "style": style,
            "text": answer,
            "verification": verification,
        })
    } else {
        serde_json::json!({
            "answer": answer,
            "style": style,
            "verification": verification,
        })
    };
    let deliver_now = {
        let mut delivery = state.overlay_state.lock().map_err(|_| "capture")?;
        if delivery.ready {
            true
        } else {
            delivery.pending = Some(payload.clone());
            false
        }
    };
    if deliver_now {
        let _ = app.emit_to("overlay", "overlay-show", payload);
    }
    let app2 = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(duration_ms));
        if OVERLAY_GEN.load(std::sync::atomic::Ordering::SeqCst) == gen {
            if let Some(w) = tauri::Manager::get_webview_window(&app2, "overlay") {
                let _ = w.hide();
            }
        }
    });
    Ok(())
}

#[tauri::command]
pub fn overlay_ready(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    use tauri::Emitter;
    let pending = {
        let mut delivery = state.overlay_state.lock().map_err(|_| "capture")?;
        delivery.ready = true;
        delivery.pending.take()
    };
    if let Some(payload) = pending {
        let _ = app.emit_to("overlay", "overlay-show", payload);
    }
    Ok(())
}

#[tauri::command]
pub fn hide_overlay(app: tauri::AppHandle, state: tauri::State<'_, AppState>) {
    use tauri::{Emitter, Manager};
    OVERLAY_GEN.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
    if let Ok(mut delivery) = state.overlay_state.lock() {
        delivery.pending = None;
    }
    if rune_enabled() {
        if let Ok(mut guard) = state.rune.lock() {
            if let Some(bridge) = guard.as_mut() {
                if bridge.hide().is_ok() {
                    return;
                }
            }
        }
    }
    if let Some(w) = app.get_webview_window("overlay") {
        let _ = w.hide();
    }
    // Drop stale answer content before the next show.
    let _ = app.emit_to("overlay", "overlay-clear", ());
}

#[tauri::command]
pub fn hide_main(app: tauri::AppHandle) {
    crate::windows::hide_main(&app);
}

#[tauri::command]
pub async fn meeting_active(policy: String) -> bool {
    tauri::async_runtime::spawn_blocking(move || crate::meeting::meeting_active(&policy))
        .await
        .unwrap_or(false)
}

#[tauri::command]
pub async fn meeting_signals() -> crate::meeting::MeetingSignals {
    tauri::async_runtime::spawn_blocking(crate::meeting::meeting_signals)
        .await
        .unwrap_or_default()
}

#[tauri::command]
pub fn copy_text(text: String) -> Result<(), String> {
    use ::windows::Win32::Foundation::{GlobalFree, HANDLE};
    use ::windows::Win32::System::DataExchange::{
        CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData,
    };
    use ::windows::Win32::System::Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE};
    const CF_UNICODETEXT: u32 = 13;
    let wide = clipboard_wide(&text);
    unsafe {
        OpenClipboard(None).map_err(|_| "clipboard".to_string())?;
        let result = (|| {
            EmptyClipboard().map_err(|_| "clipboard".to_string())?;
            let h = GlobalAlloc(GMEM_MOVEABLE, wide.len() * 2)
                .map_err(|_| "clipboard".to_string())?;
            let p = GlobalLock(h);
            if p.is_null() {
                let _ = GlobalFree(Some(h));
                return Err("clipboard".to_string());
            }
            std::ptr::copy_nonoverlapping(
                wide.as_ptr().cast::<u8>(),
                p.cast::<u8>(),
                wide.len() * 2,
            );
            let _ = GlobalUnlock(h);
            if SetClipboardData(CF_UNICODETEXT, Some(HANDLE(h.0))).is_err() {
                let _ = GlobalFree(Some(h));
                return Err("clipboard".to_string());
            }
            Ok(())
        })();
        let _ = CloseClipboard();
        result
    }
}

fn clipboard_wide(text: &str) -> Vec<u16> {
    let mut wide: Vec<u16> = text.encode_utf16().collect();
    wide.push(0);
    wide
}

#[tauri::command]
pub fn blink_answer(answer: String, key: String) {
    let Some(count) = crate::led::blinks_for(&answer) else {
        return;
    };
    std::thread::spawn(move || {
        let _ = crate::led::blink(&key, count);
    });
}

#[tauri::command]
pub fn blink_brightness(answer: String) {
    let Some(count) = crate::led::blinks_for(&answer) else {
        return;
    };
    std::thread::spawn(move || {
        let _ = crate::brightness::blink(count);
    });
}

#[tauri::command]
pub fn check_extra(preset: String, model: String, extra_json: String) -> Vec<String> {
    crate::ai::extra_warnings(&preset, &model, &extra_json)
        .into_iter()
        .map(str::to_string)
        .collect()
}

#[tauri::command]
pub async fn test_connection(
    state: tauri::State<'_, AppState>,
    preset: String,
    base_url: String,
    model: String,
    extra_json: String,
) -> Result<bool, String> {
    crate::ai::validate_base_url(&preset, &base_url)?;
    let key = provider_key(&preset, &base_url)?;
    let p = crate::ai::Provider {
        preset: &preset,
        base_url: &base_url,
        model: &model,
        extra: &extra_json,
        key: &key,
    };
    crate::ai::test(&state.http, &p).await
}

#[tauri::command]
pub async fn list_models(
    state: tauri::State<'_, AppState>,
    preset: String,
    base_url: String,
) -> Result<Vec<String>, String> {
    crate::ai::validate_base_url(&preset, &base_url)?;
    let key = provider_key(&preset, &base_url)?;
    crate::models::list_models(&state.http, &preset, &base_url, &key).await
}

#[tauri::command]
pub fn set_api_key(preset: String, key: String) -> Result<(), String> {
    crate::secrets::set_key(&preset, &key)
}

#[tauri::command]
pub fn has_api_key(preset: String) -> Result<bool, String> {
    crate::secrets::has_key(&preset)
}

#[tauri::command]
pub fn clear_api_key(preset: String) -> Result<(), String> {
    crate::secrets::delete_key(&preset)
}

pub struct MenuHandles {
    pub open: tauri::menu::MenuItem<tauri::Wry>,
    pub help: tauri::menu::MenuItem<tauri::Wry>,
    pub last: tauri::menu::MenuItem<tauri::Wry>,
    pub copy: tauri::menu::MenuItem<tauri::Wry>,
    pub clear: tauri::menu::MenuItem<tauri::Wry>,
    pub quit: tauri::menu::MenuItem<tauri::Wry>,
}

#[derive(Deserialize)]
pub struct TrayIconSpec {
    pub rgba: Vec<u8>,
    pub width: u32,
    pub height: u32,
    pub tooltip: String,
}

#[tauri::command]
pub fn set_tray_icons(state: State<'_, AppState>, icons: Vec<TrayIconSpec>) -> Result<(), String> {
    let spec = icons.first().ok_or("tray")?;
    let img = tauri::image::Image::new_owned(spec.rgba.clone(), spec.width, spec.height);
    let guard = state.tray.lock().map_err(|_| "tray")?;
    let tray = guard.as_ref().ok_or("tray")?;
    tray.set_icon(Some(img)).map_err(|_| "tray")?;
    tray.set_tooltip(Some(spec.tooltip.as_str())).map_err(|_| "tray")?;
    Ok(())
}

#[tauri::command]
pub fn set_tray_visible(state: State<'_, AppState>, visible: bool) -> Result<(), String> {
    state.tray_visible.store(visible, Ordering::Relaxed);
    let guard = state.tray.lock().map_err(|_| "tray")?;
    let tray = guard.as_ref().ok_or("tray")?;
    tray.set_visible(visible).map_err(|_| "tray")?;
    Ok(())
}

#[tauri::command]
pub fn set_tray_menu_labels(
    state: State<'_, AppState>,
    open_text: String,
    help_text: String,
    last_text: String,
    copy_text: String,
    clear_text: String,
    quit_text: String,
) -> Result<(), String> {
    let guard = state.menu.lock().map_err(|_| "tray")?;
    let m = guard.as_ref().ok_or("tray")?;
    m.open.set_text(open_text).map_err(|_| "tray")?;
    m.help.set_text(help_text).map_err(|_| "tray")?;
    m.last.set_text(last_text).map_err(|_| "tray")?;
    m.copy.set_text(copy_text).map_err(|_| "tray")?;
    m.clear.set_text(clear_text).map_err(|_| "tray")?;
    m.quit.set_text(quit_text).map_err(|_| "tray")?;
    Ok(())
}

#[tauri::command]
pub fn set_shortcut(accelerator: String, click: bool, button: String) -> Result<(), String> {
    crate::shortcut::set_spec(&accelerator, click, &button)
}

#[tauri::command]
pub fn set_free_shortcut(enabled: bool, button: String) -> Result<(), String> {
    crate::shortcut::set_free(enabled, &button)
}

#[tauri::command]
pub fn set_overlay_prewarm(enabled: bool) -> Result<(), String> {
    crate::shortcut::set_prewarm(enabled)
}

#[tauri::command]
pub fn set_mouse_trigger(
    mode: String,
    hold_ms: u64,
    move_tolerance: i32,
    shake_reversals: u8,
    shake_window_ms: u64,
    shake_min_delta: i32,
    shake_cooldown_ms: u64,
    hold_cooldown_ms: u64,
) -> Result<(), String> {
    let config = crate::shortcut::MouseTriggerConfig::new(
        &mode,
        hold_ms,
        move_tolerance,
        shake_reversals,
        shake_window_ms,
        shake_min_delta,
        shake_cooldown_ms,
        hold_cooldown_ms,
    )?;
    crate::shortcut::set_mouse_trigger(config)
}

#[tauri::command]
pub fn set_gesture_test(enabled: bool) {
    crate::shortcut::set_gesture_test(enabled);
}

#[tauri::command]
pub fn set_panic_shortcut(accelerator: String) -> Result<(), String> {
    crate::shortcut::set_panic_spec(&accelerator)
}

#[tauri::command]
pub fn set_shortcut_recording(recording: bool) {
    crate::shortcut::set_recording(recording);
}

#[tauri::command]
pub fn shortcut_installed() -> bool {
    crate::shortcut::installed()
}

const ALLOWED_LINKS: [&str; 2] = ["https://github.com/gguatit/cue", "https://github.com/gguatit"];

fn link_allowed(url: &str) -> bool {
    ALLOWED_LINKS
        .iter()
        .any(|l| url == *l || url.starts_with(&format!("{l}/")))
}

fn shell_open(target: &str) -> Result<(), String> {
    use ::windows::core::{HSTRING, PCWSTR};
    use ::windows::Win32::UI::Shell::ShellExecuteW;
    use ::windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;
    let op = HSTRING::from("open");
    let file = HSTRING::from(target);
    let r = unsafe {
        ShellExecuteW(
            None,
            PCWSTR(op.as_ptr()),
            PCWSTR(file.as_ptr()),
            PCWSTR::null(),
            PCWSTR::null(),
            SW_SHOWNORMAL,
        )
    };
    if (r.0 as isize) <= 32 {
        Err("link".into())
    } else {
        Ok(())
    }
}

#[tauri::command]
pub fn set_hide_from_taskbar(app: tauri::AppHandle, hidden: bool) -> Result<(), String> {
    use tauri::Manager;
    if let Some(w) = app.get_webview_window("main") {
        w.set_skip_taskbar(hidden)
            .map_err(|_| "stealth".to_string())?;
    }
    Ok(())
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatus {
    pub keyboard_hook: bool,
    pub mouse_hook: bool,
    pub tray_visible: bool,
}

#[tauri::command]
pub fn runtime_status(state: State<'_, AppState>) -> RuntimeStatus {
    let (keyboard_hook, mouse_hook) = crate::shortcut::hook_status();
    RuntimeStatus {
        keyboard_hook,
        mouse_hook,
        tray_visible: state.tray_visible.load(Ordering::Relaxed),
    }
}

#[tauri::command]
pub fn refresh_input(app: tauri::AppHandle) -> Result<(), String> {
    app.run_on_main_thread(crate::shortcut::refresh_hooks)
        .map_err(|_| "shortcut".to_string())
}

#[derive(serde::Serialize)]
pub struct CaptureProtectionStatus {
    pub main: u32,
    pub overlay: Option<u32>,
}

#[tauri::command]
pub fn capture_protection_status(
    app: tauri::AppHandle,
) -> Result<CaptureProtectionStatus, String> {
    use tauri::Manager;
    let main = app.get_webview_window("main").ok_or("stealth")?;
    let overlay = app
        .get_webview_window("overlay")
        .map(|window| crate::windows::capture_affinity(&window))
        .transpose()?;
    Ok(CaptureProtectionStatus {
        main: crate::windows::capture_affinity(&main)?,
        overlay,
    })
}

#[tauri::command]
pub fn set_content_protection(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    enabled: bool,
) -> Result<(), String> {
    use tauri::Manager;
    state.content_protection.store(enabled, Ordering::SeqCst);
    let mut failed = false;
    for label in ["main", "overlay"] {
        if let Some(w) = app.get_webview_window(label) {
            if crate::windows::set_capture_protection(&w, enabled).is_err() {
                failed = true;
            }
        }
    }
    if failed {
        Err("stealth".into())
    } else {
        Ok(())
    }
}

fn explorer_open(target: &str) -> Result<(), String> {
    if crate::elevation::is_elevated() {
        // An elevated ShellExecute would launch the browser elevated too.
        std::process::Command::new(crate::elevation::windows_dir("explorer.exe"))
            .arg(target)
            .spawn()
            .map(|_| ())
            .map_err(|_| "link".to_string())
    } else {
        shell_open(target)
    }
}

#[tauri::command]
pub fn open_taskbar_settings() -> Result<(), String> {
    explorer_open("ms-settings:taskbar")
}

#[tauri::command]
pub fn open_external(url: String) -> Result<(), String> {
    if !link_allowed(&url) {
        return Err("link".into());
    }
    explorer_open(&url)
}

#[tauri::command]
pub fn system_accent() -> Result<String, String> {
    crate::appearance::system_accent()
}

#[tauri::command]
pub fn set_titlebar_theme(app: tauri::AppHandle, dark: bool) -> Result<(), String> {
    use tauri::Manager;
    let win = app.get_webview_window("main").ok_or("stealth")?;
    crate::windows::set_titlebar_theme(&win, dark)
}

#[tauri::command]
pub fn set_autostart(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let m = app.autolaunch();
    if enabled {
        let exe = std::env::current_exe().map_err(|_| "autostart".to_string())?;
        m.enable().map_err(|_| "autostart".to_string())?;
        if write_autostart_value(&app.package_info().name, &autostart_command(&exe)).is_err() {
            let _ = m.disable();
            return Err("autostart".into());
        }
        Ok(())
    } else {
        m.disable().map_err(|_| "autostart".to_string())
    }
}

fn autostart_command(exe: &std::path::Path) -> String {
    format!("\"{}\" --background", exe.display())
}

fn write_autostart_value(name: &str, value: &str) -> Result<(), String> {
    use ::windows::Win32::System::Registry::{
        RegCloseKey, RegOpenKeyExW, RegSetValueExW, HKEY, HKEY_CURRENT_USER, KEY_SET_VALUE, REG_SZ,
    };
    use ::windows::core::{HSTRING, PCWSTR};
    unsafe {
        let mut key = HKEY::default();
        if RegOpenKeyExW(
            HKEY_CURRENT_USER,
            ::windows::core::w!("Software\\Microsoft\\Windows\\CurrentVersion\\Run"),
            None,
            KEY_SET_VALUE,
            &mut key,
        )
        .0
            != 0
        {
            return Err("autostart".into());
        }
        let value_name = HSTRING::from(name);
        let mut wide: Vec<u16> = value.encode_utf16().collect();
        wide.push(0);
        let bytes =
            std::slice::from_raw_parts(wide.as_ptr().cast::<u8>(), wide.len() * std::mem::size_of::<u16>());
        let result = RegSetValueExW(
            key,
            PCWSTR(value_name.as_ptr()),
            None,
            REG_SZ,
            Some(bytes),
        );
        let _ = RegCloseKey(key);
        if result.0 != 0 {
            return Err("autostart".into());
        }
        Ok(())
    }
}

#[tauri::command]
pub fn get_autostart(app: tauri::AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().map_err(|_| "autostart".to_string())
}

fn enable_guard() -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|_| "guard".to_string())?;
    crate::guard::enable(&exe)
}

#[tauri::command]
pub async fn set_guard(enabled: bool) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        if enabled { enable_guard() } else { crate::guard::disable() }
    })
    .await
    .map_err(|_| "guard".to_string())?
}

#[tauri::command]
pub async fn repair_guard() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(enable_guard)
        .await
        .map_err(|_| "guard".to_string())?
}

#[tauri::command]
pub async fn repair_protection() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(|| {
        let exe = std::env::current_exe().map_err(|_| "guard".to_string())?;
        let admin_mode = crate::elevation::service_installed()
            || crate::elevation::program_marker_exists();
        if crate::elevation::is_elevated() && admin_mode {
            if crate::elevation::service_installed() {
                crate::elevation::stop_service();
            }
            crate::elevation::harden_program_dir()?;
            crate::elevation::ensure_guard_copy()?;
            crate::elevation::write_service_config(&exe, &crate::elevation::current_user())?;
            crate::elevation::clear_legacy_config();
            let _ = crate::elevation::create_program_marker();
            crate::elevation::install_elevated_task(&exe)?;
            crate::elevation::install_service()?;
            crate::elevation::clear_admin_prepare_failed();
        } else {
            if admin_mode {
                return Err("admin".into());
            }
            if crate::guard::armed() {
                let guard = crate::elevation::ensure_user_guard_copy()?;
                crate::elevation::install_user_tasks(&exe, &guard)?;
            }
        }
        if !crate::guard::armed() {
            return crate::guard::enable(&exe);
        }
        Ok(())
    })
    .await
    .map_err(|_| "guard".to_string())?
}

#[tauri::command]
pub fn guard_enabled() -> bool {
    crate::guard::armed()
}

#[tauri::command]
pub async fn protection_status() -> Result<crate::elevation::ProtectionStatus, String> {
    tauri::async_runtime::spawn_blocking(crate::elevation::status)
        .await
        .map_err(|_| "guard".to_string())
}

#[tauri::command]
pub async fn check_update(
    app: tauri::AppHandle,
) -> Result<Option<crate::updates::UpdateInfo>, String> {
    crate::updates::check(&app).await
}

#[tauri::command]
pub async fn preflight_update(
    app: tauri::AppHandle,
) -> Result<crate::updates::UpdatePreflight, String> {
    crate::updates::preflight(&app).await
}

#[tauri::command]
pub async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    crate::updates::install(&app).await
}

#[tauri::command]
pub fn cleanup_update_files() -> crate::updates::CleanupResult {
    crate::updates::cleanup_temp_installers_now()
}

#[tauri::command]
pub async fn add_defender_exclusion() -> Result<crate::elevation::DefenderAddResult, String> {
    tauri::async_runtime::spawn_blocking(crate::elevation::add_defender_exclusion)
        .await
        .map_err(|_| "defender".to_string())?
}

#[tauri::command]
pub async fn defender_exclusion_status() -> Result<crate::elevation::DefenderStatus, String> {
    tauri::async_runtime::spawn_blocking(crate::elevation::defender_status)
        .await
        .map_err(|_| "defender".to_string())
}

#[tauri::command]
pub fn set_admin_mode(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|_| "admin".to_string())?;
    if !enabled {
        if crate::elevation::is_elevated() {
            crate::guard::teardown()?;
            return Ok(());
        }
        if !crate::elevation::service_installed() {
            crate::elevation::delete_tasks()?;
            crate::elevation::remove_program_marker()?;
            crate::elevation::clear_admin_prepare_failed();
            return Ok(());
        }
        // Removing the service needs elevation: re-run the protected copy once,
        // then tear everything down and exit.
        let admin = crate::elevation::admin_app_for(&exe)?;
        crate::elevation::relaunch_elevated_exe(&admin, "--admin-teardown")?;
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(400));
            app.exit(0);
        });
        return Ok(());
    }
    let admin = crate::elevation::admin_app_for(&exe)?;
    let user = crate::elevation::current_user();
    crate::elevation::relaunch_elevated_exe(
        &admin,
        &format!("--admin-setup --user \"{user}\""),
    )?;
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(400));
        app.exit(0);
    });
    Ok(())
}

#[tauri::command]
pub fn quit_app(app: tauri::AppHandle) {
    crate::guard::disarm();
    app.exit(0);
}

#[tauri::command]
pub fn tray_icon_shown() -> bool {
    read_promoted().unwrap_or(true)
}

pub(crate) fn promote_tray_icon_once() {
    let Ok(exe) = std::env::current_exe() else {
        return;
    };
    let exe = exe.to_string_lossy().to_string();
    for _ in 0..10 {
        if try_promote_tray_icon(&exe).is_some() {
            return;
        }
        std::thread::sleep(std::time::Duration::from_millis(500));
    }
}

fn should_promote(own_promoted: bool, already_promoted: bool, other_promoted: bool) -> bool {
    !own_promoted && !already_promoted && other_promoted
}

fn is_cue_exe(path: &str) -> bool {
    std::path::Path::new(path)
        .file_name()
        .map(|name| name.to_string_lossy().eq_ignore_ascii_case("cue.exe"))
        .unwrap_or(false)
}

fn try_promote_tray_icon(exe: &str) -> Option<()> {
    use ::windows::Win32::System::Registry::{
        RegCloseKey, RegEnumKeyExW, RegOpenKeyExW, RegSetValueExW, HKEY, HKEY_CURRENT_USER,
        KEY_READ, KEY_SET_VALUE, REG_DWORD,
    };
    use ::windows::core::{PCWSTR, PWSTR};
    unsafe {
        let mut root = HKEY::default();
        if RegOpenKeyExW(
            HKEY_CURRENT_USER,
            ::windows::core::w!("Control Panel\\NotifyIconSettings"),
            None,
            KEY_READ,
            &mut root,
        )
        .0 != 0
        {
            return Some(());
        }
        let mut index = 0u32;
        let mut own_name: Option<Vec<u16>> = None;
        let mut own_promoted = false;
        let mut own_marked = false;
        let mut other_promoted = false;
        loop {
            let mut name = [0u16; 256];
            let mut len = name.len() as u32;
            if RegEnumKeyExW(
                root,
                index,
                Some(PWSTR(name.as_mut_ptr())),
                &mut len,
                None,
                None,
                None,
                None,
            )
            .0 != 0
            {
                break;
            }
            index += 1;
            let mut sub = HKEY::default();
            if RegOpenKeyExW(root, PCWSTR(name.as_ptr()), None, KEY_READ, &mut sub).0 != 0 {
                continue;
            }
            if let Some(path) = read_string_value(sub, ::windows::core::w!("ExecutablePath")) {
                let promoted =
                    read_dword_value(sub, ::windows::core::w!("IsPromoted")).unwrap_or(0) != 0;
                if path.eq_ignore_ascii_case(exe) {
                    let mut owned = name[..len as usize].to_vec();
                    owned.push(0);
                    own_name = Some(owned);
                    own_promoted = promoted;
                    own_marked =
                        read_dword_value(sub, ::windows::core::w!("CuePromoted")).is_some();
                } else if promoted && is_cue_exe(&path) {
                    other_promoted = true;
                }
            }
            let _ = RegCloseKey(sub);
        }
        let result = match own_name {
            None => None,
            Some(name) => {
                if should_promote(own_promoted, own_marked, other_promoted) {
                    let mut own = HKEY::default();
                    if RegOpenKeyExW(
                        root,
                        PCWSTR(name.as_ptr()),
                        None,
                        KEY_READ | KEY_SET_VALUE,
                        &mut own,
                    )
                    .0 == 0
                    {
                        let one = 1u32.to_le_bytes();
                        if RegSetValueExW(
                            own,
                            ::windows::core::w!("IsPromoted"),
                            None,
                            REG_DWORD,
                            Some(&one),
                        )
                        .0 == 0
                        {
                            let _ = RegSetValueExW(
                                own,
                                ::windows::core::w!("CuePromoted"),
                                None,
                                REG_DWORD,
                                Some(&one),
                            );
                        }
                        let _ = RegCloseKey(own);
                    }
                }
                Some(())
            }
        };
        let _ = RegCloseKey(root);
        result
    }
}

// ponytail: Win11 NotifyIconSettings 기반 휴리스틱. 항목이 없거나 열거 실패면 true(안내를 막지 않음).
fn read_promoted() -> Option<bool> {
    use ::windows::Win32::System::Registry::{
        RegCloseKey, RegEnumKeyExW, RegOpenKeyExW, HKEY, HKEY_CURRENT_USER, KEY_READ,
    };
    use ::windows::core::PCWSTR;
    unsafe {
        let exe = std::env::current_exe().ok()?.to_string_lossy().to_string();
        let mut root = HKEY::default();
        if RegOpenKeyExW(
            HKEY_CURRENT_USER,
            ::windows::core::w!("Control Panel\\NotifyIconSettings"),
            None,
            KEY_READ,
            &mut root,
        )
        .0 != 0
        {
            return None;
        }
        let mut index = 0u32;
        let mut found: Option<bool> = None;
        loop {
            let mut name = [0u16; 256];
            let mut len = name.len() as u32;
            if RegEnumKeyExW(
                root,
                index,
                Some(::windows::core::PWSTR(name.as_mut_ptr())),
                &mut len,
                None,
                None,
                None,
                None,
            )
            .0 != 0
            {
                break;
            }
            index += 1;
            let mut sub = HKEY::default();
            if RegOpenKeyExW(root, PCWSTR(name.as_ptr()), None, KEY_READ, &mut sub).0 != 0 {
                continue;
            }
            if let Some(path) = read_string_value(sub, ::windows::core::w!("ExecutablePath")) {
                if path.eq_ignore_ascii_case(&exe) {
                    let v = read_dword_value(sub, ::windows::core::w!("IsPromoted")).unwrap_or(0);
                    found = Some(v != 0);
                }
            }
            let _ = RegCloseKey(sub);
        }
        let _ = RegCloseKey(root);
        found
    }
}

unsafe fn read_string_value(
    key: ::windows::Win32::System::Registry::HKEY,
    name: ::windows::core::PCWSTR,
) -> Option<String> {
    use ::windows::Win32::System::Registry::{RegQueryValueExW, REG_NONE};
    let mut ty = REG_NONE;
    let mut size = 0u32;
    if RegQueryValueExW(key, name, None, Some(&mut ty), None, Some(&mut size)).0 != 0 {
        return None;
    }
    let mut buf = vec![0u8; size as usize];
    if RegQueryValueExW(
        key,
        name,
        None,
        Some(&mut ty),
        Some(buf.as_mut_ptr()),
        Some(&mut size),
    )
    .0 != 0
    {
        return None;
    }
    let wide: Vec<u16> = buf
        .chunks_exact(2)
        .map(|c| u16::from_le_bytes([c[0], c[1]]))
        .collect();
    String::from_utf16(&wide).ok().map(|s| s.trim_end_matches('\0').to_string())
}

unsafe fn read_dword_value(
    key: ::windows::Win32::System::Registry::HKEY,
    name: ::windows::core::PCWSTR,
) -> Option<u32> {
    use ::windows::Win32::System::Registry::{RegQueryValueExW, REG_NONE};
    let mut ty = REG_NONE;
    let mut size = 4u32;
    let mut val = 0u32;
    if RegQueryValueExW(
        key,
        name,
        None,
        Some(&mut ty),
        Some(&mut val as *mut u32 as *mut u8),
        Some(&mut size),
    )
    .0 != 0
    {
        return None;
    }
    Some(val)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicBool, Ordering};

    #[test]
    fn flag_guard_resets_on_drop() {
        let flag = AtomicBool::new(true);
        {
            let _guard = FlagGuard(&flag);
            assert!(flag.load(Ordering::SeqCst));
        }
        assert!(!flag.load(Ordering::SeqCst));
    }

    #[test]
    fn answer_payload_serializes_choice_and_text() {
        let choice = AnswerPayload::Choice {
            answers: vec!["B".to_string()],
            verification: None,
        };
        assert_eq!(
            serde_json::to_value(&choice).unwrap(),
            serde_json::json!({ "kind": "choice", "answers": ["B"] })
        );
        let verified = AnswerPayload::Choice {
            answers: vec!["B".to_string()],
            verification: Some(Verification {
                matched: false,
                candidates_matched: false,
                secondary: vec!["C".to_string()],
                error: None,
            }),
        };
        assert_eq!(
            serde_json::to_value(&verified).unwrap(),
            serde_json::json!({
                "kind": "choice",
                "answers": ["B"],
                "verification": {
                    "matched": false,
                    "candidatesMatched": false,
                    "secondary": ["C"]
                }
            })
        );
        let none = AnswerPayload::None {
            reason: "empty".to_string(),
        };
        assert_eq!(
            serde_json::to_value(&none).unwrap(),
            serde_json::json!({ "kind": "none", "reason": "empty" })
        );
        let text = AnswerPayload::Text {
            text: "설명형 답변".to_string(),
        };
        assert_eq!(
            serde_json::to_value(&text).unwrap(),
            serde_json::json!({ "kind": "text", "text": "설명형 답변" })
        );
    }

    #[test]
    fn clipboard_text_is_nul_terminated_utf16() {
        assert_eq!(clipboard_wide("A광"), vec![0x41, 0xAD11, 0]);
    }

    #[test]
    fn autostart_command_quotes_paths_with_spaces() {
        assert_eq!(
            autostart_command(std::path::Path::new(r"C:\Program Files\Cue\cue.exe")),
            r#""C:\Program Files\Cue\cue.exe" --background"#
        );
    }

    #[test]
    fn external_links_are_allowlisted() {
        assert!(link_allowed("https://github.com/gguatit/cue"));
        assert!(link_allowed("https://github.com/gguatit/cue/issues"));
        assert!(link_allowed("https://github.com/gguatit"));
        assert!(link_allowed("https://github.com/gguatit/"));
        assert!(!link_allowed("https://example.com"));
        assert!(!link_allowed("http://github.com/gguatit"));
        assert!(!link_allowed("ms-settings:taskbar"));
        assert!(!link_allowed("https://github.com/gguatit@evil.example"));
        assert!(!link_allowed("https://github.com/gguatit-foo"));
    }

    #[tokio::test]
    async fn wait_cancel_returns_when_the_generation_changes() {
        let (tx, mut rx) = tokio::sync::watch::channel(0u64);
        let mine = *rx.borrow();
        let waiter = tokio::spawn(async move {
            wait_cancel(&mut rx, mine).await;
        });
        tx.send(1).unwrap();
        waiter.await.unwrap();
    }

    #[test]
    fn cancel_generation_wraps() {
        let value = u64::MAX;
        assert_eq!(next_generation(value), 0);
    }

    #[test]
    fn tray_promotion_only_copies_a_visible_cue_icon() {
        assert!(should_promote(false, false, true));
        assert!(!should_promote(true, false, true));
        assert!(!should_promote(false, true, true));
        assert!(!should_promote(false, false, false));
    }

    #[test]
    fn cue_executable_matching_is_case_insensitive() {
        assert!(is_cue_exe(r"C:\ProgramData\Cue\cue.exe"));
        assert!(is_cue_exe(r"C:\home\Cue_App\Cue\CUE.EXE"));
        assert!(!is_cue_exe(r"C:\ProgramData\Cue\cue-guard.exe"));
        assert!(!is_cue_exe(r"C:\ProgramData\Cue\cue.exe.bak"));
    }

    #[test]
    fn verifier_ignores_primary_extra_parameters() {
        let provider = verify_provider("openai", "https://api.openai.com/v1", "gpt-4o-mini", "key");
        assert_eq!(provider.extra, "");
    }
}
