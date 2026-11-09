# Rune Hybrid Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt Rune incrementally for Cue's user-visible UI, starting with the overlay, while keeping the Tauri host and Rust core authoritative until each surface is proven.

**Architecture:** Tauri remains the Windows host (settings authority, AI/capture, tray, shortcuts, updater, installer, guard). A single Rune UI sidecar renders surfaces one at a time, connected through a current-user named pipe. Every phase is feature-flagged and reversible.

**Tech Stack:** Rust 2021, Rune pinned to `2bc3179d08355a8bb08fa54b9025780fe848b8f6`, Tauri 2, Windows 10/11 x64, named-pipe IPC.

**Spec:** `docs/superpowers/specs/2026-11-10-rune-hybrid-adoption-design.md`

## Global Constraints

- **No big-bang migration.** One surface and one feature flag at a time.
- **No production changes in Phase 0/1.** Phase 0 is an isolated PoC; Phase 1 is a written design only.
- **Tauri remains the host** until Phase 5 acceptance.
- **No server, account, telemetry, or remote IPC.** Named pipe is local and current-user scoped.
- **No API keys in Rune messages.** Keyring access stays in the host.
- **WDA is fail-closed.** A Rune overlay that cannot prove `0x11` must never remain visible.
- **Settings storage must move to Rust before Rune renders settings.** Do not create two sources of truth.
- **Korean and long text are mandatory** for overlay and settings acceptance.
- **Pin Rune to the exact `dev` rev.** No moving branch.
- **Measure, do not assume.** Every resource or latency claim needs a recorded number.
- **No release until the phase gate passes.** Keep Cue 0.3.2 releaseable throughout.

## Review Focus

1. **Windows overlay behavior**: transparency, click-through, topmost/no-activate, taskbar absence, WDA, and DPI. Rune's Windows overlay path is only clippy-checked upstream.
2. **Korean text**: Hangul, mixed Korean/English, long text, wrapping, scrolling, and font fallback.
3. **Bridge security**: named-pipe ACL, malformed messages, message size, version mismatch, replay, and orphan sidecar.
4. **State ownership**: settings localStorage vs Rust store; no dual writes, no lost profiles/history/errors.
5. **Packaging**: sidecar in NSIS, updater replacement, admin protected copy, uninstall cleanup, and single-instance startup.
6. **Resource truth**: sidecar process count/latency may offset WebView2 savings; integrated measurement is required.

## Phase 0: Overlay PoC (existing plan)

**Plan:** `docs/superpowers/plans/2026-11-10-rune-overlay-poc.md`

**Files:**
- Modify: `docs/superpowers/plans/2026-11-10-rune-overlay-poc.md`
- Later create: `poc/rune-overlay/**`

- [ ] **Step 1: Add the Korean/long-text gate to the PoC plan**

Add to the PoC's Task 2 and Task 5:

```text
Render at least:
- "B" (badge)
- "정답은 B입니다" (Korean badge)
- a 2,000-character Korean/English mixed text panel
- wrapped multi-line text with scrolling

Pass only if all are readable, correctly wrapped, and clipped inside the overlay.
```

- [ ] **Step 2: Execute the PoC only after plan approval**

Run the seven tasks in `2026-11-10-rune-overlay-poc.md`. Do not modify production `src/` or `src-tauri/`.

- [ ] **Step 3: Record the gate result**

Write `poc/rune-overlay/RESULTS.md` with PASS/FAIL and measured values. If FAIL, remove the PoC and stop the program.

## Phase 1: Bridge Protocol Design

**Files:**
- Create: `docs/superpowers/specs/2026-11-10-rune-bridge-protocol.md`
- Create: `docs/superpowers/specs/2026-11-10-rune-bridge-threat-model.md`

**Interfaces:**
- Produces: protocol version, pipe name rule, ACL, message schemas, timeouts, failure codes, lifecycle, and fallback rules.

- [ ] **Step 1: Define the transport and framing**

Document:

- pipe name `\\.\pipe\cue-rune-<session>-<random>`
- current-user SID ACL
- length-prefixed JSON, maximum message size (proposal: 1 MiB)
- protocol version and build hash in `hello`
- one request id per message
- heartbeat every 2s; dead after 6s

- [ ] **Step 2: Define messages**

```text
hello        { protocol, sidecar_version, build }
ready        { protocol, overlays: bool }
show_overlay { id, answer, style, duration_ms, verification?, rect, scale }
hide_overlay { id? }
overlay_ack  { id, affinity, visible }
ping         { id }
pong         { id }
shutdown     { }
error        { id?, code, message }
```

The host must treat `overlay_ack.affinity != 0x11` as a failure and hide the overlay.

- [ ] **Step 3: Define lifecycle and failure behavior**

- Host starts the sidecar on first Rune use; one instance only.
- Sidecar starts hidden; no taskbar entry; no activation.
- If the sidecar exits, the host kills the pipe, logs the failure, and uses the Tauri overlay fallback while the flag is off.
- On host exit, send `shutdown`, wait 1s, then terminate the child.
- No orphan process after crash; use a job object or parent-process check.

- [ ] **Step 4: Write the threat model**

Cover: local pipe squatting, ACL bypass, malformed JSON, oversized messages, replay, protocol downgrade, answer-text disclosure in logs, sidecar path hijack, and DLL search order.

- [ ] **Step 5: Review gate**

Do not write Phase 2 code until the protocol and threat model are reviewed and approved.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs
git commit -m "docs: define the rune bridge protocol"
```

## Phase 2: Overlay Sidecar Behind a Flag

**Prerequisite:** Phase 0 PASS and Phase 1 approved.

**Output:**
- One Rune sidecar binary.
- Host bridge module.
- Hidden feature flag default off.
- Tauri overlay remains the fallback.

This phase requires its own implementation plan after Phase 1, because the sidecar API, packaging, and measurements depend on the PoC result. Do not start it from this document.

**Required design decisions before implementation:**

- Sidecar binary path and Tauri `externalBin` packaging.
- Settings flag name and default (`off`).
- Whether the sidecar runs only when the overlay is enabled/prewarmed.
- Canary scope and rollback.
- Integrated resource measurement plan.

**Acceptance:**

- Flag off: byte-for-byte behavior of the current overlay path.
- Flag on: transparency, click-through, WDA, DPI, Korean text, and latency pass.
- No orphan sidecar after app exit or crash.
- No API key or settings data crosses the pipe.

## Phase 3: Settings Storage Migration

**Prerequisite:** Phase 2 stable or explicitly paused.

**Why:** Rune cannot read WebView localStorage. The React settings UI and any future Rune settings UI need one authoritative store.

**Output:**
- Rust-owned settings service with the same v21 schema.
- One-time migration from `cue-settings` localStorage.
- React settings still works through the new adapter.
- Profiles/history/errors migration plan or compatibility layer.

This phase ships **without Rune** and is independently valuable. It requires its own implementation plan.

**Acceptance:**

- Existing v21 settings migrate with no loss.
- Export/import round-trips.
- Profiles, history, and errors are not lost.
- React settings passes the existing UI tests.
- No secrets in the settings file; keys remain in keyring.

## Phase 4: Rune Settings/Onboarding UI

**Prerequisite:** Phase 3 complete.

**Output:**
- Rune settings, onboarding, and help windows behind a flag.
- Host-mediated settings reads/writes and keyring access.
- Dark/light/system theme and accent parity.
- Korean/English strings and accessibility.

This phase requires its own implementation plan after the settings service is stable.

**Acceptance:**

- React and Rune settings produce identical state changes.
- No dual writes or lost updates.
- Keyboard navigation, focus, and screen-reader basics pass.
- 880×640 and 640×480 layouts have no overflow.
- Rune can fall back to React settings by flag.

## Phase 5: Cutover

**Prerequisite:** Phase 2 and Phase 4 stable.

**Output:**
- Rune overlay/settings default.
- Production does not create WebView windows.
- Tauri host remains for tray, shortcuts, updater, installer, guard, and AI.
- React settings remains available as a hidden fallback for one release.

**Acceptance matrix:**

- Update from 0.3.2-era install to the Rune build.
- UAC/passive install; admin protected copy still valid.
- Guard, service, scheduled tasks, uninstall hooks.
- Capture exclusion with screen recording and screen share.
- Sleep/resume, session switch, Explorer restart.
- Multi-monitor/DPI and negative coordinates.
- Korean/English, light/dark/system, 880×640/640×480.
- No orphan process; no startup regression.

## Phase 6: Optional Full Tauri Removal

Not planned in this program. It requires replacing the updater, NSIS hooks, tray, autostart, single-instance, and guard integration. Decide only after Phase 5 has shipped and measured.

## Execution Order

| # | Phase | Deliverable | Gate |
|---:|---|---|---|
| 1 | 0 | Rune overlay PoC | Transparency, click-through, WDA, DPI, Korean, latency |
| 2 | 1 | Bridge protocol + threat model | Security review approved |
| 3 | 2 | Overlay sidecar behind flag | Flag-off parity; flag-on canary |
| 4 | 3 | Rust settings store | v21 migration, no data loss |
| 5 | 4 | Rune settings/onboarding | UI parity, accessibility, theme |
| 6 | 5 | Cutover | Full regression/update/uninstall matrix |
| 7 | 6 | Optional host removal | Separate decision |

## Plan Self-Review

- **Spec coverage:** overlay PoC, bridge, sidecar, settings ownership, Rune settings, cutover, optional host removal.
- **Scope:** no production code in Phase 0/1; later phases have separate plans.
- **Type consistency:** settings schema v21, overlay payload fields, `0x11` affinity, one sidecar.
- **Review Focus:** six failure modes above each have a gate.
- **No placeholders:** later implementation details are explicitly deferred to separate plans after their prerequisites, not left as TODOs in this program.
