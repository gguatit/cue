# Streaming answers and token usage — implementation plan

> **For agentic workers:** implement task by task. Run the listed checks after
> each task. The user asked to start immediately; this session executes natively.

**Goal:** Stream descriptive/free-mode answers with smooth playback and show
provider-reported token usage, both behind settings toggles.

**Architecture:** Rust parses provider SSE and emits sanitized cumulative text
to the overlay; the overlay paces it with requestAnimationFrame. Usage is parsed
from the same responses and returned with the answer.

**Tech Stack:** Rust/Tauri 2, reqwest, serde_json, React 19, zustand, vitest.

**Spec:** `docs/superpowers/specs/2026-11-17-streaming-usage-design.md`

## Global constraints

- No new JS dependencies; no new Rust crates.
- Do not add `temperature`, `model`, `messages`, `input`, `contents`, or
  `stream` to the user-overridable extra JSON.
- Settings version 23; update `defaults`, `mergeSettings`, `settings.test.ts`.
- User strings use `t('English', '한국어')`.
- Multiple-choice JSON never streams.
- Keep capture protection, meeting-safe hiding, panic, and fallback behavior.

## Review focus

- Provider returns non-SSE JSON even when `stream` is true: show the final text,
  do not hang or return an empty panel.
- Stream fails after partial text: replace or hide the panel; never leave stale
  partial text.
- UTF-8 split across network chunks: do not corrupt Korean text.
- Final text arrives while the overlay is still typing: drain fast, then start
  the display timer; do not hide early.
- Usage fields differ or are missing: return `None`/`—`, never invent numbers.

---

### Task 1: Settings and toggles

**Files:**
- Modify: `src/stores/settings.ts`
- Test: `src/stores/settings.test.ts`
- Modify: `src/views/settings/AiTab.tsx`
- Test: `src/views/settings/AiTab.test.tsx`

**Interfaces:**
- `Settings.provider.streaming: boolean` default `true`.
- `Settings.answer.showUsage: boolean` default `true`.
- Persist `version: 23`.

- [ ] Add defaults and merge validation (`bool(...)`).
- [ ] Add two `Toggle`s in the AI tab "응답 동작" group. Streaming hint mentions
      descriptive/free mode and paraphrase; usage hint mentions local-only
      display.
- [ ] Add settings assertions for defaults and stored values; add a render test
      that both labels appear.
- [ ] Run `npm run check` and `npm test -- src/stores/settings.test.ts src/views/settings/AiTab.test.tsx`.

### Task 2: Usage parsing and plumbing

**Files:**
- Modify: `src-tauri/src/ai.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src/lib/tauri.ts`
- Modify: `src/stores/answer.ts`
- Test: `src-tauri/src/ai.rs` (`#[cfg(test)]`)

**Interfaces:**
- `pub struct Usage { input: u64, output: u64, total: u64 }` with camelCase
  serialization.
- `pub fn extract_usage(api: Api, v: &Value) -> Option<Usage>`.
- `post_once`/`post_api` return `(String, Option<Usage>)`.
- `request_answers` returns `(Vec<String>, Option<Usage>)`.
- `request_text`/`request_free` return `(String, Option<Usage>)`.
- `AnswerPayload::Choice { answers, verification, usage }`,
  `AnswerPayload::Text { text, usage, streamed }`.
- TS `TokenUsage { input, output, total }`; `CaptureResult` gains `usage` and
  `streamed`; `LastRequest`/`AnswerHistoryEntry` gain `usage`.

- [ ] Write failing tests for Chat, Anthropic, Google, and Responses usage
      extraction, including missing usage -> `None`.
- [ ] Add `Usage` plus provider extraction; sum usage across correction,
      paraphrase, retry, and cross-check calls.
- [ ] Thread usage through commands and TS types; record it only when
      `answer.showUsage` is on.
- [ ] Run `cargo test --manifest-path src-tauri/Cargo.toml` and `npm run check`.

### Task 3: SSE streaming and fallback

**Files:**
- Modify: `src-tauri/src/ai.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src/lib/tauri.ts`
- Modify: `src/stores/answer.ts`
- Test: `src-tauri/src/ai.rs` (`#[cfg(test)]`)

**Interfaces:**
- `pub struct TextResult { pub text: String, pub usage: Option<Usage> }`.
- `pub async fn request_text_stream(..., on_text: &mut (dyn FnMut(&str) + Send)) -> Result<TextResult, String>`.
- `pub async fn request_free_stream(...)` same shape.
- `capture_and_answer(..., stream: bool)`.
- `stream_done(id: u64, duration_ms: u64)` Tauri command; register in
  `main.rs`.
- Overlay payload gains `{ stream: true, final: bool, id: u64 }`.

- [ ] Write failing tests for SSE delta extraction (Chat, Anthropic, Google,
      Responses), `[DONE]`, multi-line data, and a UTF-8 split chunk.
- [ ] Implement `post_stream_once` with `Response::chunk()`, SSE line buffering,
      sanitized cumulative callbacks, and usage capture. If the response is not
      `text/event-stream`, parse it as a normal JSON response.
- [ ] In `capture_and_answer`, stream only when `stream` is true and paraphrase
      is off. On stream error, retry once through the existing non-stream
      fallback path. On total failure, hide the overlay before returning.
- [ ] Add the internal stream panel start/update helpers and `stream_done`;
      reuse `OVERLAY_GEN` so stale timers cannot hide a newer answer.
- [ ] TS: pass `stream` (text/free, not paraphrase, not meeting-hidden). When
      `streamed` is true, do not call `showOverlay` again in `displayText`.
- [ ] Run `cargo test` and `npm run check`.

### Task 4: Smooth overlay playback

**Files:**
- Create: `src/overlay/streamPacing.ts`
- Test: `src/overlay/streamPacing.test.ts`
- Modify: `src/overlay/OverlayView.tsx`
- Modify: `src/lib/tauri.ts`

**Interfaces:**
- `advanceStream(state: PaceState, target: string, dtMs: number, final: boolean): PaceState`
  with `PaceState { visible: number; carry: number; pauseLeftMs: number }`.
- `streamDone(id: number, durationMs: number)`.

- [ ] Write failing pacing tests: base rate, backlog acceleration, final drain,
      punctuation pause, target shrink clamp.
- [ ] Implement the pure pacer with the spec constants.
- [ ] Overlay: on `overlay-show` with `stream: true`, set the target and keep a
      rAF loop running until the final text is fully visible; then call
      `streamDone` once with the current text duration.
- [ ] Reset stream refs on any normal `overlay-show`; honor
      `prefers-reduced-motion` by showing the full target immediately.
- [ ] Run `npm test -- src/overlay/streamPacing.test.ts` and `npm run check`.

### Task 5: Display usage and finish

**Files:**
- Modify: `src/views/settings/AboutTab.tsx`
- Modify: `docs/CHANGELOG.md`
- Modify: `README.md` (feature list)
- Modify: `AGENTS.md` (version/test counts and streaming note)
- Version files: `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`,
  `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`

- [ ] Show input/output/total tokens in the last-request card and a compact
      token line in history entries when the toggle is on.
- [ ] Run `npm run check`, `npm test`, `cargo test`.
- [ ] Manual check: loopback mock SSE provider, overlay types smoothly; toggle
      streaming off -> final text appears once; toggle usage off -> no token
      line.
- [ ] Bump to 0.5.0, update CHANGELOG/README/AGENTS, build signed installer,
      update artifacts and release.
