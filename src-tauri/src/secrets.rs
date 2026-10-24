const SERVICE: &str = "cue";
const LEGACY_USER: &str = "api-key";

pub fn entry_user(preset: &str) -> String {
    format!("api-key:{preset}")
}

fn entry(user: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICE, user).map_err(|_| "keystore".to_string())
}

fn read(user: &str) -> Result<Option<String>, String> {
    match entry(user)?.get_password() {
        Ok(p) if !p.is_empty() => Ok(Some(p)),
        Ok(_) => Ok(None),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(_) => Err("keystore".into()),
    }
}

pub fn can_migrate_legacy(preset: &str) -> bool {
    crate::ai::preset_base_url(preset).is_some()
}

pub fn get_key(preset: &str) -> Result<Option<String>, String> {
    if let Some(key) = read(&entry_user(preset))? {
        return Ok(Some(key));
    }
    let Some(legacy) = read(LEGACY_USER)? else {
        return Ok(None);
    };
    // 커스텀/미지의 프리셋으로 복사하면 그 base URL로 키가 전송될 수 있다.
    if !can_migrate_legacy(preset) {
        return Ok(None);
    }
    let migrated = entry(&entry_user(preset))
        .map(|entry| entry.set_password(&legacy).is_ok())
        .unwrap_or(false);
    if migrated {
        if let Ok(entry) = entry(LEGACY_USER) {
            let _ = entry.delete_credential();
        }
    }
    Ok(Some(legacy))
}

pub fn set_key(preset: &str, key: &str) -> Result<(), String> {
    let entry = entry(&entry_user(preset))?;
    if key.is_empty() {
        return match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(_) => Err("keystore".into()),
        };
    }
    entry.set_password(key).map_err(|_| "keystore".to_string())
}

pub fn delete_key(preset: &str) -> Result<(), String> {
    set_key(preset, "")
}

pub fn has_key(preset: &str) -> Result<bool, String> {
    Ok(matches!(get_key(preset)?, Some(_)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn entry_user_is_scoped_by_preset() {
        assert_eq!(entry_user("openai"), "api-key:openai");
        assert_eq!(entry_user("anthropic"), "api-key:anthropic");
        assert_ne!(entry_user("google"), entry_user("openai"));
    }

    #[test]
    fn legacy_migration_is_limited_to_known_presets() {
        assert!(can_migrate_legacy("opencode"));
        assert!(can_migrate_legacy("openai"));
        assert!(!can_migrate_legacy("custom"));
        assert!(!can_migrate_legacy("unknown"));
    }
}
