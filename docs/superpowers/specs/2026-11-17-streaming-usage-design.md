# Streaming answers and token usage — design

## Intent

Descriptive and free-mode answers currently appear only after the whole response
arrives. Stream the text so the first words show sooner, but smooth the output so
model bursts do not look choppy. Also show token usage for the last request and
for answer history, with a toggle to turn each behavior off.

## Goals

- Stream only descriptive and free-mode answers. Multiple-choice JSON and
  cross-check keep the existing request path.
- Smooth playback: a small jitter buffer, character-level output, adaptive
  catch-up, punctuation pauses, and a fast final drain.
- Show input/output/total tokens for the last request and each history entry.
- Add two settings toggles: `provider.streaming` and `answer.showUsage`, both on
  by default.
- Keep the existing provider routing, retry policy, fallback model, capture
  protection, meeting-safe hiding, and panic behavior.

## Non-goals

- Streaming multiple-choice JSON.
- Word-level segmentation or a new animation library.
- A second provider, OCR, or server-side changes.
- Exact billing reconciliation. Usage is the provider-reported token count for
  successful calls made for that answer.

## Constraints

- No new JavaScript dependencies. No new Rust crate; use
  `reqwest::Response::chunk()` and the existing `serde_json`.
- Settings shape change requires `defaults`, `mergeSettings`, `version`, and
  `settings.test.ts` updates. New version: 23.
- User-facing strings use `t('English', '한국어')`.
- The overlay is always dark; streaming must not alter its look.
- No `temperature`, `model`, `messages`, `input`, `contents`, or `stream`
  overrides from user extra JSON.

## Approach

### Streaming

Rust opens the same provider request with streaming enabled and consumes the
response with `Response::chunk()`. A small SSE parser turns Chat Completions,
Anthropic Messages, Google generateContent, and OpenAI Responses events into
text. Each delta is appended to a buffer; the sanitized cumulative text is sent
to the overlay at most every 80 ms. The overlay renders the latest target text
with a requestAnimationFrame player:

- Start after 100 ms or the first six characters.
- Base rate 45 chars/s; rate = max(45, backlog / 0.8 s), capped at 500 chars/s.
- Punctuation pause: 80 ms after `.?!`, 40 ms after `,`, 100 ms after a newline,
  only when the backlog is below 60 characters.
- When the final event arrives, ignore pauses and drain the remaining buffer
  within about 0.6 s, then start the configured text display timer.
- `prefers-reduced-motion` shows the full text immediately.

Rust sends a special `overlay-show` payload with `stream: true`, `final`, and a
generation `id`. The overlay keeps the stream target in refs, updates the DOM
text through React state at display rate, and calls `stream_done(id, textMs)`
when the final character is shown. A stale `stream_done` is ignored by checking
the current overlay generation.

If a stream fails before or after showing text, the command falls back once to
the existing non-stream path. On success, the fallback result is marked
`streamed: false`, so the main store displays it through the normal
`show_overlay` path and replaces any partial text. If both fail, Rust hides the
overlay before returning the error.

### Token usage

Add `Usage { input, output, total }` to `ai.rs`. Extract it from each provider's
non-stream response and from stream usage events. Accumulate usage across
retries, correction requests, paraphrase, and cross-check calls. Return it in
`AnswerPayload` and store it in `LastRequest` and history entries when
`answer.showUsage` is on.

Provider mappings:

- Chat Completions: `usage.prompt_tokens`, `completion_tokens`, `total_tokens`;
  streaming uses `stream_options.include_usage`.
- Anthropic Messages: `usage.input_tokens`, `output_tokens`; streaming uses
  `message_start` / `message_delta` usage.
- Google: `usageMetadata.promptTokenCount`, `candidatesTokenCount`,
  `totalTokenCount`.
- Responses: `usage.input_tokens`, `output_tokens`, `total_tokens`; streaming
  uses the `response.completed` event.

If a streamed provider does not report usage, show `—` rather than guessing.

## Settings and UI

| Key | Default | UI |
| --- | --- | --- |
| `provider.streaming` | `true` | AI tab, "응답 동작" group: "서술형 스트리밍" |
| `answer.showUsage` | `true` | AI tab, same group: "토큰 사용량 표시" |

The streaming toggle only affects descriptive/free answers. Paraphrase turns
streaming off for that request because the final text depends on a second call.
The usage toggle controls both storage and display; when off, the store drops
the usage object before recording it.

## Risks

- Providers differ in SSE framing and may omit usage on streams.
- Streaming starts before the meeting check can run a second time. The existing
  1.5 s meeting poll still hides the overlay; a meeting that starts in the first
  1.5 s can briefly see the panel.
- The overlay's fixed stream panel can resize once when the final text arrives.
- A very fast model can produce a large backlog; the catch-up cap keeps it
  bounded but the text may move quickly for a moment.
