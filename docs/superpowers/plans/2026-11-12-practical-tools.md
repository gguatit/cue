# Practical Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add practical local tools that improve daily Cue use: per-answer history actions, last-request diagnostics, and optional quit cleanup.

**Architecture:** Keep all data local. Extend the existing Zustand stores and settings v22 shape, add a small amount of answer metadata from Rust for fallback reporting, and intercept tray Quit only long enough to run optional frontend cleanup with a native exit fallback.

**Tech Stack:** React 19, Zustand 5, Motion, Tauri 2, Rust, Windows keyring/clipboard APIs.

**Spec:** Current Cue 0.4.7 behavior and the 2026-11-12 product discussion. This plan is the design authority.

## Global Constraints

- No server, account, telemetry, or analytics calls.
- No API key or answer text in logs.
- No new JavaScript dependencies.
- Overlay and tray remain dark; overlay remains click-through and capture-protected.
- Existing uninstaller, guard, admin, updater signing, and update endpoint behavior must not break.
- Settings shape change requires `defaults` + `mergeSettings` + version 22 + tests.
- New user-visible strings use `t('English', '한국어')`; new errors get an `ERRORS` pair.
- Tests: existing 203 TS / 157 Rust must stay green; add focused tests.
- No installer execution by the agent.

## Review Focus

1. **Quit cleanup cannot hang exit:** a frontend failure must still exit from the native fallback.
2. **Pinned history must survive rotation:** adding new answers must not silently drop pinned entries.
3. **Fallback metadata must be truthful:** false/unknown must never be shown as “fallback used”.
4. **Last-request data stays local:** no persistence unless history is enabled; no export.
5. **Clipboard failure is non-fatal:** quit cleanup continues if the clipboard is locked.
6. **History/list buttons remain keyboard-accessible** and do not trigger the overlay.

---

### Task 1: Settings v22 quit-cleanup flags

**Files:**
- Modify: `src/stores/settings.ts`
- Modify: `src/stores/settings.test.ts`
- Modify: `src/lib/settingsBackup.test.ts`

**Interfaces:**
- Produces:

```ts
export interface ClearOnQuit {
  history: boolean
  errors: boolean
  clipboard: boolean
}
```

- `storage.clearOnQuit: ClearOnQuit`, all defaults `false`.
- `setStorage` accepts partial `storage`; existing callers remain valid.

- [ ] **Step 1: Add defaults and merge**

Add `clearOnQuit` to the defaults and `mergeSettings`. Unknown/missing values become `false`. Bump persist version to **22**.

- [ ] **Step 2: Add tests**

In `settings.test.ts`:
- defaults contain all three false
- importing old settings without the field fills false
- partial `{ history: true }` fills the other two false
- malformed values become false

- [ ] **Step 3: Verify**

Run `npm run check` and `npm test -- src/stores/settings.test.ts src/lib/settingsBackup.test.ts`.

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add src/stores/settings.ts src/stores/settings.test.ts src/lib/settingsBackup.test.ts
git commit -m "feat: add quit cleanup settings"
```

### Task 2: History copy, delete, and pin

**Files:**
- Modify: `src/stores/answer.ts`
- Modify: `src/stores/answer.test.ts`
- Modify: `src/views/settings/AboutTab.tsx`
- Modify: `src/i18n.ts`

**Interfaces:**
- Extend:

```ts
export interface AnswerHistoryEntry {
  ts: number
  answers: string[]
  text?: string
  verification?: Verification
  pinned?: boolean
}
```

- Add store methods:

```ts
copyHistory: (index: number) => Promise<void>
removeHistory: (index: number) => void
toggleHistoryPin: (index: number) => void
```

- Keep `MAX_HISTORY = 10` as the total cap.

- [ ] **Step 1: Add a pure trim helper and tests**

Add `historyAfterAdd(history, entry): AnswerHistoryEntry[]`:
- newest first
- pinned entries retained first
- unpinned entries fill remaining slots up to 10
- if pinned count exceeds 10, keep the 10 newest pinned

Tests:
- 10 unpinned + new entry drops oldest
- pinned oldest survives 10 new entries
- pinning an existing entry reorders safely
- total never exceeds 10

- [ ] **Step 2: Implement actions**

- `copyHistory(index)`: copy `text ?? answers.join(', ')` via existing `copyText`; log `clipboard` on failure.
- `removeHistory(index)`: remove only that entry and persist.
- `toggleHistoryPin(index)`: toggle `pinned`, then trim via `historyAfterAdd`-equivalent.
- Use these actions in `run` when adding text/choice history so pinned rotation is consistent.
- `showLast` and `copyLast` keep using index 0.

- [ ] **Step 3: Add AboutTab actions**

For each history row, add accessible small buttons:
- Copy
- Pin / Unpin
- Delete

Keep the timestamp and text layout. Use `aria-label` with the action and row time. Do not nest buttons inside a button.

- [ ] **Step 4: Add i18n strings**

Add Korean/English pairs for copy, pin, unpin, delete, delete confirmation if needed, and “Pinned”.

- [ ] **Step 5: Verify**

Run `npm run check`, `npm test -- src/stores/answer.test.ts`, and open Vite with history seeded from localStorage. Test copy, pin, delete, and adding a new answer.

- [ ] **Step 6: Commit**

```bash
git add src/stores/answer.ts src/stores/answer.test.ts src/views/settings/AboutTab.tsx src/i18n.ts
git commit -m "feat: add history actions and pinning"
```

### Task 3: Truthful fallback metadata

**Files:**
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/ai.rs` only if helper signatures need returning fallback status
- Modify: `src/lib/tauri.ts`
- Modify: `src/stores/answer.ts`

**Interfaces:**
- Extend `CaptureResult` choice/text variants with `fallback?: boolean`.
- Extend fallback helpers to return `(value, usedFallback)` or a small struct; do not expose model names in logs.
- `fallback` is `true` only when the fallback request actually produced the returned value.

- [ ] **Step 1: Add failing Rust tests**

Test pure decision metadata where possible:
- primary success → false
- primary failure + fallback success → true
- fallback configured but not used → false
- no fallback configured → false

- [ ] **Step 2: Thread metadata through**

Update `answers_with_fallback`, `text_with_fallback`, `free_with_fallback`, and `capture_and_answer` result construction. Keep the existing error mapping and retry behavior unchanged.

- [ ] **Step 3: Update TS type and answer store**

Add `fallback?: boolean` to choice/text results. Do not display “fallback” when undefined.

- [ ] **Step 4: Verify**

Run `cargo test --manifest-path src-tauri/Cargo.toml --quiet`, `npm run check`, and focused answer tests.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands.rs src/lib/tauri.ts src/stores/answer.ts src/stores/answer.test.ts
git commit -m "feat: report fallback usage"
```

### Task 4: Last request info

**Files:**
- Modify: `src/stores/answer.ts`
- Modify: `src/stores/answer.test.ts`
- Modify: `src/views/settings/AboutTab.tsx`
- Modify: `src/i18n.ts`

**Interfaces:**
- Add non-persisted state:

```ts
export interface LastRequest {
  at: number
  ms: number
  kind: 'choice' | 'text' | 'none' | 'error'
  provider: string
  model: string
  fallback: boolean
  verification?: Verification
  error?: string
}
```

- Add `lastRequest: LastRequest | null` and `setLastRequest` internal updates.

- [ ] **Step 1: Measure duration**

In `run`, capture `const started = performance.now()` before `captureAndAnswer`; record on success, none, or error. Sample answers record `kind` but are not sent to AI; do not claim network latency for samples.

- [ ] **Step 2: Store model/provider/fallback/verification**

Use the provider settings at request start, not after await. Store error code, not raw response text.

- [ ] **Step 3: Add AboutTab card**

Add a small “Last request” group:
- time
- duration ms/s
- provider · model
- fallback used / primary
- verification result if present
- error code if failed

Hide the group when `lastRequest` is null.

- [ ] **Step 4: Verify**

Run `npm run check`, `npm test`; in Vite with Tauri IPC unavailable, simulate store state or use a focused test. Do not add a network call for diagnostics.

- [ ] **Step 5: Commit**

```bash
git add src/stores/answer.ts src/stores/answer.test.ts src/views/settings/AboutTab.tsx src/i18n.ts
git commit -m "feat: show last request details"
```

### Task 5: Quit-cleanup path

**Files:**
- Modify: `src-tauri/src/tray.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/main.rs` if command registration changes
- Modify: `src/lib/tauri.ts`
- Modify: `src/lib/startup.ts`
- Modify: `src/lib/startup.test.ts`
- Modify: `src/stores/answer.ts`
- Modify: `src/views/settings/GeneralTab.tsx`

**Interfaces:**
- Add `clearForQuit` action in answer store using settings’ `storage.clearOnQuit`.
- Add `quitApp()` wrapper if not already present.
- Tray emits `quit-requested`; Rust schedules a **800ms fallback exit** that disarms and exits even if the webview fails.

- [ ] **Step 1: Add the frontend cleanup action**

```ts
clearForQuit: () => Promise<void>
```

- if `history` true: clear history
- if `errors` true: clear errors
- if `clipboard` true: `clearClipboard()` and ignore failure
- never change stored settings

- [ ] **Step 2: Add startup listener**

In `startup.ts`, listen for `quit-requested`; call `clearForQuit`; then `quitApp()`. Register the panic listener first as today. Ensure the listener is removed on cleanup.

- [ ] **Step 3: Change tray Quit**

In `tray.rs`, replace the direct exit with:
1. `app.emit("quit-requested", ())`
2. spawn a thread: sleep 800ms; `guard::disarm(); app.exit(0)`

If no main webview exists, disarm and exit immediately.

- [ ] **Step 4: Add Privacy UI**

In `GeneralTab` Privacy group, add a “Quit cleanup” subsection with three toggles:
- Clear answer history on quit
- Clear error log on quit
- Clear clipboard on quit

Default all off. Add a short note that cleanup runs only when Cue is quit from the tray/app, not when Windows terminates the process.

- [ ] **Step 5: Test**

- `startup.test.ts`: quit event triggers cleanup and quit command; cleanup errors do not call quit twice; listener cleanup.
- `answer.test.ts`: `clearForQuit` respects each toggle and clipboard failure.
- Rust/NSIS untouched except tray quit; run cargo test.
- Manual Tauri test: tray Quit with all off/on; verify app exits, no guard revival, history/clipboard behavior.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/tray.rs src-tauri/src/commands.rs src-tauri/src/main.rs src/lib/tauri.ts src/lib/startup.ts src/lib/startup.test.ts src/stores/answer.ts src/views/settings/GeneralTab.tsx
git commit -m "feat: add optional quit cleanup"
```

### Task 6: Verification and release 0.4.8

- [ ] **Step 1: Full checks**

```bash
npm run check
npm test
cargo test --manifest-path src-tauri/Cargo.toml
npm run build
```

Expected: existing 203/157 plus new tests pass.

- [ ] **Step 2: Vite UI verification**

- History copy/pin/delete with 10+ entries
- Pinned entry survives new answers
- Last request card hidden before first request and populated after
- Privacy toggles persist and merge old settings
- 640×480 no overflow
- Keyboard focus on all new actions
- Reduced motion unchanged

- [ ] **Step 3: Real Tauri verification**

- Tray Quit with cleanup off: immediate exit
- Tray Quit with cleanup on: no hang, history/error/clipboard cleared
- Guard/admin still exits cleanly; no revival
- Overlay/tray behavior unchanged
- Auto-update 0.4.7 → 0.4.8 after release

- [ ] **Step 4: Version/docs**

Bump to **0.4.8** in package/Cargo/tauri/locks; add CHANGELOG and AGENTS current version/test counts.

- [ ] **Step 5: Release**

Signed build; artifacts; BOM-less latest.json; GitHub release latest.

## Not Planned

- Follow-up questions, OCR, multi-question, direct crop.
- Server/telemetry diagnostics export.
- Tray recent-answer submenu.
- Automatic clipboard copy after every answer.
- Overlay text selection/scroll redesign.
