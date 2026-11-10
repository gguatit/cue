# Rune Overlay PoC — Results

**Date:** 2026-11-10  
**Rune rev:** `2bc3179d08355a8bb08fa54b9025780fe848b8f6`  
**Machine:** Windows 10/11 x64, 1707×1067 primary display, 144 DPI (150%)  
**Result:** **PARTIAL — offscreen prewarm and hide/show pass; multi-monitor excluded; integrated sidecar resources remain unverified.**

## Task results

| Task | Result | Evidence |
|---|---|---|
| 1. Scaffold + API gate | PASS | `cargo check` and `cargo build` pass; pinned Rune rev |
| 2. Transparency | PASS | Semi-transparent card; desktop visible behind it |
| 2. Click-through | PASS | Overlay covered the control button; count incremented |
| 2. Topmost/no-activate | PASS after native fix | `Topmost=True`, `NoActivate=True`, `ToolWindow=True`, `APPWINDOW` removed |
| 3. WDA | PASS | `GetWindowDisplayAffinity = 0x11`; screen capture contained no overlay |
| 4. DPI | PASS on single display | 1707×1067 physical, 144 DPI, full-display overlay at 0,0 |
| 4. Multi-monitor | EXCLUDED by user | Laptop has one display; residual risk accepted |
| 5. Lazy/prewarm creation | PASS via offscreen workaround | Create visible offscreen, build first frame, then move onscreen |
| 5. Hidden `visible=false` path | REJECTED for integration | Delayed show renders, but Rune's show resets EX styles |
| 5. First visible frame | PASS | WDA is applied before the offscreen window is moved onscreen |
| 5. Hide/show | PASS | `ShowWindow` + 120ms reharden; final EX style stays `0x080801B8` |
| 5. Long/Korean text | PASS for wrapping | Korean/English long text wraps inside the card |
| 5. Text scrolling | NOT VERIFIED | Click-through intentionally passes pointer/wheel input |
| 6. Resources | PARTIAL | Idle release process: ~169MB WS, ~145MB private, 0 CPU seconds/30s |
| 7. Decision | PARTIAL | Keep PoC; multi-monitor excluded; integrated sidecar resources remain |

## Critical findings

1. **Rune's Windows overlay defaults are not enough for Cue's stealth style.**
   `WindowOptions::overlay` produced `WS_EX_LAYERED`, `WS_EX_TRANSPARENT`,
   `WS_EX_TOPMOST`, and `WS_EX_APPWINDOW`, but not `WS_EX_NOACTIVATE` or
   `WS_EX_TOOLWINDOW`. The PoC applies those styles through the raw Win32 handle.

2. **Rune's show path overwrites native styles.**
   Applying styles inside `on_created` was overwritten when Rune processed its
   queued show. The PoC applies styles after creation and re-applies them after
   a later `ShowWindow(SW_SHOWNOACTIVATE)`.

3. **Hidden creation is not a safe lazy path.**
   `visible=false` followed by show can render, but Rune's show resets the
   native styles and leaves a first-pixel/style gap. The PoC instead creates the
   overlay **visible offscreen**, builds the first frame, applies WDA and styles,
   then moves it to the display.

4. **WDA works on the Rune window.**
   The actual screenshot with `WDA_EXCLUDEFROMCAPTURE` showed no overlay card.
   Affinity was `0x11`.

5. **Click-through works.**
   A click on the overlay card over the control window incremented the control
   counter. No additional hit-test workaround was needed.

6. **Korean text and wrapping render.**
   Short and long Korean/English text rendered and wrapped. Interactive
   scrolling is not available while click-through is enabled.

## Resource note

The PoC is a single Rune process. Cue 0.3.1 was measured at 134.1MB WS /
226.4MB private with a WebView2 tree; this is not an apples-to-apples comparison.
The integrated sidecar would add a process while the main WebView remains until
Phase 5, so a net resource win is not established.

## Control-channel harness (stdio, not yet named pipe)

`scripts/bridge-test.ps1` starts the release sidecar with `--stdio` and exercises
the future host/sidecar messages. This validates message semantics and the
offscreen lifecycle, not the final named-pipe transport.

| Measurement | Result |
|---|---|
| `ready` | 1,376ms (includes Rune startup + 350ms hardening) |
| `show` ack | 265ms (includes 150ms style-settle wait) |
| `hide` ack | 63ms (includes 20ms settle) |
| Show state | affinity `0x11`, `visible=true` |
| Hide state | affinity `0x11`, `visible=false` |
| Sidecar WS / private | 135.7MB / 124.8MB |
| Sidecar CPU at ready | 0.266s |
| Sidecar process count | 1 |

The 265ms show ack is not the real UI latency; the harness deliberately waits
for Rune's queued show styles to drain before acknowledging. Production should
use an event-driven ack instead of a fixed sleep.

## Decision

**PARTIAL.** The main Windows overlay path is proven, including lazy/prewarm via
offscreen creation and native hide/show. These gates remain:

- Multi-monitor and negative-coordinate verification: **excluded by user** (laptop single display).
- Measure the integrated sidecar + Tauri host, not the standalone PoC.
- Decide whether long text needs interactive scrolling or only wrapping.
- Design the bridge lifecycle/fallback around the offscreen prewarm model.
- Replace the stdio harness with the named-pipe transport and event-driven ack.

Do not proceed to Phase 2 production integration until the integrated resource
gate is reviewed. Multi-monitor remains excluded by user request.
