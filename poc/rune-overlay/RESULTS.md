# Rune Overlay PoC — Results

**Date:** 2026-11-10  
**Rune rev:** `2bc3179d08355a8bb08fa54b9025780fe848b8f6`  
**Machine:** Windows 10/11 x64, 1707×1067 primary display, 144 DPI (150%)  
**Result:** **PARTIAL — core overlay path works; do not integrate yet.**

## Task results

| Task | Result | Evidence |
|---|---|---|
| 1. Scaffold + API gate | PASS | `cargo check` and `cargo build` pass; pinned Rune rev |
| 2. Transparency | PASS | Semi-transparent card; desktop visible behind it |
| 2. Click-through | PASS | Overlay covered the control button; count incremented to 1 |
| 2. Topmost/no-activate | PASS after native fix | `Topmost=True`, `NoActivate=True`, `ToolWindow=True`, `APPWINDOW` removed |
| 3. WDA | PASS | `GetWindowDisplayAffinity = 0x11`; screen capture contained no overlay |
| 4. DPI | PASS on single display | 1707×1067 physical, 144 DPI, full-display overlay at 0,0 |
| 4. Multi-monitor | NOT VERIFIED | Only one display available |
| 5. Native hide/show | PASS (API only) | hide 1.9ms, show 1.1ms |
| 5. First visible frame | NOT MEASURED | Native timing does not include Rune's first frame |
| 5. Long/Korean text | PARTIAL | Korean rendered in the initial visible overlay; long wrapped text not verified |
| 6. Resources | PARTIAL | Idle release process: 169.0MB WS, 145.5MB private, 0 CPU seconds/30s |
| 7. Decision | PARTIAL | Keep PoC; fix render/first-frame gates before Phase 1 |

## Critical findings

1. **Rune's Windows overlay defaults are not enough for Cue's stealth style.**
   `WindowOptions::overlay` produced `WS_EX_LAYERED`, `WS_EX_TRANSPARENT`,
   `WS_EX_TOPMOST`, and `WS_EX_APPWINDOW`, but not `WS_EX_NOACTIVATE` or
   `WS_EX_TOOLWINDOW`. The PoC applies those styles through the raw Win32 handle.

2. **Rune's show path overwrites native styles.**
   Applying styles inside `on_created` was overwritten when Rune processed its
   queued show. Styles must be applied after Rune's show event. The PoC applies
   them from the app poll 350ms after creation.

3. **A hidden-created overlay (`visible = false`) produced no visible card in this PoC.**
   With `visible = false`, then `WindowHandle::show()`, the window was visible but
   no overlay content appeared in captures. `visible = true` rendered the card.
   The integration design must solve lazy creation / prewarm and first-frame
   protection without relying on this path.

4. **WDA works on the Rune window.**
   The actual screenshot with `WDA_EXCLUDEFROMCAPTURE` showed no overlay card.
   Affinity was `0x11`.

5. **Click-through works.**
   A click on the overlay card over the control window incremented the control
   counter. No additional hit-test workaround was needed.

6. **Korean text rendered.**
   The initial visible overlay displayed the Korean string. The long-text panel
   still needs a dedicated scroll/wrap test.

## Resource note

The PoC is a single Rune process. Cue 0.3.1 was measured at 134.1MB WS /
226.4MB private with a WebView2 tree; this is not an apples-to-apples comparison.
The integrated sidecar would add a process while the main WebView remains until
Phase 5, so a net resource win is not established.

## Decision

**PARTIAL.** The core overlay proves feasible, but these gates remain:

- Fix hidden/lazy creation and first visible frame timing.
- Prove WDA remains applied before the first visible pixel.
- Add a real long-text scroll/wrap panel and verify Korean/English.
- Verify multi-monitor and negative coordinates on a two-display system.
- Measure integrated sidecar + Tauri host resources, not the standalone PoC.

Do not proceed to Phase 1 bridge implementation until these pass.
