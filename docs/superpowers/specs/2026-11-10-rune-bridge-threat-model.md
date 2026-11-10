# Rune Bridge Threat Model (Phase 1)

**Date:** 2026-11-10  
**Scope:** Tauri host ↔ Rune UI sidecar named pipe.

## Assets

| Asset | Sensitivity |
|---|---|
| API keys | Critical; must never enter the bridge |
| Answer text | Sensitive; never logged |
| Settings/profile data | Sensitive; host-only initially |
| Overlay window | Security boundary; must be WDA-protected |
| Sidecar executable | Integrity-critical |
| Pipe name/handle | Control-plane secret |

## Trust boundaries

1. Host process → child process creation.
2. Host pipe server → sidecar pipe client.
3. Rune/Win32 window → desktop compositor and capture APIs.
4. Packaged sidecar path → Windows loader.

## Threats and mitigations

| Threat | Impact | Mitigation |
|---|---|---|
| Another local process squats the pipe name | Spoofed overlay control | Random 128-bit pipe name; host creates server first; current-user ACL |
| Pipe ACL too broad | Local user process reads answers | Owner-only DACL; deny network/anonymous; verify connect SID |
| Malformed/oversized JSON | Crash or resource exhaustion | 1 MiB cap; length prefix validation; serde errors close pipe |
| Protocol downgrade | Old sidecar bypasses WDA | Exact protocol/capability match; disable Rune on mismatch |
| Replayed `show_overlay` | Stale answer shown | Monotonic IDs; host cancels older IDs; sidecar hides on unknown id |
| API key leakage | Credential theft | Keys never sent; host-only keyring access |
| Answer logged | Privacy loss | Log IDs/codes/lengths only; no body logging |
| Sidecar path hijack | Arbitrary code execution | Resolve beside installed host; reject paths outside Program Files/ProgramData; signed installer |
| DLL search-order hijack | Code execution | Sidecar uses system DLL search defaults; no writable CWD reliance |
| Orphan sidecar | Resource leak/visible process | Job object kill-on-close; parent PID check; shutdown handshake |
| Sidecar crash | No answer/no overlay | Reap job; fallback or fail closed; never leave stale window |
| WDA failure | Capture leak | Hide immediately; ack error; host does not count as displayed |
| First-pixel exposure | Capture leak | Offscreen creation + WDA before onscreen; no `visible=false` path |
| Rune show resets styles | Taskbar/activation leak | Reapply styles after show; verify affinity |
| Answer in crash dump | Privacy loss | Disable full dumps for sidecar; no answer in panic messages |
| Sidecar reads clipboard/URLs | Data exfiltration | Don't expose APIs; code review; no network code |

## Security invariants

- No network listener in the sidecar.
- No API keys or settings in bridge messages.
- No answer text in logs.
- WDA is mandatory before first onscreen pixel.
- If protection cannot be verified, hide and fail closed.
- The sidecar is replaceable only through the signed installer/updater.
- The host treats sidecar output as untrusted input.

## Residual risks

- A same-user process with debug privileges can inspect another process or the pipe.
- Kernel drivers, capture cards, cameras, and hypervisors can bypass WDA.
- Rune is pre-release; an upstream bug may require a pinned patch.
- A malicious signed release remains the highest-impact supply-chain risk.

## Phase 2 security acceptance

- Pipe ACL test: non-current-user connect denied.
- Malformed/oversized frame tests.
- No answer text in sidecar/host logs after a show/hide cycle.
- WDA `0x11` verified before onscreen move; screenshot proof.
- Host exit/crash leaves no sidecar process.
- Sidecar path outside the install root rejected.
