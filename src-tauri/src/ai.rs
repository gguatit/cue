use std::time::{Duration, Instant};

use serde_json::{json, Value};

// 스펙 부록 A의 프롬프트 원문을 format! 템플릿으로 옮긴 것.
// 리터럴 중괄호는 {{ }}로 이스케이프, 플레이스홀더는 {cx} {cy} {w} {h}.
pub fn build_prompt(cx: i32, cy: i32, w: u32, h: u32) -> String {
    format!(
        "You are an assistant that answers multiple-choice exam questions from a screenshot.\n\nThe attached image is a screenshot of one display. The user's mouse cursor is at pixel ({cx}, {cy}) in this image (image size: {w}x{h} pixels).\n\nTask:\n1. Find the multiple-choice question closest to the cursor position.\n2. Read the question text and its answer options (labeled A-E, 1-5, or similar).\n3. Determine the single correct answer.\n\nReply with ONLY a JSON object in exactly this format, with no other text and no markdown:\n{{\"answers\":[\"X\"]}}\n\nRules:\n- \"answers\" is an array of answer labels, most confident first. Usually one entry. Use at most 4 entries.\n- Use the label exactly as printed (e.g. \"B\", \"3\", \"①\").\n- If no readable multiple-choice question is visible near the cursor, reply {{\"answers\":[]}}."
    )
}

fn language_rule(language: &str) -> &'static str {
    match language {
        "ko" => "Answer in Korean.",
        "en" => "Answer in English.",
        _ => "Answer in the same language as the question.",
    }
}

fn level_rule(level: &str) -> &'static str {
    match level {
        "concise" => "Keep the answer short: one to three sentences.",
        "detailed" => "Answer in detail, explaining the reasoning and key steps.",
        _ => "Give a clear, balanced answer with a brief explanation.",
    }
}

pub fn build_text_prompt(
    cx: i32,
    cy: i32,
    w: u32,
    h: u32,
    language: &str,
    level: &str,
) -> String {
    format!(
        "You are an assistant that answers exam questions from a screenshot.\n\nThe attached image is a screenshot of one display. The user's mouse cursor is at pixel ({cx}, {cy}) in this image (image size: {w}x{h} pixels).\n\nTask:\n1. Find the question closest to the cursor position.\n2. Read the question and any context needed to answer it.\n3. Answer the question.\n\nLanguage: {}\nLevel: {}\n\nRules:\n- Reply with only the answer text, not the question.\n- Use plain text: no markdown, no HTML, no bullet lists, and no extra commentary.\n- If no readable question is visible near the cursor, reply with an empty string.",
        language_rule(language),
        level_rule(level),
    )
}

pub fn build_free_prompt(
    cx: i32,
    cy: i32,
    w: u32,
    h: u32,
    instruction: &str,
    language: &str,
    level: &str,
) -> String {
    let instruction = instruction.trim();
    let instruction = if instruction.is_empty() {
        "Explain the content near the cursor clearly and concisely."
    } else {
        instruction
    };
    format!(
        "You are a helpful assistant that explains what is visible in a screenshot.\n\nThe attached image is a screenshot of the user's display. The mouse cursor is at pixel ({cx}, {cy}) (image size: {w}x{h} pixels). Focus on the content near the cursor.\n\nTask:\n- Explain or help with the content near the cursor.\n- If it is a question, answer it.\n- If it is code, explain what it does.\n- If it is text, summarize, explain, or translate it as requested.\n\nUser instruction: {instruction}\nLanguage: {}\nLevel: {}\n\nRules:\n- Reply with plain text only: no markdown, no HTML, no bullet lists, and no extra commentary.\n- Do not mention that you are an AI.\n- If nothing readable is visible, reply with an empty string.",
        language_rule(language),
        level_rule(level),
    )
}

fn paraphrase_prompt(text: &str) -> String {
    format!(
        "Rewrite the following answer once so it is clear and natural, keeping the same meaning and language. Keep it concise and use plain text only: no markdown, no HTML, no bullet lists, and no extra commentary.\n\nAnswer:\n{text}\n\nReply with only the rewritten answer."
    )
}

pub fn sanitize_text(s: &str) -> String {
    let visible: String = s.chars().filter(|c| !is_invisible(*c)).collect();
    strip_html_tags(&visible).trim().to_string()
}

fn is_invisible(c: char) -> bool {
    matches!(
        c,
        '\u{200B}'..='\u{200D}'
            | '\u{FEFF}'
            | '\u{202A}'..='\u{202E}'
            | '\u{2066}'..='\u{2069}'
            | '\u{FE0E}'..='\u{FE0F}'
            | '\u{E0100}'..='\u{E01EF}'
            | '\u{00AD}'
    )
}

fn strip_html_tags(s: &str) -> String {
    let chars: Vec<char> = s.chars().collect();
    let mut out = String::with_capacity(s.len());
    let mut i = 0;
    while i < chars.len() {
        if chars[i] == '<' {
            if let Some(end) = tag_end(&chars, i) {
                i = end + 1;
                continue;
            }
        }
        out.push(chars[i]);
        i += 1;
    }
    out
}

fn tag_end(chars: &[char], start: usize) -> Option<usize> {
    let mut i = start + 1;
    if chars.get(i) == Some(&'/') {
        i += 1;
    }
    if !chars.get(i)?.is_ascii_alphabetic() {
        return None;
    }
    i += 1;
    while let Some(&c) = chars.get(i) {
        if c == '>' {
            return Some(i);
        }
        if c == '<' {
            return None;
        }
        i += 1;
    }
    None
}

#[derive(Debug, PartialEq)]
pub enum ParseError {
    Format,
    Empty,
}

pub fn parse_answers(content: &str) -> Result<Vec<String>, ParseError> {
    let obj = balanced_object(content).ok_or(ParseError::Format)?;
    let v: Value = serde_json::from_str(obj).map_err(|_| ParseError::Format)?;
    let arr = v
        .get("answers")
        .and_then(|a| a.as_array())
        .ok_or(ParseError::Format)?;
    let mut out: Vec<String> = arr
        .iter()
        .filter_map(|x| x.as_str())
        .filter_map(clean_label)
        .collect();
    out.truncate(4);
    if out.is_empty() {
        Err(ParseError::Empty)
    } else {
        Ok(out)
    }
}

#[derive(Debug, PartialEq)]
pub struct Consensus {
    pub answers: Vec<String>,
    pub matched: bool,
    pub secondary: Vec<String>,
    pub error: Option<String>,
}

pub fn merge_consensus(
    primary: Result<Vec<String>, String>,
    secondary: Result<Vec<String>, String>,
) -> Result<Consensus, String> {
    match (primary, secondary) {
        (Ok(primary), Ok(secondary)) => Ok(Consensus {
            matched: primary.first() == secondary.first(),
            answers: primary,
            secondary,
            error: None,
        }),
        (Ok(primary), Err(error)) => Ok(Consensus {
            answers: primary,
            matched: false,
            secondary: Vec::new(),
            error: Some(error),
        }),
        (Err(error), Ok(secondary)) => Ok(Consensus {
            answers: secondary,
            matched: false,
            secondary: Vec::new(),
            error: Some(error),
        }),
        (Err(error), Err(_)) => Err(error),
    }
}

fn clean_label(raw: &str) -> Option<String> {
    let t = raw
        .trim()
        .trim_matches(|c| c == '"' || c == '\'')
        .trim()
        .to_string();
    let n = t.chars().count();
    if (1..=8).contains(&n) && !t.is_empty() {
        Some(t)
    } else {
        None
    }
}

fn balanced_object(s: &str) -> Option<&str> {
    let start = s.find('{')?;
    let mut depth = 0i32;
    let mut in_str = false;
    let mut esc = false;
    for (i, b) in s.bytes().enumerate().skip(start) {
        if in_str {
            if esc {
                esc = false;
            } else if b == b'\\' {
                esc = true;
            } else if b == b'"' {
                in_str = false;
            }
            continue;
        }
        match b {
            b'"' => in_str = true,
            b'{' => depth += 1,
            b'}' => {
                depth -= 1;
                if depth == 0 {
                    return s.get(start..=i);
                }
            }
            _ => {}
        }
    }
    None
}

pub struct Provider<'a> {
    pub preset: &'a str,
    pub base_url: &'a str,
    pub model: &'a str,
    pub extra: &'a str,
    pub key: &'a str,
}

/// OpenCode Zen exposes different native APIs per model family.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Api {
    Chat,
    Anthropic,
    Google,
    Responses,
}

pub fn api_for(preset: &str, model: &str) -> Api {
    let m = model.trim().to_ascii_lowercase();
    match preset {
        "opencode-go" => {
            if m.starts_with("claude-") || m.starts_with("qwen3.") || m == "minimax-m3" {
                Api::Anthropic
            } else if m.starts_with("gemini-") {
                Api::Google
            } else if m.starts_with("gpt-") || m.starts_with("grok-") || m.starts_with("muse-") {
                Api::Responses
            } else {
                Api::Chat
            }
        }
        "opencode" => {
            if m.starts_with("claude-")
                || m.starts_with("qwen3.5")
                || m.starts_with("qwen3.6")
                || m.starts_with("qwen3.7")
                || m.starts_with("qwen3.8-flash")
            {
                Api::Anthropic
            } else if m.starts_with("gemini-") {
                Api::Google
            } else if m.starts_with("gpt-") || m.starts_with("grok-") || m.starts_with("muse-") {
                Api::Responses
            } else {
                Api::Chat
            }
        }
        _ => Api::Chat,
    }
}

#[cfg(test)]
pub fn endpoint(preset: &str, base_url: &str, model: &str) -> String {
    endpoint_for(base_url, model, api_for(preset, model))
}

fn append_path(base: &str, path: &str) -> String {
    let Ok(mut url) = reqwest::Url::parse(base) else {
        return format!("{}/{}", base.trim_end_matches('/'), path);
    };
    if let Ok(mut segments) = url.path_segments_mut() {
        segments.pop_if_empty();
        for part in path.split('/') {
            segments.push(part);
        }
    }
    url.to_string()
}

fn endpoint_for(base_url: &str, model: &str, api: Api) -> String {
    let base = base_url.trim_end_matches('/');
    match api {
        Api::Chat => append_path(base, "chat/completions"),
        Api::Anthropic => {
            let root = base.strip_suffix("/openai/v1").unwrap_or(base);
            format!("{root}/anthropic/v1/messages")
        }
        Api::Google => {
            let root = base.strip_suffix("/openai/v1").unwrap_or(base);
            format!("{root}/google/v1beta/models/{model}:generateContent")
        }
        Api::Responses => append_path(base, "responses"),
    }
}

fn api_headers(api: Api, preset: &str, key: &str) -> Vec<(&'static str, String)> {
    if preset == "anthropic" {
        return vec![
            ("x-api-key", key.to_string()),
            ("anthropic-version", "2023-06-01".to_string()),
        ];
    }
    if api == Api::Anthropic {
        return vec![
            ("authorization", format!("Bearer {key}")),
            ("anthropic-version", "2023-06-01".to_string()),
        ];
    }
    vec![("authorization", format!("Bearer {key}"))]
}

fn session_id() -> &'static str {
    static ID: std::sync::OnceLock<String> = std::sync::OnceLock::new();
    ID.get_or_init(|| {
        let ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);
        format!("cue-{}-{ms}", std::process::id())
    })
}

fn image_data(b64: &str) -> String {
    format!("data:image/jpeg;base64,{b64}")
}

const RESERVED_EXTRA: [&str; 6] =
    ["temperature", "model", "messages", "input", "contents", "stream"];

pub fn merge_extra(base: &mut Value, extra: &str) -> Result<(), String> {
    if extra.trim().is_empty() {
        return Ok(());
    }
    let e: Value = serde_json::from_str(extra).map_err(|_| "config".to_string())?;
    let obj = e.as_object().ok_or("config")?;
    let map = base.as_object_mut().ok_or("config")?;
    for (k, v) in obj {
        if RESERVED_EXTRA.contains(&k.as_str()) {
            return Err("extra".into());
        }
        map.insert(k.clone(), v.clone());
    }
    Ok(())
}

pub fn build_body(api: Api, model: &str, prompt: &str, b64: &str, extra: &str) -> Result<Value, String> {
    let mut body = match api {
        Api::Chat => json!({
            "model": model,
            "temperature": 0,
            "messages": [{
                "role": "user",
                "content": [
                    { "type": "text", "text": prompt },
                    { "type": "image_url", "image_url": { "url": image_data(b64) } }
                ]
            }]
        }),
        Api::Anthropic => json!({
            "model": model,
            "max_tokens": 4096,
            "messages": [{
                "role": "user",
                "content": [
                    { "type": "text", "text": prompt },
                    { "type": "image", "source": {
                        "type": "base64", "media_type": "image/jpeg", "data": b64
                    }}
                ]
            }]
        }),
        Api::Google => json!({
            "contents": [{
                "role": "user",
                "parts": [
                    { "text": prompt },
                    { "inline_data": { "mime_type": "image/jpeg", "data": b64 } }
                ]
            }]
        }),
        Api::Responses => json!({
            "model": model,
            "input": [{
                "role": "user",
                "content": [
                    { "type": "input_text", "text": prompt },
                    { "type": "input_image", "image_url": image_data(b64) }
                ]
            }]
        }),
    };
    merge_extra(&mut body, extra)?;
    Ok(body)
}

pub fn paraphrase_body(api: Api, model: &str, text: &str, extra: &str) -> Result<Value, String> {
    let prompt = paraphrase_prompt(text);
    let mut body = match api {
        Api::Chat => json!({
            "model": model,
            "temperature": 0,
            "messages": [{ "role": "user", "content": prompt }]
        }),
        Api::Anthropic => json!({
            "model": model,
            "max_tokens": 4096,
            "messages": [{ "role": "user", "content": [{ "type": "text", "text": prompt }] }]
        }),
        Api::Google => json!({
            "contents": [{ "role": "user", "parts": [{ "text": prompt }] }]
        }),
        Api::Responses => json!({
            "model": model,
            "input": [{ "role": "user", "content": [{ "type": "input_text", "text": prompt }] }]
        }),
    };
    merge_extra(&mut body, extra)?;
    Ok(body)
}

pub fn correction_body(
    api: Api,
    model: &str,
    prompt: &str,
    b64: &str,
    raw: &str,
    extra: &str,
) -> Result<Value, String> {
    let instruction = "Reply with ONLY the JSON object as instructed.";
    let mut body = match api {
        Api::Chat => json!({
            "model": model,
            "temperature": 0,
            "messages": [
                { "role": "user", "content": [
                    { "type": "text", "text": prompt },
                    { "type": "image_url", "image_url": { "url": image_data(b64) } }
                ]},
                { "role": "assistant", "content": raw },
                { "role": "user", "content": instruction }
            ]
        }),
        Api::Anthropic => json!({
            "model": model,
            "max_tokens": 4096,
            "messages": [
                { "role": "user", "content": [
                    { "type": "text", "text": prompt },
                    { "type": "image", "source": {
                        "type": "base64", "media_type": "image/jpeg", "data": b64
                    }}
                ]},
                { "role": "assistant", "content": raw },
                { "role": "user", "content": instruction }
            ]
        }),
        Api::Google => json!({
            "contents": [
                { "role": "user", "parts": [
                    { "text": prompt },
                    { "inline_data": { "mime_type": "image/jpeg", "data": b64 } }
                ]},
                { "role": "model", "parts": [{ "text": raw }] },
                { "role": "user", "parts": [{ "text": instruction }] }
            ]
        }),
        Api::Responses => json!({
            "model": model,
            "input": [
                { "role": "user", "content": [
                    { "type": "input_text", "text": prompt },
                    { "type": "input_image", "image_url": image_data(b64) }
                ]},
                { "role": "assistant", "content": [{ "type": "input_text", "text": raw }] },
                { "role": "user", "content": [{ "type": "input_text", "text": instruction }] }
            ]
        }),
    };
    merge_extra(&mut body, extra)?;
    Ok(body)
}

fn join_texts(values: impl Iterator<Item = String>) -> Option<String> {
    let text: String = values.collect();
    if text.trim().is_empty() {
        None
    } else {
        Some(text)
    }
}

pub fn extract_content(api: Api, v: &Value) -> Result<String, String> {
    let text = match api {
        Api::Chat => v
            .get("choices")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("message"))
            .and_then(|m| m.get("content"))
            .and_then(|c| c.as_str())
            .map(|s| s.to_string()),
        Api::Anthropic => v
            .get("content")
            .and_then(|c| c.as_array())
            .and_then(|arr| {
                join_texts(
                    arr.iter()
                        .filter_map(|b| b.get("text").and_then(|t| t.as_str()))
                        .map(|s| s.to_string()),
                )
            }),
        Api::Google => v
            .pointer("/candidates/0/content/parts")
            .and_then(|p| p.as_array())
            .and_then(|parts| {
                join_texts(
                    parts
                        .iter()
                        .filter_map(|p| p.get("text").and_then(|t| t.as_str()))
                        .map(|s| s.to_string()),
                )
            }),
        Api::Responses => v
            .get("output_text")
            .and_then(|t| t.as_str())
            .map(|s| s.to_string())
            .or_else(|| {
                v.get("output")
                    .and_then(|o| o.as_array())
                    .and_then(|items| {
                        join_texts(items.iter().flat_map(|item| {
                            item.get("content")
                                .and_then(|c| c.as_array())
                                .into_iter()
                                .flatten()
                                .filter_map(|c| c.get("text").and_then(|t| t.as_str()))
                                .map(|s| s.to_string())
                        }))
                    })
            }),
    };
    text.ok_or_else(|| "parse".into())
}
pub const REQUEST_BUDGET: Duration = Duration::from_secs(90);

pub fn budget_left(started: Instant, now: Instant, budget: Duration) -> Option<Duration> {
    budget
        .checked_sub(now.saturating_duration_since(started))
        .filter(|left| !left.is_zero())
}

pub const RETRY_DELAYS_MS: [u64; 3] = [500, 1500, 4000];
pub const MAX_RETRY_AFTER_MS: u64 = 10_000;

#[cfg(test)]
pub fn auth_headers(preset: &str, key: &str) -> Vec<(&'static str, String)> {
    if preset == "anthropic" {
        vec![
            ("x-api-key", key.to_string()),
            ("anthropic-version", "2023-06-01".to_string()),
        ]
    } else {
        vec![("authorization", format!("Bearer {key}"))]
    }
}

pub fn preset_base_url(preset: &str) -> Option<&'static str> {
    match preset {
        "opencode" => Some("https://opencode.ai/inference/openai/v1"),
        "opencode-go" => Some("https://opencode.ai/inference/go/openai/v1"),
        "openai" => Some("https://api.openai.com/v1"),
        "google" => Some("https://generativelanguage.googleapis.com/v1beta/openai"),
        "anthropic" => Some("https://api.anthropic.com/v1"),
        _ => None,
    }
}

/// Known presets may only send their stored key to their official endpoint.
/// A custom endpoint is allowed, but it must carry a key the user entered for
/// that custom preset.
pub fn is_loopback_host(host: &str) -> bool {
    host.eq_ignore_ascii_case("localhost")
        || host == "::1"
        || host == "[::1]"
        || host
            .parse::<std::net::Ipv4Addr>()
            .map(|ip| ip.is_loopback())
            .unwrap_or(false)
}

pub fn validate_base_url(preset: &str, base_url: &str) -> Result<(), String> {
    let url = base_url.trim_end_matches('/');
    if let Some(expected) = preset_base_url(preset) {
        return if url == expected.trim_end_matches('/') {
            Ok(())
        } else {
            Err("config".into())
        };
    }
    let parsed = reqwest::Url::parse(url).map_err(|_| "config".to_string())?;
    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err("config".into());
    }
    let Some(host) = parsed.host_str() else {
        return Err("config".into());
    };
    match parsed.scheme() {
        "https" => Ok(()),
        "http" if is_loopback_host(host) => Ok(()),
        _ => Err("config".into()),
    }
}

pub fn retryable(code: &str) -> bool {
    matches!(code, "network" | "http_429" | "http_5xx")
}

pub fn retry_delay_ms(retry: usize, retry_after: Option<u64>) -> Option<u64> {
    let base = *RETRY_DELAYS_MS.get(retry)?;
    Some(
        retry_after
            .map(|secs| secs.saturating_mul(1000).min(MAX_RETRY_AFTER_MS))
            .unwrap_or(base),
    )
}

async fn pause(ms: u64) {
    if ms == 0 {
        return;
    }
    let _ = tauri::async_runtime::spawn_blocking(move || {
        std::thread::sleep(std::time::Duration::from_millis(ms))
    })
    .await;
}

fn error_code(status: u16, body: &str) -> &'static str {
    if (300..=399).contains(&status) {
        return "config";
    }
    let b = body.to_ascii_lowercase();
    if b.contains("freetiererror") {
        return "free_model";
    }
    if b.contains("model access is disabled") {
        return "model_disabled";
    }
    if b.contains("modelprotocolunsupported") {
        return "model_protocol";
    }
    if b.contains("missingsessionid") {
        return "model_session";
    }
    if status == 402 || (status == 503 && b.contains("endpoint is unavailable")) {
        return "model_unavailable";
    }
    match status {
        401 | 403 => "http_401",
        404 => "http_404",
        400 | 422 => "http_400",
        429 => "http_429",
        _ => "http_5xx",
    }
}

struct PostError {
    code: &'static str,
    retry_after: Option<u64>,
}

async fn post_once(
    client: &reqwest::Client,
    p: &Provider<'_>,
    api: Api,
    body: &Value,
    timeout: Duration,
) -> Result<String, PostError> {
    let url = endpoint_for(p.base_url, p.model, api);
    let mut req = client.post(url).timeout(timeout);
    for (name, value) in api_headers(api, p.preset, p.key) {
        req = req.header(name, value);
    }
    if p.preset == "opencode-go" {
        req = req
            .header("x-opencode-session", session_id())
            .header("user-agent", concat!("cue/", env!("CARGO_PKG_VERSION")));
    }
    let resp = req
        .json(body)
        .send()
        .await
        .map_err(|_| PostError {
            code: "network",
            retry_after: None,
        })?;
    let status = resp.status();
    if !status.is_success() {
        let retry_after = resp
            .headers()
            .get(reqwest::header::RETRY_AFTER)
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.trim().parse::<u64>().ok());
        let body = resp.text().await.unwrap_or_default();
        return Err(PostError {
            code: error_code(status.as_u16(), &body),
            retry_after,
        });
    }
    let v: Value = resp.json().await.map_err(|_| PostError {
        code: "parse",
        retry_after: None,
    })?;
    extract_content(api, &v).map_err(|_| PostError {
        code: "parse",
        retry_after: None,
    })
}

async fn post_api(
    client: &reqwest::Client,
    p: &Provider<'_>,
    api: Api,
    body: &Value,
    started: Instant,
) -> Result<String, String> {
    let mut retry = 0usize;
    loop {
        let Some(left) = budget_left(started, Instant::now(), REQUEST_BUDGET) else {
            return Err("timeout".into());
        };
        match post_once(client, p, api, body, left.min(Duration::from_secs(60))).await {
            Ok(content) => return Ok(content),
            Err(e) => {
                if !retryable(e.code) {
                    return Err(e.code.to_string());
                }
                let Some(delay) = retry_delay_ms(retry, e.retry_after) else {
                    return Err(e.code.to_string());
                };
                let Some(remaining) = budget_left(started, Instant::now(), REQUEST_BUDGET) else {
                    return Err("timeout".into());
                };
                pause(delay.min(remaining.as_millis() as u64)).await;
                retry += 1;
            }
        }
    }
}

fn protocol_candidates(preset: &str, primary: Api) -> Vec<Api> {
    if preset != "opencode" && preset != "opencode-go" {
        return vec![primary];
    }
    let mut out = vec![primary];
    for api in [Api::Chat, Api::Anthropic, Api::Google, Api::Responses] {
        if api != primary {
            out.push(api);
        }
    }
    out
}

async fn answer_with_api(
    client: &reqwest::Client,
    p: &Provider<'_>,
    api: Api,
    prompt: &str,
    b64: &str,
    started: Instant,
) -> Result<Vec<String>, String> {
    let body = build_body(api, p.model, prompt, b64, p.extra)?;
    let content = post_api(client, p, api, &body, started).await?;
    match parse_answers(&content) {
        Ok(a) => Ok(a),
        Err(ParseError::Empty) => Err("empty".into()),
        Err(ParseError::Format) => {
            let body = correction_body(api, p.model, prompt, b64, &content, p.extra)?;
            let content2 = post_api(client, p, api, &body, started).await?;
            match parse_answers(&content2) {
                Ok(a) => Ok(a),
                Err(ParseError::Empty) => Err("empty".into()),
                Err(ParseError::Format) => Err("parse".into()),
            }
        }
    }
}

pub async fn request_answers(
    client: &reqwest::Client,
    p: &Provider<'_>,
    b64: &str,
    cx: i32,
    cy: i32,
    w: u32,
    h: u32,
) -> Result<Vec<String>, String> {
    let prompt = build_prompt(cx, cy, w, h);
    let started = Instant::now();
    let mut last = "model_protocol".to_string();
    for api in protocol_candidates(p.preset, api_for(p.preset, p.model)) {
        match answer_with_api(client, p, api, &prompt, b64, started).await {
            Ok(answers) => return Ok(answers),
            Err(code) if code == "model_protocol" => last = code,
            Err(code) => return Err(code),
        }
    }
    Err(last)
}

async fn request_text_with_prompt(
    client: &reqwest::Client,
    p: &Provider<'_>,
    capture: &crate::capture::Capture,
    paraphrase: bool,
    prompt: &str,
) -> Result<String, String> {
    let started = Instant::now();
    let mut last = "model_protocol".to_string();
    for api in protocol_candidates(p.preset, api_for(p.preset, p.model)) {
        let body = build_body(api, p.model, prompt, &capture.b64, p.extra)?;
        let text = match post_api(client, p, api, &body, started).await {
            Ok(content) => sanitize_text(&content),
            Err(code) if code == "model_protocol" => {
                last = code;
                continue;
            }
            Err(code) => return Err(code),
        };
        if text.is_empty() {
            return Err("empty_text".into());
        }
        if !paraphrase {
            return Ok(text);
        }
        let body = paraphrase_body(api, p.model, &text, p.extra)?;
        let text = sanitize_text(&post_api(client, p, api, &body, started).await?);
        if text.is_empty() {
            return Err("empty_text".into());
        }
        return Ok(text);
    }
    Err(last)
}

pub async fn request_text(
    client: &reqwest::Client,
    p: &Provider<'_>,
    capture: &crate::capture::Capture,
    paraphrase: bool,
    language: &str,
    level: &str,
) -> Result<String, String> {
    let prompt = build_text_prompt(
        capture.cursor_x,
        capture.cursor_y,
        capture.img_w,
        capture.img_h,
        language,
        level,
    );
    request_text_with_prompt(client, p, capture, paraphrase, &prompt).await
}

pub async fn request_free(
    client: &reqwest::Client,
    p: &Provider<'_>,
    capture: &crate::capture::Capture,
    paraphrase: bool,
    instruction: &str,
    language: &str,
    level: &str,
) -> Result<String, String> {
    let prompt = build_free_prompt(
        capture.cursor_x,
        capture.cursor_y,
        capture.img_w,
        capture.img_h,
        instruction,
        language,
        level,
    );
    request_text_with_prompt(client, p, capture, paraphrase, &prompt).await
}

const VISION_TEST_IMAGE: &str = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD50ooor8MP9Uz/2Q==";

pub fn reads_red(content: &str) -> bool {
    content
        .split(|c: char| !c.is_ascii_alphabetic())
        .any(|word| word.eq_ignore_ascii_case("red"))
}

pub async fn test(client: &reqwest::Client, p: &Provider<'_>) -> Result<bool, String> {
    let b64 = VISION_TEST_IMAGE
        .strip_prefix("data:image/jpeg;base64,")
        .unwrap_or(VISION_TEST_IMAGE);
    let started = Instant::now();
    let mut last = "model_protocol".to_string();
    for api in protocol_candidates(p.preset, api_for(p.preset, p.model)) {
        let body = build_body(api, p.model, "Reply with the single word red.", b64, p.extra)?;
        match post_api(client, p, api, &body, started).await {
            Ok(content) => return Ok(reads_red(&content)),
            Err(code) if code == "model_protocol" => last = code,
            Err(code) => return Err(code),
        }
    }
    Err(last)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{BufRead, BufReader, Read, Write};
    use std::net::{TcpListener, TcpStream};
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;

    #[test]
    fn parse_plain_json() {
        assert_eq!(parse_answers(r#"{"answers":["B"]}"#).unwrap(), vec!["B"]);
    }

    #[test]
    fn parse_code_fence() {
        let c = "```json\n{\"answers\":[\"B\"]}\n```";
        assert_eq!(parse_answers(c).unwrap(), vec!["B"]);
    }

    #[test]
    fn parse_prose_wrapped() {
        let c = "Sure! Here it is: {\"answers\":[\"C\"]} Hope that helps.";
        assert_eq!(parse_answers(c).unwrap(), vec!["C"]);
    }

    #[test]
    fn parse_multiple_and_truncate() {
        let c = r#"{"answers":["A","B","C","D","E","1"]}"#;
        assert_eq!(parse_answers(c).unwrap().len(), 4);
    }

    #[test]
    fn parse_braces_inside_string() {
        let c = r#"{"note":"use { x } here","answers":["A"]}"#;
        assert_eq!(parse_answers(c).unwrap(), vec!["A"]);
    }

    #[test]
    fn parse_empty_array_is_empty_error() {
        assert_eq!(parse_answers(r#"{"answers":[]}"#).unwrap_err(), ParseError::Empty);
    }

    #[test]
    fn parse_garbage_is_format_error() {
        assert_eq!(parse_answers("I cannot answer that.").unwrap_err(), ParseError::Format);
        assert_eq!(parse_answers("{\"foo\": 1}").unwrap_err(), ParseError::Format);
    }

    #[test]
    fn prompt_contains_cursor_and_size() {
        let p = build_prompt(1234, 567, 1920, 1080);
        assert!(p.contains("(1234, 567)"));
        assert!(p.contains("1920x1080"));
        assert!(p.contains("{\"answers\":[\"X\"]}"));
    }

    #[test]
    fn free_prompt_contains_the_instruction_and_plain_text_rules() {
        let p = build_free_prompt(34, 56, 1280, 720, "Explain this code", "ko", "concise");
        assert!(p.contains("(34, 56)"));
        assert!(p.contains("1280x720"));
        assert!(p.contains("Explain this code"));
        assert!(p.contains("Korean"));
        assert!(p.contains("one to three sentences"));
        assert!(p.contains("no markdown"));
        assert!(p.contains("empty string"));
        assert_eq!(p.matches("Explain this code").count(), 1);
    }

    #[test]
    fn free_prompt_uses_a_default_instruction() {
        let p = build_free_prompt(0, 0, 100, 100, "  ", "auto", "normal");
        assert!(p.contains("Explain the content near the cursor"));
    }

    #[test]
    fn consensus_reports_match_mismatch_and_fallback() {
        let matched = merge_consensus(Ok(vec!["B".into()]), Ok(vec!["B".into()])).unwrap();
        assert!(matched.matched);
        assert_eq!(matched.answers, vec!["B"]);
        assert_eq!(matched.secondary, vec!["B"]);
        assert!(matched.error.is_none());

        let mismatch = merge_consensus(Ok(vec!["B".into()]), Ok(vec!["C".into()])).unwrap();
        assert!(!mismatch.matched);
        assert_eq!(mismatch.answers, vec!["B"]);
        assert_eq!(mismatch.secondary, vec!["C"]);

        let fallback = merge_consensus(Ok(vec!["B".into()]), Err("network".into())).unwrap();
        assert!(!fallback.matched);
        assert_eq!(fallback.answers, vec!["B"]);
        assert_eq!(fallback.error.as_deref(), Some("network"));

        assert_eq!(
            merge_consensus(Err("a".into()), Err("b".into())).unwrap_err(),
            "a"
        );
    }

    #[test]
    fn text_prompt_contains_cursor_and_plain_text_rules() {
        let p = build_text_prompt(34, 56, 1280, 720, "ko", "normal");
        assert!(p.contains("(34, 56)"));
        assert!(p.contains("1280x720"));
        assert!(p.contains("Korean"));
        assert!(p.contains("no markdown"));
        assert!(p.contains("empty string"));
    }

    #[test]
    fn text_prompt_carries_the_language_instruction() {
        let auto = build_text_prompt(0, 0, 100, 100, "auto", "normal");
        assert!(auto.contains("same language as the question"));
        let ko = build_text_prompt(0, 0, 100, 100, "ko", "normal");
        assert!(ko.contains("Answer in Korean."));
        let en = build_text_prompt(0, 0, 100, 100, "en", "normal");
        assert!(en.contains("Answer in English."));
    }

    #[test]
    fn text_prompt_carries_the_level_instruction() {
        assert!(build_text_prompt(0, 0, 100, 100, "auto", "concise")
            .contains("one to three sentences"));
        assert!(build_text_prompt(0, 0, 100, 100, "auto", "normal").contains("balanced"));
        assert!(build_text_prompt(0, 0, 100, 100, "auto", "detailed").contains("in detail"));
    }

    #[test]
    fn sanitize_removes_zero_width_bidi_and_variation_selectors() {
        let raw = "a\u{200B}b\u{200C}c\u{200D}d\u{FEFF}e\u{202A}f\u{202E}g\u{2066}h\u{2069}i\u{FE0F}j\u{E0100}k";
        assert_eq!(sanitize_text(raw), "abcdefghijk");
    }

    #[test]
    fn sanitize_removes_soft_hyphen_and_simple_tags() {
        assert_eq!(sanitize_text("co\u{00AD}operate"), "cooperate");
        assert_eq!(sanitize_text("<p>Hello</p>\n<b>world</b>"), "Hello\nworld");
        assert_eq!(sanitize_text("a<br/>b"), "ab");
    }

    #[test]
    fn sanitize_keeps_text_and_comparisons() {
        assert_eq!(sanitize_text("  He said < 5 > 3, then a < b > c.  "), "He said < 5 > 3, then a < b > c.");
        assert_eq!(sanitize_text("정답은 <b>광합성</b>입니다."), "정답은 광합성입니다.");
    }

    #[test]
    fn paraphrase_prompt_carries_the_answer_once() {
        let p = paraphrase_prompt("answer text");
        assert!(p.contains("Rewrite"));
        assert!(p.contains("answer text"));
        assert_eq!(p.matches("answer text").count(), 1);
    }

    #[test]
    fn merge_extra_rejects_reserved_keys() {
        for key in ["temperature", "model", "messages", "input", "contents", "stream"] {
            let mut body = json!({"model": "m"});
            let extra = format!(r#"{{"{key}": 1}}"#);
            assert_eq!(merge_extra(&mut body, &extra).unwrap_err(), "extra");
        }
        let mut body = json!({"model": "m", "max_tokens": 1});
        merge_extra(&mut body, r#"{"max_tokens": 512}"#).unwrap();
        assert_eq!(body["max_tokens"], 512);
        assert_eq!(merge_extra(&mut body, "not json").unwrap_err(), "config");
        assert_eq!(merge_extra(&mut body, "[1,2]").unwrap_err(), "config");
    }

    #[test]
    fn budget_stops_before_the_deadline() {
        let start = Instant::now();
        assert_eq!(
            budget_left(start, start + Duration::from_secs(1), Duration::from_secs(90)),
            Some(Duration::from_secs(89))
        );
        assert_eq!(
            budget_left(start, start + Duration::from_secs(90), Duration::from_secs(90)),
            None
        );
    }

    #[test]
    fn custom_urls_are_https_or_loopback_http() {
        assert!(validate_base_url("custom", "https://proxy.example/v1").is_ok());
        assert!(validate_base_url("custom", "http://127.0.0.1:8000/v1").is_ok());
        assert!(validate_base_url("custom", "http://localhost:8000/v1").is_ok());
        assert!(validate_base_url("custom", "http://192.168.0.5/v1").is_err());
        assert!(validate_base_url("custom", "https://user:pass@proxy.example/v1").is_err());
        assert!(validate_base_url("custom", "https://").is_err());
    }

    #[test]
    fn redirect_status_is_a_config_error() {
        assert_eq!(error_code(302, ""), "config");
        assert_eq!(error_code(307, ""), "config");
    }

    #[test]
    fn anthropic_chat_uses_x_api_key_and_version() {
        assert_eq!(
            auth_headers("anthropic", "sk-ant"),
            vec![
                ("x-api-key", "sk-ant".to_string()),
                ("anthropic-version", "2023-06-01".to_string()),
            ]
        );
    }

    #[test]
    fn known_presets_only_accept_their_official_base_url() {
        for preset in ["opencode", "opencode-go", "openai", "google", "anthropic"] {
            assert!(validate_base_url(preset, preset_base_url(preset).unwrap()).is_ok());
            assert!(validate_base_url(preset, "https://evil.example/v1").is_err());
        }
        assert!(validate_base_url("custom", "http://localhost:8000/v1").is_ok());
        assert!(validate_base_url("custom", "https://proxy.example/v1/").is_ok());
        assert!(validate_base_url("custom", "").is_err());
        assert!(validate_base_url("custom", "file:///tmp/x").is_err());
    }

    #[test]
    fn other_providers_use_bearer_auth() {
        for preset in ["google", "openai", "opencode", "custom"] {
            assert_eq!(
                auth_headers(preset, "k"),
                vec![("authorization", "Bearer k".to_string())]
            );
        }
    }

    #[test]
    fn retry_policy_is_limited_to_transient_errors() {
        assert!(retryable("network"));
        assert!(retryable("http_429"));
        assert!(retryable("http_5xx"));
        for code in [
            "http_400",
            "http_401",
            "http_403",
            "http_404",
            "parse",
            "config",
            "free_model",
            "model_disabled",
            "model_protocol",
            "model_unavailable",
            "model_session",
        ] {
            assert!(!retryable(code), "{code}");
        }
    }

    #[test]
    fn retry_delays_follow_schedule_and_cap_retry_after() {
        assert_eq!(retry_delay_ms(0, None), Some(500));
        assert_eq!(retry_delay_ms(1, None), Some(1500));
        assert_eq!(retry_delay_ms(2, None), Some(4000));
        assert_eq!(retry_delay_ms(3, None), None);
        assert_eq!(retry_delay_ms(0, Some(0)), Some(0));
        assert_eq!(retry_delay_ms(0, Some(3)), Some(3000));
        assert_eq!(retry_delay_ms(0, Some(11)), Some(10_000));
    }

    #[test]
    fn vision_check_requires_a_whole_word() {
        assert!(reads_red("red"));
        assert!(reads_red("RED."));
        assert!(reads_red("The color is red."));
        assert!(!reads_red("bored"));
        assert!(!reads_red("credit"));
    }

    struct MockResponse {
        status: u16,
        retry_after: Option<u64>,
        body: String,
    }

    impl MockResponse {
        fn ok(content: &str) -> Self {
            Self {
                status: 200,
                retry_after: None,
                body: chat_body(content),
            }
        }

        fn status(status: u16) -> Self {
            Self {
                status,
                retry_after: None,
                body: "{}".to_string(),
            }
        }

        fn retry(status: u16, retry_after: u64) -> Self {
            Self {
                status,
                retry_after: Some(retry_after),
                body: "{}".to_string(),
            }
        }

        fn body(status: u16, body: &str) -> Self {
            Self {
                status,
                retry_after: None,
                body: body.to_string(),
            }
        }
    }

    fn chat_body(content: &str) -> String {
        json!({ "choices": [{ "message": { "content": content } }] }).to_string()
    }

    fn mock_server(responses: Vec<MockResponse>) -> (String, Arc<AtomicUsize>) {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let calls = Arc::new(AtomicUsize::new(0));
        let seen = calls.clone();
        std::thread::spawn(move || {
            for response in responses {
                let (mut stream, _) = listener.accept().unwrap();
                seen.fetch_add(1, Ordering::SeqCst);
                drain_request(&mut stream);
                let reason = match response.status {
                    200 => "OK",
                    401 => "Unauthorized",
                    429 => "Too Many Requests",
                    500 => "Internal Server Error",
                    _ => "Error",
                };
                let mut head = format!(
                    "HTTP/1.1 {} {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n",
                    response.status,
                    reason,
                    response.body.len()
                );
                if let Some(seconds) = response.retry_after {
                    head.push_str(&format!("Retry-After: {seconds}\r\n"));
                }
                head.push_str("\r\n");
                stream.write_all(head.as_bytes()).unwrap();
                stream.write_all(response.body.as_bytes()).unwrap();
                stream.flush().unwrap();
            }
        });
        (format!("http://{addr}/v1"), calls)
    }

    fn drain_request(stream: &mut TcpStream) {
        let mut reader = BufReader::new(stream.try_clone().unwrap());
        let mut len = 0usize;
        loop {
            let mut line = String::new();
            if reader.read_line(&mut line).unwrap_or(0) == 0 {
                break;
            }
            if line == "\r\n" {
                break;
            }
            let lower = line.to_ascii_lowercase();
            if let Some(value) = lower.strip_prefix("content-length:") {
                len = value.trim().parse().unwrap_or(0);
            }
        }
        let mut body = vec![0u8; len];
        let _ = reader.read_exact(&mut body);
    }

    fn test_provider<'a>(base_url: &'a str) -> Provider<'a> {
        Provider {
            preset: "custom",
            base_url,
            model: "test-model",
            extra: "",
            key: "test-key",
        }
    }

    fn test_client() -> reqwest::Client {
        reqwest::Client::builder().no_proxy().build().unwrap()
    }

    fn run_request_answers(base_url: &str) -> Result<Vec<String>, String> {
        tauri::async_runtime::block_on(async {
            let client = test_client();
            let p = test_provider(base_url);
            request_answers(&client, &p, "image", 10, 20, 100, 200).await
        })
    }

    fn run_request_answers_preset(
        base_url: &str,
        preset: &str,
        model: &str,
    ) -> Result<Vec<String>, String> {
        tauri::async_runtime::block_on(async {
            let client = test_client();
            let p = Provider {
                preset,
                base_url,
                model,
                extra: "",
                key: "test-key",
            };
            request_answers(&client, &p, "image", 10, 20, 100, 200).await
        })
    }

    #[test]
    fn request_answers_success() {
        let (base, calls) = mock_server(vec![MockResponse::ok(r#"{"answers":["B"]}"#)]);
        assert_eq!(run_request_answers(&base).unwrap(), vec!["B"]);
        assert_eq!(calls.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn request_answers_does_not_retry_401() {
        let (base, calls) = mock_server(vec![MockResponse::status(401)]);
        assert_eq!(run_request_answers(&base).unwrap_err(), "http_401");
        assert_eq!(calls.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn request_answers_honors_retry_after_429() {
        let (base, calls) = mock_server(vec![
            MockResponse::retry(429, 0),
            MockResponse::ok(r#"{"answers":["C"]}"#),
        ]);
        assert_eq!(run_request_answers(&base).unwrap(), vec!["C"]);
        assert_eq!(calls.load(Ordering::SeqCst), 2);
    }

    #[test]
    fn request_answers_corrects_malformed_json_once() {
        let (base, calls) = mock_server(vec![
            MockResponse::ok("I cannot answer that."),
            MockResponse::ok(r#"{"answers":["D"]}"#),
        ]);
        assert_eq!(run_request_answers(&base).unwrap(), vec!["D"]);
        assert_eq!(calls.load(Ordering::SeqCst), 2);
    }

    #[test]
    fn request_answers_retries_5xx() {
        let (base, calls) = mock_server(vec![
            MockResponse::retry(500, 0),
            MockResponse::ok(r#"{"answers":["E"]}"#),
        ]);
        assert_eq!(run_request_answers(&base).unwrap(), vec!["E"]);
        assert_eq!(calls.load(Ordering::SeqCst), 2);
    }

    #[test]
    fn provider_error_bodies_map_to_specific_codes() {
        assert_eq!(
            error_code(403, r#"{"error":{"type":"FreeTierError"}}"#),
            "free_model"
        );
        assert_eq!(
            error_code(403, r#"{"error":{"message":"Upstream request failed: Model access is disabled"}}"#),
            "model_disabled"
        );
        assert_eq!(
            error_code(400, r#"{"error":{"type":"ModelProtocolUnsupported"}}"#),
            "model_protocol"
        );
        assert_eq!(
            error_code(400, r#"{"error":{"type":"MissingSessionID"}}"#),
            "model_session"
        );
        assert_eq!(error_code(402, "{}"), "model_unavailable");
        assert_eq!(
            error_code(503, r#"{"message":"Upstream request failed: Endpoint is unavailable."}"#),
            "model_unavailable"
        );
        assert_eq!(error_code(400, "{}"), "http_400");
        assert_eq!(error_code(401, "{}"), "http_401");
        assert_eq!(error_code(500, "{}"), "http_5xx");
    }

    #[test]
    fn request_answers_falls_back_to_another_protocol() {
        let (base, calls) = mock_server(vec![
            MockResponse::body(400, r#"{"error":{"type":"ModelProtocolUnsupported"}}"#),
            MockResponse::body(200, r#"{"content":[{"type":"text","text":"{\"answers\":[\"B\"]}"}]}"#),
        ]);
        assert_eq!(
            run_request_answers_preset(&base, "opencode", "test-model").unwrap(),
            vec!["B"]
        );
        assert_eq!(calls.load(Ordering::SeqCst), 2);
    }

    #[test]
    fn non_opencode_requests_do_not_fall_back() {
        let (base, calls) = mock_server(vec![MockResponse::body(
            400,
            r#"{"error":{"type":"ModelProtocolUnsupported"}}"#,
        )]);
        assert_eq!(run_request_answers(&base).unwrap_err(), "model_protocol");
        assert_eq!(calls.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn request_answers_does_not_retry_model_access_errors() {
        let (base, calls) = mock_server(vec![MockResponse::body(
            403,
            r#"{"error":{"message":"Upstream request failed: Model access is disabled"}}"#,
        )]);
        assert_eq!(run_request_answers(&base).unwrap_err(), "model_disabled");
        assert_eq!(calls.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn request_answers_reports_free_model_without_retry() {
        let (base, calls) = mock_server(vec![MockResponse::body(
            403,
            r#"{"error":{"type":"FreeTierError"}}"#,
        )]);
        assert_eq!(run_request_answers(&base).unwrap_err(), "free_model");
        assert_eq!(calls.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn request_answers_maps_unavailable_endpoint_without_retry() {
        let (base, calls) = mock_server(vec![MockResponse::body(
            402,
            r#"{"error":{"message":"Upstream request failed: Endpoint is unavailable."}}"#,
        )]);
        assert_eq!(run_request_answers(&base).unwrap_err(), "model_unavailable");
        assert_eq!(calls.load(Ordering::SeqCst), 1);
    }
    #[test]
    fn opencode_models_route_to_their_native_apis() {
        assert_eq!(api_for("opencode", "claude-sonnet-4-5"), Api::Anthropic);
        assert_eq!(api_for("opencode", "qwen3.8-flash"), Api::Anthropic);
        assert_eq!(api_for("opencode", "gemini-3.8-flash"), Api::Google);
        assert_eq!(api_for("opencode", "gpt-5.5"), Api::Responses);
        assert_eq!(api_for("opencode", "grok-4.6"), Api::Responses);
        assert_eq!(api_for("opencode", "deepseek-v4-pro"), Api::Chat);
        assert_eq!(api_for("openai", "gpt-5.5"), Api::Chat);
    }

    #[test]
    fn native_endpoints_are_derived_from_the_opencode_base() {
        let base = "https://opencode.ai/inference/openai/v1";
        assert_eq!(
            endpoint("opencode", base, "claude-sonnet-4-5"),
            "https://opencode.ai/inference/anthropic/v1/messages"
        );
        assert_eq!(
            endpoint("opencode", base, "gemini-3.8-flash"),
            "https://opencode.ai/inference/google/v1beta/models/gemini-3.8-flash:generateContent"
        );
        assert_eq!(
            endpoint("opencode", base, "gpt-5.5"),
            "https://opencode.ai/inference/openai/v1/responses"
        );
        assert_eq!(
            endpoint("opencode", base, "deepseek-v4-pro"),
            "https://opencode.ai/inference/openai/v1/chat/completions"
        );
    }

    #[test]
    fn custom_chat_endpoint_keeps_the_query() {
        assert_eq!(
            endpoint_for("https://proxy.example/v1?api-version=1", "m", Api::Chat),
            "https://proxy.example/v1/chat/completions?api-version=1"
        );
    }

    #[test]
    fn native_bodies_carry_the_image() {
        let a = build_body(Api::Anthropic, "m", "p", "B64", "").unwrap();
        assert_eq!(a["messages"][0]["content"][1]["source"]["data"], "B64");
        assert_eq!(a["messages"][0]["content"][1]["source"]["media_type"], "image/jpeg");
        let g = build_body(Api::Google, "m", "p", "B64", "").unwrap();
        assert_eq!(g["contents"][0]["parts"][1]["inline_data"]["data"], "B64");
        let r = build_body(Api::Responses, "m", "p", "B64", "").unwrap();
        assert!(r["input"][0]["content"][1]["image_url"]
            .as_str()
            .unwrap()
            .starts_with("data:image/jpeg;base64,"));
    }

    #[test]
    fn native_responses_are_extracted() {
        let a: Value = serde_json::from_str(r#"{"content":[{"type":"text","text":"{\"answers\":[\"A\"]}"}]}"#).unwrap();
        assert!(extract_content(Api::Anthropic, &a).unwrap().contains("\"A\""));
        let g: Value = serde_json::from_str(r#"{"candidates":[{"content":{"parts":[{"text":"B"}]}}]}"#).unwrap();
        assert_eq!(extract_content(Api::Google, &g).unwrap(), "B");
        let r: Value = serde_json::from_str(r#"{"output_text":"C"}"#).unwrap();
        assert_eq!(extract_content(Api::Responses, &r).unwrap(), "C");
        let r2: Value = serde_json::from_str(r#"{"output":[{"content":[{"type":"output_text","text":"D"}]}]}"#).unwrap();
        assert_eq!(extract_content(Api::Responses, &r2).unwrap(), "D");
    }    #[test]
    fn go_models_route_with_go_paths() {
        assert_eq!(api_for("opencode-go", "qwen3.8-max"), Api::Anthropic);
        assert_eq!(api_for("opencode-go", "minimax-m3"), Api::Anthropic);
        assert_eq!(api_for("opencode-go", "minimax-m3.1-flash-free"), Api::Chat);
        assert_eq!(api_for("opencode-go", "gemini-4-argon-contributor"), Api::Google);
        assert_eq!(api_for("opencode-go", "gpt-6-luna"), Api::Responses);
        assert_eq!(api_for("opencode-go", "deepseek-v4-pro"), Api::Chat);
        let base = "https://opencode.ai/inference/go/openai/v1";
        assert_eq!(
            endpoint("opencode-go", base, "qwen3.8-max"),
            "https://opencode.ai/inference/go/anthropic/v1/messages"
        );
        assert_eq!(
            endpoint("opencode-go", base, "gemini-4-argon-contributor"),
            "https://opencode.ai/inference/go/google/v1beta/models/gemini-4-argon-contributor:generateContent"
        );
        assert_eq!(
            endpoint("opencode-go", base, "gpt-6-luna"),
            "https://opencode.ai/inference/go/openai/v1/responses"
        );
        assert_eq!(
            endpoint("opencode-go", base, "deepseek-v4-pro"),
            "https://opencode.ai/inference/go/openai/v1/chat/completions"
        );
        assert!(validate_base_url("opencode-go", base).is_ok());
    }

    #[test]
    fn opencode_gateway_uses_bearer_for_native_apis() {
        assert_eq!(
            api_headers(Api::Anthropic, "opencode-go", "k"),
            vec![
                ("authorization", "Bearer k".to_string()),
                ("anthropic-version", "2023-06-01".to_string()),
            ]
        );
        assert_eq!(
            api_headers(Api::Google, "opencode", "k"),
            vec![("authorization", "Bearer k".to_string())]
        );
        assert_eq!(
            api_headers(Api::Chat, "anthropic", "k"),
            vec![
                ("x-api-key", "k".to_string()),
                ("anthropic-version", "2023-06-01".to_string()),
            ]
        );
    }    #[test]
    fn chat_bodies_keep_temperature_and_native_bodies_omit_it() {
        let chat = build_body(Api::Chat, "m", "p", "B64", "").unwrap();
        assert_eq!(chat["temperature"], 0);
        for api in [Api::Anthropic, Api::Google, Api::Responses] {
            let body = build_body(api, "m", "p", "B64", "").unwrap();
            assert!(body.get("temperature").is_none(), "{api:?}");
        }
        let body = build_body(Api::Anthropic, "m", "p", "B64", "").unwrap();
        assert_eq!(body["max_tokens"], 4096);
    }}
