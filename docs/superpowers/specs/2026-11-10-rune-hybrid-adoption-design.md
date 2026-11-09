# Rune Hybrid Adoption — Precise Analysis and Target Architecture

**Date:** 2026-11-10  
**Status:** Proposed  
**App:** Cue 0.3.2  
**Decision:** Hybrid, phased adoption. Tauri host remains until Rune proves each surface.

## 1. Goal

Move as much **user-visible UI** as safely possible to Rune, one surface at a time, while keeping Cue's Rust core, security invariants, updater, installer, and protection behavior intact.

This is not a big-bang Tauri replacement. The first production Rune surface is the overlay; the settings/main UI follows only after settings ownership moves out of WebView localStorage.

## 2. Non-goals for this program

- Do not rewrite AI, capture, meeting detection, LED, brightness, guard, elevation, or updater in Rune.
- Do not remove Tauri, WebView2, NSIS, or the signed updater until a separate final-phase decision.
- Do not change the update endpoint, signature verification, keyring storage, admin copy rules, or capture-protection rules.
- Do not introduce a server, account, telemetry, or remote IPC.
- Do not copy Swarm/Swarm Rebuild code or assets.

## 3. Current system evidence

### 3.1 Windows and UI

| Item | Current behavior | Evidence |
|---|---|---|
| Main window | React settings shell, 880×640, label `main` | `src-tauri/src/windows.rs:179-189`, `src/App.tsx:22` |
| Overlay | React, transparent, borderless, always-on-top, click-through, lazy creation | `src-tauri/src/windows.rs:191-209` |
| Overlay rendering | Badge, flash, or text panel from `overlay-show` payload | `src/overlay/OverlayView.tsx:5-81` |
| Main/overlay branch | Same `index.html`, webview label chooses view | `src/App.tsx:22-36` |
| Default windows config | Empty; windows are created in Rust | `src-tauri/tauri.conf.json` `app.windows: []` |
| Capture exclusion | `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` and `GetWindowDisplayAffinity` | `src-tauri/src/windows.rs:41-96` |
| Fail-closed overlay | Hides overlay if WDA cannot be applied or affinity is not `0x11` | `src-tauri/src/commands.rs:424-469` |
| Overlay delivery | `OverlayDelivery { ready, pending }`; first answer waits for `overlay_ready` | `src-tauri/src/commands.rs:19-23`, `:484-523` |
| Overlay timer | Rust thread hides after `duration_ms`, guarded by generation | `src-tauri/src/commands.rs:496-504` |
| Overlay prewarm | `set_overlay_prewarm`, shortcut prewarm; only when overlay/flash/text/free is used | `src-tauri/src/commands.rs:742`, `src/lib/startup.ts` |

### 3.2 IPC and events

| Surface | Count | Notes |
|---|---:|---|
| Tauri invoke commands | **54** | `src-tauri/src/main.rs:153-208` |
| Frontend wrappers | **~70** | `src/lib/tauri.ts`, 239 lines |
| Tauri events | **11** | `trigger-answer`, `panic`, `gesture-test`, `open-help`, `show-last`, `copy-last`, `tray-clear`, `main-shown`, `main-blurred`, `overlay-show`, `update-progress` |
| Overlay event payload | Small JSON | `answer`, `style`, optional `text`, optional `verification` |

The overlay path is narrow. The settings path is broad: API keys, model lists, shortcuts, guard, Defender, updater, autostart, theme, and tray all run through invoke commands.

### 3.3 Persistence

| Data | Owner | Storage |
|---|---|---|
| Settings | WebView frontend | localStorage `cue-settings`, zustand persist **v21** |
| Settings profiles | WebView frontend | localStorage `cue-profiles` |
| Answer history / errors | WebView frontend | localStorage `cue-history`, `cue-errors` |
| Update last-check | WebView frontend | localStorage `cue-update-check` |
| API keys | Rust | Windows Credential Manager/keyring |
| Guard / admin / service | Rust | `C:\ProgramData\Cue`, HKLM `Software\Cue`, tasks/service |
| Update manifest / signature | Rust | GitHub Releases + updater plugin |

**Critical finding:** the settings UI cannot simply be redrawn in Rune. Rune has no access to the existing WebView localStorage. Moving the settings window requires moving settings ownership to Rust (or a shared local service) first.

### 3.4 Tauri-bound capabilities

| Capability | Current implementation | Migration risk |
|---|---|---|
| Tray | `tauri::tray` | High; keep host |
| Global shortcuts/mouse hook | `src-tauri/src/shortcut.rs` | High; keep Rust |
| Updater | `tauri-plugin-updater` | High; keep host until final phase |
| NSIS installer/hooks | `src-tauri/windows/hooks.nsh` | High; keep host |
| Single instance | `tauri-plugin-single-instance` | High; keep host |
| Autostart | `tauri-plugin-autostart` | Medium; keep host |
| Guard/service/admin | `guard.rs`, `elevation.rs` | High; keep Rust |
| Capture/AI | `capture.rs`, `ai.rs`, `models.rs` | Keep Rust; UI-only boundary |

## 4. Coupling analysis

| Surface | Data coupling | Process coupling | Security coupling | Migration order |
|---|---|---|---|---|
| Overlay | Low | Medium | High (WDA) | **1st** |
| Overlay prewarm/lifecycle | Low | Medium | High | 1st, with overlay |
| Settings window | High | High | Medium | 2nd, after storage migration |
| Onboarding/help | Medium | Medium | Low | with settings |
| Tray/menus | Low UI | High OS | Medium | keep host |
| Updater/installer | Low UI | High | High | keep host / final phase |
| Guard/admin/service | Low UI | High | High | keep Rust |

### Why overlay first

1. It has a small payload and no settings dependency.
2. It is the highest-risk Windows behavior (transparency, click-through, WDA, DPI) and must be proven before any larger UI work.
3. A failure leaves Cue's current overlay untouched.
4. It can be measured against the current overlay without a settings migration.

### Why settings cannot be second blindly

The settings UI is the entire main window, and its data lives in WebView localStorage. A Rune settings window without a Rust-owned settings service would create two sources of truth. The safe sequence is:

1. Move settings to a Rust-owned store and keep the React UI reading/writing through a thin adapter.
2. Verify migration from v21 localStorage, profiles, history, and errors.
3. Only then render the settings window in Rune.

## 5. Target architecture

```
Tauri host process (Rust, Windows integration)
  ├─ settings service (JSON + schema, keyring)        Phase 3
  ├─ AI / capture / meeting / LED / brightness
  ├─ tray / shortcuts / updater / installer / guard
  └─ local named-pipe bridge                         Phase 1
        └─ Rune UI sidecar (one process)
             ├─ overlay window(s)                    Phase 2
             ├─ settings / onboarding windows        Phase 4
             └─ WDA fail-closed + accessibility
```

### Host authority

The Tauri process remains authoritative for:

- API keys and provider requests
- capture and monitor geometry
- settings and profile persistence
- updater, installer, autostart, single-instance
- tray, guard, elevation, service
- meeting detection and panic

Rune only renders UI and sends user intent/state changes back.

### Bridge

- **Transport:** Windows named pipe, current-user ACL. No TCP listener.
- **Encoding:** length-prefixed JSON or JSON lines; versioned protocol.
- **Messages:** `hello`, `show_overlay`, `hide_overlay`, `overlay_ack`, `ping`, `pong`, `shutdown`.
- **Security:** random pipe name per session, current-user SID ACL, maximum message size, protocol version check, no API keys in messages.
- **Failure:** missing ack or failed WDA hides the overlay; host may fall back to the Tauri overlay while the feature flag is off.
- **Lifecycle:** one sidecar; host starts it on first Rune surface use, monitors heartbeat, and kills it on exit; no orphan process.

### Rune overlay ownership

The sidecar owns the Rune window, WDA, click-through, positioning, text rendering, timer, and hide behavior. The host sends the payload and geometry. The host must not consider the answer displayed until `overlay_ack` reports a protected window.

## 6. Phase roadmap

| Phase | Scope | Output | Gate |
|---|---|---|---|
| **0. Overlay PoC** | Separate `poc/rune-overlay` | Feasibility result | Transparency, click-through, WDA, DPI, latency |
| **1. Bridge design** | Protocol, lifecycle, threat model | `rune-bridge-protocol` spec | Security review + rollback approved |
| **2. Overlay sidecar** | Rune overlay behind a flag | `rune-overlay` sidecar + host bridge | Flag-off parity; flag-on canary |
| **3. Settings storage** | Rust-owned settings, no Rune UI yet | Settings service + migration | v21 migration, no data loss |
| **4. Rune settings UI** | Settings/onboarding/help in Rune | Rune UI behind a flag | UI parity, accessibility, theme |
| **5. Cutover** | Rune overlay/settings default; no WebView windows | WebView2 not instantiated | Full regression + uninstall/update matrix |
| **6. Optional host removal** | Replace Tauri tray/updater/installer | Separate architecture decision | Not part of this program |

### Phase 0 details

Use `docs/superpowers/plans/2026-11-10-rune-overlay-poc.md`. Add a Korean/long-text gate: the overlay must render Korean answers, long text, wrapping, and scrolling. Rune's embedded Inter font may not cover Hangul; this is a make-or-break test.

### Phase 1 deliverables

- Named-pipe protocol spec with exact message schemas.
- Process lifecycle and orphan prevention.
- WDA handshake and fail-closed behavior.
- Feature flag and fallback path.
- Threat model: local pipe ACL, message size, malformed input, replayed messages.
- Rollback: disable flag, kill sidecar, use Tauri overlay.

### Phase 2 deliverables

- `apps/rune-overlay` or promoted PoC binary.
- `src-tauri/src/rune_bridge.rs` host bridge.
- Feature flag default **off**; no automatic rollout.
- Tauri overlay remains the fallback.
- Canary measurement: process count, CPU, memory, show latency, WDA capture test.
- No removal of existing overlay code in this phase.

### Phase 3 deliverables

- Rust settings store with schema version matching v21.
- One-time migration from localStorage; export/import remains compatible.
- React settings continue to work through the new adapter.
- History/errors/profiles migration plan.
- This phase can ship without Rune and is independently valuable.

### Phase 4 deliverables

- Rune settings/onboarding/help windows.
- Host-mediated settings and keyring access.
- Dark/light/system theme and accent parity.
- Korean/English strings and accessibility.
- Feature flag; React settings remains fallback until parity is proven.

### Phase 5 deliverables

- Rune overlay/settings default.
- `index.html`/React settings not loaded in production; overlay WebView not created.
- Tauri host still owns tray/updater/installer/guard.
- Full matrix: capture exclusion, update, uninstall, guard, admin, sleep/resume, multi-monitor, DPI.

### Phase 6 (not planned)

Full Tauri removal requires replacing updater, NSIS hooks, tray, autostart, single-instance, and guard integration. It is a separate project with its own design and release gates.

## 7. Risks and mandatory checks

| Risk | Impact | Mitigation |
|---|---|---|
| Rune Windows overlay unproven | Core UI may not work | Phase 0 runtime checks; Rune docs only verify Windows with clippy |
| Korean font coverage | Answers/settings unreadable | Korean/long-text gate in Phase 0 and Phase 4 |
| WDA on Rune surface | Capture leak | Fail-closed; screenshot proof |
| Sidecar increases process count | Resource regression | Measure hidden/visible/idle; compare integrated |
| IPC latency | Slow first answer | Prewarm; latency gate |
| Settings localStorage split | Data loss/desync | Phase 3 before Phase 4 |
| Sidecar packaging/update | Broken install/admin copy | Package sidecar; update/uninstall matrix |
| Orphan sidecar | Resource leak | Host-owned lifecycle + heartbeat |
| Rune pre-release API | Build breakage | Pin exact `dev` rev; update only with a plan |
| Accessibility/theme parity | Regression | Phase 4 acceptance matrix |

## 8. Open decisions

1. Should the final state keep Tauri as an invisible host for tray/updater/installer, or remove it entirely? Recommended: keep the host; remove WebView windows only.
2. Is the sidecar allowed to run permanently in speed mode, or only on demand? Decide after measurement.
3. Should settings storage move to Rust before any Rune settings work? Recommended: yes, mandatory.
4. Should Rune own tray/menus, or only windows? Recommended: only windows initially.
5. Is Korean text rendering acceptable in Rune with embedded fonts, or must we bundle a Korean font? Decide in Phase 0/1.

## 9. Acceptance for the program

- Each phase has a feature flag or a reversible release.
- No capture leak in any phase.
- No settings loss in Phase 3/4.
- No update/install/guard regression in Phase 5.
- Performance measured, not assumed.
- Tauri app remains releaseable until the final cutover.
