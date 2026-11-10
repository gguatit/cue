# Rune Bridge Protocol (Phase 1)

**Date:** 2026-11-10  
**Status:** Proposed. PoC transport verified with a line-command named pipe; JSON framing and the current-user ACL remain production gates.  
**Scope:** Tauri host ↔ one Rune UI sidecar. Overlay first; settings later.

## 1. Purpose

Define the local control channel between Cue's Tauri host and the Rune UI sidecar so the overlay can be displayed without moving API keys, settings authority, or Windows integration into Rune.

The host remains authoritative. The sidecar owns only Rune windows and rendering.

## 2. Process model

```
cue.exe (Tauri host)
  ├─ creates named-pipe server
  ├─ starts rune-ui.exe once
  ├─ assigns it to a job object (kill on host exit)
  └─ sends show/hide/ping; receives ack/pong

rune-ui.exe (Rune sidecar)
  ├─ connects to the pipe
  ├─ creates one overlay window per display (offscreen first)
  ├─ applies WDA and native styles
  ├─ reports affinity/visibility
  └─ never reads keyring or settings directly
```

- One sidecar process per host process.
- One overlay host per display, created lazily when the host first asks.
- The sidecar has no tray, no taskbar entry, and no network listener.
- The host passes the pipe name and parent PID in argv.

## 3. Transport

| Item | Decision |
|---|---|
| Transport | Windows named pipe |
| Direction | Duplex |
| Server | Host process |
| Client | Rune sidecar |
| Pipe name | `\\.\pipe\cue-rune-<host-pid>-<random-128-bit>` |
| ACL | Current user only; no Everyone/Anonymous |
| Framing | 4-byte little-endian length + UTF-8 JSON |
| Maximum frame | 1 MiB |
| Protocol version | `1` |
| Heartbeat | sidecar `pong` within 6s |
| Encoding | JSON, camelCase |

The pipe name is random per host start and is passed only to the child. It must not be written to logs.

## 4. Handshake

### Host → sidecar

```json
{
  "type": "hello",
  "protocol": 1,
  "hostVersion": "0.3.2",
  "sidecarVersion": "0.3.2",
  "build": "rune-2bc3179",
  "capabilities": ["overlay"]
}
```

### Sidecar → host

```json
{
  "type": "ready",
  "protocol": 1,
  "sidecarVersion": "0.3.2",
  "build": "rune-2bc3179",
  "capabilities": ["overlay", "wda"]
}
```

A version mismatch or missing capability disables the Rune flag for this run. The host keeps the Tauri overlay path.

## 5. Overlay messages

### 5.1 Show

```json
{
  "type": "show_overlay",
  "id": 42,
  "answer": "B",
  "style": "badge",
  "durationMs": 8000,
  "verification": {
    "matched": true,
    "candidatesMatched": true,
    "secondary": ["B"],
    "error": null
  },
  "rect": { "x": 1200, "y": 320, "w": 160, "h": 72 },
  "scale": 1.5,
  "protect": true
}
```

Rules:

- `style` is `badge`, `flash`, or `text`.
- `rect` is the physical window rectangle already computed by the host.
- `scale` is the target display's DPI scale, not the window's scale.
- `answer` is the only answer text in the message. It must not be logged.
- `protect` is true whenever content protection is enabled. False only for a
  deliberate diagnostic mode.

### 5.2 Ack

```json
{
  "type": "overlay_ack",
  "id": 42,
  "visible": true,
  "affinity": 17,
  "firstFrameMs": 18.4
}
```

The host treats the answer as displayed only when:

- `visible` is true, and
- `affinity` is `0x11` when `protect` was true.

If either check fails, the sidecar must hide the window before sending an error.

### 5.3 Hide

```json
{ "type": "hide_overlay", "id": 42 }
```

The sidecar hides by `ShowWindow(SW_HIDE)`. On the next show it reapplies the
native styles and WDA after Rune's show event.

### 5.4 Error

```json
{
  "type": "error",
  "id": 42,
  "code": "wda",
  "message": "SetWindowDisplayAffinity failed"
}
```

Error messages must not include answer text, keys, or settings.

## 6. Control messages

### Ping / pong

```json
{ "type": "ping", "id": 7 }
```

```json
{ "type": "pong", "id": 7 }
```

### Shutdown

```json
{ "type": "shutdown" }
```

The sidecar hides all windows, closes the pipe, and exits with code 0. The host
waits 1s, then terminates the job if the child is still alive.

## 7. Overlay lifecycle

The sidecar owns the proven PoC lifecycle:

1. Create the overlay **visible offscreen**.
2. Apply `WDA_EXCLUDEFROMCAPTURE` before the first onscreen pixel.
3. Apply `WS_EX_LAYERED|TRANSPARENT|TOOLWINDOW|NOACTIVATE`, remove
   `WS_EX_APPWINDOW`, and verify affinity `0x11`.
4. Build the first frame offscreen.
5. Move the window to `rect`.
6. Send `overlay_ack`.
7. Hide with `ShowWindow(SW_HIDE)` at `durationMs`.
8. On the next show, reapply styles/WDA after Rune's show drain.

The hidden `visible=false` creation path is not used because Rune's show reset
the native styles in the PoC.

## 8. Failure behavior

| Failure | Host behavior |
|---|---|
| Sidecar fails to start | Keep Tauri overlay while flag is off; fail closed if flag is on |
| Pipe connect timeout | Kill/restart once, then fallback |
| Protocol mismatch | Disable Rune flag for this run |
| No ack within 250ms | Treat as failed; do not consider the answer shown |
| `affinity != 0x11` | Hide; report `wda`; do not display unprotected |
| Sidecar crash | Reap job; fallback or fail closed |
| Malformed frame | Close pipe; restart once; log code only |
| Version/build mismatch | Disable Rune flag for this run |

## 9. Security boundaries

- The pipe is local and current-user scoped. No TCP listener.
- The sidecar never receives API keys, settings blobs, history, or profiles.
- The host computes geometry and passes only the payload needed for one answer.
- The sidecar path is resolved from the installed host directory. The host must
  reject a sidecar outside `Program Files\Cue` or the protected ProgramData copy.
- The sidecar is assigned to a job object with kill-on-close and no breakaway.
- Answer text is never written to logs or crash metadata.
- The sidecar does not open URLs, read the clipboard, or access the keyring.

## 10. Versioning

- Protocol version is explicit; no implicit downgrade.
- Sidecar build hash is reported in `hello`/`ready`.
- Host disables Rune UI on mismatch; it does not attempt partial compatibility.
- A future protocol change needs a new version and a separate migration plan.

## 11. Test plan for Phase 2

- Framing: partial reads, max size, invalid UTF-8, oversized frame.
- Handshake: version mismatch, missing capability, duplicate ready.
- Show: normal ack, timeout, `affinity=0` error, hide after duration.
- Lifecycle: host exit kills sidecar; sidecar crash reaped; no orphan.
- Security: non-current-user pipe connect denied; answer text absent from logs.
- Overlay: offscreen prewarm, first-frame WDA, hide/show reharden, Korean text.
- Multi-monitor: one overlay per display, negative origin, DPI scaling.

## 12. Open decisions before Phase 2

1. Sidecar binary name and Tauri `externalBin` packaging.
2. Whether the overlay sidecar starts at host startup or on first prewarm.
3. Whether icon/Tauri resources are shared or duplicated.
4. Whether the fallback on failure is the Tauri overlay or no display when the flag is on.
5. Whether text scrolling is required; click-through currently prevents interactive scrolling.
