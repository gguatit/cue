# Rune Overlay PoC

Isolated Windows-only PoC for the Rune overlay migration study. It does not modify the
Tauri app, installer, updater, guard, or release artifacts.

## Run

```bash
cargo run --manifest-path poc/rune-overlay/Cargo.toml
```

Rune is pinned to `2bc3179d08355a8bb08fa54b9025780fe848b8f6`.

## API gate

Verified against the pinned Rune revision:

- `WindowOptions::overlay(&Display) -> Self` creates a transparent, borderless,
  click-through, always-on-top window at the display's physical position and size.
- `WindowHandle::with_raw_handle<R>(&self, f: impl for<'a> FnOnce(winit::raw_window_handle::WindowHandle<'a>) -> R) -> Result<R, String>` exposes the raw Win32 handle while the window is alive.
- `WindowHandle::hide()`/`show()` do not return a `Result`.
- `WindowSpec::on_created` is available for attaching native window behavior.
- Rune's Windows overlay implementation is covered upstream by `cargo xwin clippy` only;
  runtime behavior is the point of this PoC.

## Status

Core transparency, click-through, topmost/no-activate, WDA, single-monitor DPI,
offscreen lazy/prewarm creation, native hide/show with rehardening, and Korean
long-text wrapping pass.

The selected lifecycle is:

1. Create the overlay **visible offscreen**.
2. Apply WDA before moving it onscreen.
3. Build/harden the first frame.
4. Move it to the target display.
5. Hide/show with `ShowWindow` and reapply styles after show.

The result is **PARTIAL**: multi-monitor, interactive text scrolling, and the
integrated sidecar resource cost remain unverified. See `RESULTS.md`.

## Control-channel harness

`--stdio` runs only the overlay and accepts line commands on stdin:

```text
show -> ack show affinity=0x11 visible=true
hide -> ack hide affinity=0x11 visible=false
ping -> pong
quit
```

The harness validates the future host/sidecar message semantics without a
production Tauri change.

```powershell
cargo build --release --manifest-path poc/rune-overlay/Cargo.toml
powershell -ExecutionPolicy Bypass -File poc/rune-overlay/scripts/bridge-test.ps1
```

## Test switches

- `RUNE_POC_MODE=offscreen` (default), `visible`, or `hidden`
- `RUNE_POC_NO_WDA=1` to make the overlay visible in screenshots
- `RUNE_POC_AUTOHIDE=1` to hide/show automatically for lifecycle testing
- `scripts/inspect-window.ps1` prints Win32 styles, position, and WDA
- `scripts/capture-screen.ps1` saves a desktop screenshot
