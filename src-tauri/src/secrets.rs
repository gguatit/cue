const SERVICE: &str = "cue";

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

pub fn get_key(preset: &str) -> Result<Option<String>, String> {
    read(&entry_user(preset))
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

}
