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

Core transparency, click-through, topmost/no-activate, WDA, and single-monitor DPI pass.
The result is **PARTIAL**: hidden/lazy overlay creation, long-text scrolling, multi-monitor,
and first-visible-frame timing remain unverified. See `RESULTS.md`.
