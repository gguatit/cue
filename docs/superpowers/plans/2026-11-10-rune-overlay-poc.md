# Rune Overlay PoC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decide whether Rune can replace Cue's Tauri overlay without losing transparency, click-through, topmost/no-activate behavior, capture exclusion, DPI correctness, or acceptable show latency.

**Architecture:** Build an isolated Windows-only Rust PoC at `poc/rune-overlay/`. Do not modify the Tauri app. Use Rune's `WindowOptions::overlay(display)` for a transparent, borderless, topmost, click-through overlay and `WindowSpec::on_created` for Win32 `SetWindowDisplayAffinity`. If the PoC passes, write a separate integration design; if it fails, delete the PoC.

**Tech Stack:** Rust 2021, Rune pinned to `dev` commit `2bc3179d08355a8bb08fa54b9025780fe848b8f6`, `raw-window-handle` 0.6, `windows` 0.61, Windows 10/11 x64.

**Spec:** The 2026-11-10 Rune review in the current conversation; Cue 0.3.2 overlay behavior; `docs/OUT_OF_SCOPE.md`.

## Global Constraints

- **No production changes.** `src/`, `src-tauri/`, installer, updater, guard, admin copy, and existing release artifacts are off-limits.
- **Windows only.** This PoC targets Windows 10/11 x64.
- **Rune is pre-release.** Pin the exact `dev` rev; never use a moving branch.
- **No copied Swarm code.** Rune is MIT; do not copy Swarm/Swarm Rebuild/swarm-cursors code or assets.
- **No server, account, telemetry, or API keys** in the PoC.
- **Capture protection is fail-closed.** If WDA cannot be applied, the overlay must hide and report failure.
- **No full migration.** Settings UI, AI, tray, LED, brightness, meeting detection, updater, and installer are not part of this PoC.
- **Measure on the same machine and power plan** as the Cue 0.3.2 baseline.
- Use `scripts/measure-resource.ps1` as the reference for process/CPU/memory measurements.

## Review Focus

These are the failure modes a reviewer must check even though normal unit tests do not cover them:

1. **Transparency**: the desktop behind the overlay must show through, not an opaque rectangle.
2. **Click-through**: a click on the overlay must reach the window underneath.
3. **Capture exclusion**: WDA `0x11` must actually remove/hide the overlay in a screen capture. A returned `S_OK` alone is not proof.
4. **Topmost/no-activate**: showing the overlay must not steal focus, add a taskbar button, or activate the app.
5. **DPI/multi-monitor**: overlays must align to each display's physical origin and scale; negative coordinates must work.
6. **Latency and failure**: show/hide must be measured; a failed WDA or raw-handle lookup must not leave a visible unprotected overlay.

## Task 1: Scaffold and Rune API gate

**Files:**
- Create: `poc/rune-overlay/Cargo.toml`
- Create: `poc/rune-overlay/src/main.rs`
- Create: `poc/rune-overlay/README.md`

**Interfaces:**
- Produces: `State { overlay: bool, click_count: u32 }`, `spec() -> AppSpec<State>`, a control window, one overlay per display.
- Gate: confirm the exact signatures of `WindowHandle::with_raw_handle`, `WindowOptions::overlay`, and `WindowHandle::set_click_through` before Task 2. If they differ from the pinned rev, stop and update this plan.

- [ ] **Step 1: Create the isolated crate**

`poc/rune-overlay/Cargo.toml`:

```toml
[package]
name = "rune-overlay-poc"
version = "0.1.0"
edition = "2021"
publish = false

[dependencies]
rune = { git = "https://github.com/anomalyco/rune", rev = "2bc3179d08355a8bb08fa54b9025780fe848b8f6" }
raw-window-handle = "0.6"
windows = { version = "0.61", features = [
  "Win32_Foundation",
  "Win32_UI_WindowsAndMessaging",
] }
```

- [ ] **Step 2: Write the minimal control + overlay scaffold**

`poc/rune-overlay/src/main.rs` starts from Rune's `examples/overlay` pattern:

```rust
use rune::{AppSpec, Color, Cx, El, WindowOptions, WindowSpec, col, el, run_windows, text};

#[derive(Clone, Default)]
struct State {
    overlay: bool,
    click_count: u32,
}

fn init() -> State {
    State::default()
}

fn view(s: &State, _: &mut Cx<State>) -> El {
    if s.overlay {
        return el()
            .w_full()
            .h_full()
            .child(
                el()
                    .padding(12.0)
                    .radius(8.0)
                    .fill(Color::TRANSPARENT)
                    .child(text("RUNE OVERLAY")),
            );
    }

    col()
        .w_full()
        .h_full()
        .padding(32.0)
        .gap(16.0)
        .fill(Color::TRANSPARENT)
        .child(text(format!("underlying clicks: {}", s.click_count)))
        .child(
            el()
                .padding(12.0)
                .radius(8.0)
                .fill(Color::WHITE)
                .child(text("click through the overlay"))
                .on_press(|s: &mut State| s.click_count += 1),
        )
}

fn spec() -> AppSpec<State> {
    AppSpec::new("Rune overlay PoC", (640.0, 420.0), init, view)
}

fn main() {
    run_windows(|displays| {
        let mut windows = vec![WindowSpec::new("controls", spec()).state(init())];

        for (index, display) in displays.iter().enumerate() {
            windows.push(
                WindowSpec::new(format!("overlay-{index}"), spec())
                    .state(State {
                        overlay: true,
                        click_count: 0,
                    })
                    .options(WindowOptions::overlay(display)),
            );
        }

        windows
    });
}
```

- [ ] **Step 3: Verify the API gate and compile**

Run:

```bash
cargo check --manifest-path poc/rune-overlay/Cargo.toml
```

Then inspect the pinned crate docs/source for `with_raw_handle`, `WindowOptions::overlay`, `on_created`, and click-through methods. Record the exact signatures in `poc/rune-overlay/README.md`.

Expected: `cargo check` passes; the gate is documented. If the API is unavailable or has a different shape, stop and update this plan before writing Task 2 code.

- [ ] **Step 4: Run once and confirm two windows**

```bash
cargo run --manifest-path poc/rune-overlay/Cargo.toml
```

Expected: a control window plus one overlay per display. Close them and confirm no panic.

- [ ] **Step 5: Commit**

```bash
git add poc/rune-overlay
git commit -m "chore: scaffold rune overlay poc"
```

## Task 2: Transparency, click-through, topmost, no activate

**Files:**
- Modify: `poc/rune-overlay/src/main.rs`
- Create: `poc/rune-overlay/scripts/inspect-window.ps1`

**Interfaces:**
- Consumes: `WindowOptions::overlay(display)` and the control window.
- Produces: a visible translucent badge over the control window; clicks pass through.

- [ ] **Step 1: Make the overlay visibly translucent and test Korean text**
  - Fill the overlay root with a semi-transparent dark card (`Color { a: 0.55 }`).
  - Keep the rest of the full-display root transparent.
  - Render `B`, `정답은 B입니다`, and a 2,000-character Korean/English mixed string.
  - Confirm Hangul glyphs, wrapping, and scrolling are readable.
  - If the whole window is opaque or Korean text is missing/garbled, stop: transparency/text is a go/no-go failure.

- [ ] **Step 2: Verify click-through**
  - Place the overlay over the control window's click area.
  - Click the covered button.
  - Expected: the control counter increments; the overlay does not receive the click.
  - Run 20 clicks. Expected: exactly 20 increments.

- [ ] **Step 3: Inspect native window styles**

`poc/rune-overlay/scripts/inspect-window.ps1` uses P/Invoke `GetWindowLongPtr`/`GetWindowDisplayAffinity` to print for the overlay:

- `WS_EX_LAYERED`
- `WS_EX_TRANSPARENT`
- `WS_EX_NOACTIVATE`
- `WS_EX_TOOLWINDOW`
- `WS_EX_TOPMOST`
- `GetWindowDisplayAffinity`

Expected before WDA: layered/transparent/no-activate/tool-window/topmost are present. The affinity value is recorded as the baseline.

- [ ] **Step 4: Verify no focus/taskbar side effects**
  - Show/hide the overlay while the control window is focused.
  - Expected: focus does not move to the overlay; no taskbar entry appears; the overlay stays above normal windows.

- [ ] **Step 5: Commit**

```bash
git add poc/rune-overlay
git commit -m "feat: verify rune overlay transparency and click-through"
```

## Task 3: Win32 capture exclusion (fail-closed)

**Files:**
- Create: `poc/rune-overlay/src/wda.rs`
- Modify: `poc/rune-overlay/src/main.rs`
- Create: `poc/rune-overlay/scripts/capture-overlay.ps1`

**Interfaces:**
- Consumes: `WindowSpec::on_created` + `WindowHandle::with_raw_handle`.
- Produces: `exclude_from_capture(window: &WindowHandle) -> Result<(), String>`.

- [ ] **Step 1: Implement the WDA helper**

Use the exact raw-handle closure signature recorded in Task 1:

```rust
use raw_window_handle::RawWindowHandle;
use rune::WindowHandle;
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{
    SetWindowDisplayAffinity, WDA_EXCLUDEFROMCAPTURE,
};

pub fn exclude_from_capture(window: &WindowHandle) -> Result<(), String> {
    window.with_raw_handle(|handle| {
        let RawWindowHandle::Win32(win32) = handle.as_raw() else {
            return Err("not win32".to_string());
        };
        let hwnd = HWND(win32.hwnd.get() as *mut _);
        unsafe { SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE) }
            .map_err(|error| format!("wda: {error}"))
    })
}
```

- [ ] **Step 2: Apply it in `on_created` and fail closed**

```rust
function on_created(window: &WindowHandle) {
    if let Err(error) = wda::exclude_from_capture(window) {
        eprintln!("overlay protection failed: {error}");
        let _ = window.hide();
    }
}
```

If the Rune closure returns a different type or `on_created` does not expose the handle, adapt to the pinned API and record it in README.

- [ ] **Step 3: Capture the overlay**

`poc/rune-overlay/scripts/capture-overlay.ps1` takes a desktop screenshot with `System.Drawing.Graphics.CopyFromScreen` while the overlay is visible over a known background.

Run:

```powershell
powershell -ExecutionPolicy Bypass -File poc/rune-overlay/scripts/capture-overlay.ps1
```

Expected: the overlay must be absent or black/blank in the capture. If the badge is visible, WDA failed; stop the migration study.

- [ ] **Step 4: Verify fail-closed**
  - Temporarily force `exclude_from_capture` to return an error.
  - Expected: the overlay hides; no unprotected badge stays visible.
  - Restore the real call.

- [ ] **Step 5: Commit**

```bash
git add poc/rune-overlay
git commit -m "feat: exclude the rune overlay from captures"
```

## Task 4: Single-display DPI (multi-monitor excluded)

> **Scope change 2026-11-10:** Multi-monitor and negative-coordinate verification is excluded at the user's request because the test laptop has one display. Single-display DPI remains required; residual multi-monitor risk is accepted for Phase 0/2 and must be re-tested only if a second display becomes available.

**Files:**
- Create: `poc/rune-overlay/src/displays.rs`
- Modify: `poc/rune-overlay/src/main.rs`
- Test: inline `#[cfg(test)] mod tests` in `displays.rs`

**Interfaces:**
- Produces: `overlay_label(display_index, scale) -> String`, display-bound overlay placement, and tests for negative coordinate math.

- [ ] **Step 1: Test display math**

Add tests for a display at negative origin, a 150% scale, and a primary display:

```rust
#[test]
fn keeps_negative_origin_and_scale_label() {
    assert_eq!(overlay_label(1, 1.5), "display 1 · 150%");
}
```

- [ ] **Step 2: Show one overlay per display**
  - Keep the existing `WindowOptions::overlay(display)` loop.
  - Put the display index and scale in the badge.
  - If only one monitor is available, record `multi-monitor: not verified` in `RESULTS.md`; do not claim it passes.

- [ ] **Step 3: Verify alignment**
  - On a multi-monitor setup, confirm each overlay covers exactly its display and the badge lands inside that display.
  - On a single monitor, verify 100%/125%/150% scaling and a negative virtual desktop only if available.

- [ ] **Step 4: Commit**

```bash
git add poc/rune-overlay
git commit -m "test: cover rune overlay dpi placement"
```

## Task 5: Show/hide, payload, and latency

**Files:**
- Modify: `poc/rune-overlay/src/main.rs`
- Create: `poc/rune-overlay/RESULTS.md`

**Interfaces:**
- Produces: control-window buttons for `Show B`, `Hide`, `Toggle click-through`; overlay state changes via `WindowHandle::update` or app state; timestamped latency samples.

- [ ] **Step 1: Add overlay state updates**
  - Add a shared `Live`/state value for the displayed letter.
  - `Show B` updates the letter and shows overlays.
  - `Hide` hides overlays.
  - Keep click-through on by default.

- [ ] **Step 2: Measure show latency**
  - Record a monotonic timestamp immediately before `show`.
  - Record when the next overlay frame/paint is visible (or use a change counter).
  - Run 30 show/hide cycles.
  - Write min/median/max to `RESULTS.md`.

- [ ] **Step 3: Compare against Cue**
  - Cue 0.3.2 first-overlay/prewarmed behavior is the baseline.
  - Do not claim parity if the PoC is more than **100ms slower** on warm show.

- [ ] **Step 4: Commit**

```bash
git add poc/rune-overlay
git commit -m "feat: measure rune overlay show latency"
```

## Task 6: Resource measurement and go/no-go

**Files:**
- Modify: `poc/rune-overlay/RESULTS.md`
- Create: `poc/rune-overlay/scripts/measure-rune.ps1`

**Interfaces:**
- Consumes: the PoC binary and the measurement script.
- Produces: a decision record.

- [ ] **Step 1: Measure three states**
  - 60s hidden/no overlay
  - 60s overlay visible over the control window
  - 30min idle with the control window open

Record per state:

- process count
- CPU seconds over 30s
- working set
- private commit
- TCP connections
- show latency

- [ ] **Step 2: Decide**

Pass only if all are true:

- transparency, click-through, topmost/no-activate, and WDA pass;
- multi-monitor/DPI is verified or explicitly accepted as unverified;
- warm show latency is within **100ms** of Cue 0.3.2;
- no crash in the 30-minute idle run;
- memory is lower by at least **20%**, or CPU is not worse and the integration risk is acceptable.

If WDA or transparency fails, the decision is **do not migrate**.

- [ ] **Step 3: Record result**

```markdown
## Decision
- Result: PASS / FAIL / PARTIAL
- Failed checks:
- Resource delta vs Cue 0.3.2:
- Remaining risks:
```

- [ ] **Step 4: Commit**

```bash
git add poc/rune-overlay
git commit -m "docs: record rune overlay poc results"
```

## Task 7: Stop or write integration design

**Files:**
- Delete: `poc/rune-overlay/` if failed
- Create: `docs/superpowers/specs/2026-11-10-rune-overlay-integration-design.md` if passed

- [ ] **Step 1: On failure**
  - Delete the PoC directory.
  - Commit `chore: remove failed rune overlay poc`.
  - Keep Cue on Tauri.

- [ ] **Step 2: On pass**
  - Write the integration design only. Do not implement it in this plan.
  - Cover the IPC boundary, overlay lifecycle, WDA fail-closed, prewarm, settings, updater/installer impact, guard/admin, and rollback.

- [ ] **Step 3: Final verification**
  - Confirm `src/`, `src-tauri/`, `artifacts/`, and release metadata are unchanged.
  - `git status` clean.

## Execution Order

| # | Task | Gate |
|---:|---|---|
| 1 | Scaffold + Rune API gate | `cargo check` and exact raw-handle API recorded |
| 2 | Transparency, click-through, topmost, no activate | 20/20 clicks pass through, no taskbar/focus steal |
| 3 | WDA capture exclusion | overlay absent/blank in capture; fail-closed |
| 4 | Single-display DPI | correct placement; multi-monitor explicitly excluded |
| 5 | Show/hide + latency | warm show within 100ms of Cue |
| 6 | Resource measurement + decision | PASS/FAIL recorded |
| 7 | Remove PoC or write integration design | no production changes |

## Review Checklist

- [ ] No changes outside `poc/rune-overlay/` and `docs/superpowers/`.
- [ ] Rune pinned to `2bc3179d08355a8bb08fa54b9025780fe848b8f6`.
- [ ] WDA `0x11` verified by screenshot, not just return value.
- [ ] Overlay does not activate, focus, or add a taskbar button.
- [ ] Click-through verified against an underlying control.
- [ ] DPI/negative-origin behavior recorded.
- [ ] Warm show latency recorded.
- [ ] If failed, PoC removed and Tauri unchanged.
