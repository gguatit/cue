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

The result is **PARTIAL**: multi-monitor is excluded by user request (laptop
single display), interactive text scrolling is unverified, and the integrated
sidecar resource cost remains unmeasured. The named-pipe harness passes. See
`RESULTS.md`.

## Control-channel harness

The sidecar accepts line commands over stdin (`--stdio`) or a named pipe
(`--pipe <name>`):

```text
hello -> ready
show  -> ack show affinity=0x11 visible=true
hide  -> ack hide affinity=0x11 visible=false
ping  -> pong
quit
```

`bridge_host.exe` is the Rust pipe-server harness. It creates a current-process
pipe, starts the sidecar as the client, sends `hello`, waits for `ready` only
after the overlay is hardened, then runs 20 show/hide cycles:

```powershell
cargo build --release --manifest-path poc/rune-overlay/Cargo.toml --bins
powershell -ExecutionPolicy Bypass -File poc/rune-overlay/scripts/bridge-pipe-test.ps1
```

The stdio harness remains available for comparison:

```powershell
powershell -ExecutionPolicy Bypass -File poc/rune-overlay/scripts/bridge-test.ps1
```

The PoC pipe is local and randomly named, but it still uses the default Windows
pipe DACL and a line protocol. Production integration still needs an explicit
current-user ACL, JSON framing, and read timeouts.

## Test switches

- `RUNE_POC_MODE=offscreen` (default), `visible`, or `hidden`
- `RUNE_POC_NO_WDA=1` to make the overlay visible in screenshots
- `RUNE_POC_AUTOHIDE=1` to hide/show automatically for lifecycle testing
- `scripts/inspect-window.ps1` prints Win32 styles, position, and WDA
- `scripts/capture-screen.ps1` saves a desktop screenshot
