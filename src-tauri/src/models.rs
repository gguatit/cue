use serde_json::Value;

pub fn models_url(preset: &str, base_url: &str) -> String {
    match preset {
        "opencode" => "https://opencode.ai/inference/v1/models".to_string(),
        "opencode-go" => "https://opencode.ai/inference/go/v1/models".to_string(),
        "google" => "https://generativelanguage.googleapis.com/v1beta/models".to_string(),
        "anthropic" => "https://api.anthropic.com/v1/models?limit=100".to_string(),
        _ => {
            let Ok(mut url) = reqwest::Url::parse(base_url) else {
                return format!("{}/models", base_url.trim_end_matches('/'));
            };
            if let Ok(mut segments) = url.path_segments_mut() {
                segments.pop_if_empty().push("models");
            }
            url.to_string()
        }
    }
}

pub fn status_code(status: u16) -> &'static str {
    match status {
        400 | 422 => "http_400",
        401 | 403 => "http_401",
        402 => "model_unavailable",
        300..=399 => "config",
        404 => "http_404",
        429 => "http_429",
        _ => "http_5xx",
    }
}

pub fn parse_models(body: &str) -> Result<Vec<String>, String> {
    let v: Value = serde_json::from_str(body).map_err(|_| "parse".to_string())?;
    let mut ids: Vec<String> = Vec::new();
    let mut found = false;
    if let Some(arr) = v.get("data").and_then(|d| d.as_array()) {
        found = true;
        for item in arr {
            if let Some(id) = item.get("id").and_then(|i| i.as_str()) {
                ids.push(id.to_string());
            } else if let Some(s) = item.as_str() {
                ids.push(s.to_string());
            }
        }
    } else if let Some(arr) = v.get("models").and_then(|d| d.as_array()) {
        found = true;
        for item in arr {
            if let Some(name) = item.get("name").and_then(|n| n.as_str()) {
                ids.push(name.strip_prefix("models/").unwrap_or(name).to_string());
            }
        }
    }
    if !found {
        return Err("parse".to_string());
    }
    ids.sort();
    ids.dedup();
    Ok(ids)
}

pub async fn list_models(
    client: &reqwest::Client,
    preset: &str,
    base_url: &str,
    key: &str,
) -> Result<Vec<String>, String> {
    let url = models_url(preset, base_url);
    if !url.starts_with("http") {
        return Err("config".to_string());
    }
    let req = match preset {
        "google" => client.get(&url).header("x-goog-api-key", key),
        "anthropic" => client
            .get(&url)
            .header("x-api-key", key)
            .header("anthropic-version", "2023-06-01"),
        _ => client.get(&url).bearer_auth(key),
    };
    let resp = req.send().await.map_err(|_| "network".to_string())?;
    let status = resp.status();
    if !status.is_success() {
        return Err(status_code(status.as_u16()).to_string());
    }
    let body = resp.text().await.map_err(|_| "network".to_string())?;
    parse_models(&body)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn url_per_preset() {
        assert_eq!(
            models_url("opencode", "https://x/openai/v1"),
            "https://opencode.ai/inference/v1/models"
        );
        assert_eq!(
            models_url("openai", "https://api.openai.com/v1"),
            "https://api.openai.com/v1/models"
        );
        assert_eq!(
            models_url("google", "https://generativelanguage.googleapis.com/v1beta/openai"),
            "https://generativelanguage.googleapis.com/v1beta/models"
        );
        assert_eq!(
            models_url("anthropic", "https://api.anthropic.com/v1"),
            "https://api.anthropic.com/v1/models?limit=100"
        );
        assert_eq!(models_url("custom", "http://localhost:8000/v1/"), "http://localhost:8000/v1/models");
    }

    #[test]
    fn parses_openai_shape_sorted_and_deduped() {
        let body = r#"{"object":"list","data":[{"id":"gpt-4o"},{"id":"gpt-4o-mini"},{"id":"gpt-4o"}]}"#;
        assert_eq!(parse_models(body).unwrap(), vec!["gpt-4o", "gpt-4o-mini"]);
    }

    #[test]
    fn parses_google_shape_and_strips_prefix() {
        let body = r#"{"models":[{"name":"models/gemini-2.5-flash"},{"name":"models/gemini-2.5-pro"}]}"#;
        assert_eq!(parse_models(body).unwrap(), vec!["gemini-2.5-flash", "gemini-2.5-pro"]);
    }

    #[test]
    fn parses_string_array() {
        let body = r#"{"data":["claude-sonnet-4-5"]}"#;
        assert_eq!(parse_models(body).unwrap(), vec!["claude-sonnet-4-5"]);
    }

    #[test]
    fn unknown_shape_is_parse_error() {
        assert_eq!(parse_models(r#"{"ok":true}"#).unwrap_err(), "parse");
        assert_eq!(parse_models("not json").unwrap_err(), "parse");
    }

    #[test]
    fn empty_list_is_ok() {
        assert_eq!(parse_models(r#"{"data":[]}"#).unwrap(), Vec::<String>::new());
    }

    #[test]
    fn model_list_status_maps_400_and_402() {
        assert_eq!(status_code(400), "http_400");
        assert_eq!(status_code(402), "model_unavailable");
        assert_eq!(status_code(429), "http_429");
        assert_eq!(status_code(302), "config");
    }

    #[test]
    fn custom_query_base_keeps_the_query() {
        assert_eq!(
            models_url("custom", "https://proxy.example/v1?key=1"),
            "https://proxy.example/v1/models?key=1"
        );
    }
}
