use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, SystemTime};

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::{Error, UpdaterExt};

static UPDATING: AtomicBool = AtomicBool::new(false);

const UPDATE_TEMP_MIN_AGE: Duration = Duration::from_secs(10 * 60);

fn is_updater_temp_dir(name: &str) -> bool {
    let name = name.to_ascii_lowercase();
    name.starts_with("cue-") && name.contains("-updater-")
}

fn has_installer(path: &Path) -> bool {
    let Ok(entries) = std::fs::read_dir(path) else {
        return false;
    };
    entries.flatten().any(|entry| {
        entry.file_type().map(|kind| kind.is_file()).unwrap_or(false)
            && entry
                .file_name()
                .to_str()
                .is_some_and(|name| {
                    let name = name.to_ascii_lowercase();
                    name.starts_with("cue-") && name.ends_with("-installer.exe")
                })
    })
}

fn cleanup_temp_installers_in(root: &Path, min_age: Duration) {
    let Ok(entries) = std::fs::read_dir(root) else {
        return;
    };
    let now = SystemTime::now();
    for entry in entries.flatten() {
        let path = entry.path();
        let Some(name) = path.file_name().and_then(|name| name.to_str()) else {
            continue;
        };
        if !is_updater_temp_dir(name) {
            continue;
        }
        let Ok(metadata) = entry.metadata() else {
            continue;
        };
        if !metadata.is_dir() || !has_installer(&path) {
            continue;
        }
        let Ok(modified) = metadata.modified() else {
            continue;
        };
        if now.duration_since(modified).unwrap_or_default() < min_age {
            continue;
        }
        let _ = std::fs::remove_dir_all(path);
    }
}

pub fn cleanup_temp_installers() {
    cleanup_temp_installers_in(&std::env::temp_dir(), UPDATE_TEMP_MIN_AGE);
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    version: String,
    notes: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateProgress {
    downloaded: u64,
    total: Option<u64>,
}

fn error_code(error: &Error) -> &'static str {
    match error {
        Error::Minisign(_)
        | Error::Base64(_)
        | Error::SignatureUtf8(_)
        | Error::SignedVersionMismatch { .. }
        | Error::MissingSignedVersion => "update_signature",
        Error::Reqwest(_) | Error::Network(_) => "network",
        _ => "update_check",
    }
}

fn install_error_code(error: &Error) -> &'static str {
    match error {
        Error::Minisign(_)
        | Error::Base64(_)
        | Error::SignatureUtf8(_)
        | Error::SignedVersionMismatch { .. }
        | Error::MissingSignedVersion => "update_signature",
        _ => "update_install",
    }
}

pub async fn check(app: &AppHandle) -> Result<Option<UpdateInfo>, String> {
    let updater = app.updater().map_err(|e| error_code(&e).to_string())?;
    let update = updater
        .check()
        .await
        .map_err(|e| error_code(&e).to_string())?;
    Ok(update.map(|update| UpdateInfo {
        version: update.version,
        notes: update.body,
    }))
}

pub async fn install(app: &AppHandle) -> Result<(), String> {
    if UPDATING.swap(true, Ordering::SeqCst) {
        return Err("update_busy".into());
    }
    let result = install_inner(app).await;
    if result.is_err() {
        UPDATING.store(false, Ordering::SeqCst);
    }
    result
}

async fn install_inner(app: &AppHandle) -> Result<(), String> {
    cleanup_temp_installers();
    let updater = app.updater().map_err(|e| error_code(&e).to_string())?;
    let update = updater
        .check()
        .await
        .map_err(|e| error_code(&e).to_string())?
        .ok_or_else(|| "update_unavailable".to_string())?;

    let mut downloaded = 0u64;
    let bytes = update
        .download(
            |chunk, total| {
                downloaded += chunk as u64;
                let _ = app.emit("update-progress", UpdateProgress { downloaded, total });
            },
            || {},
        )
        .await
        .map_err(|e| error_code(&e).to_string())?;

    // The Windows installer kills and replaces cue.exe. Stop the guard from
    // reviving the old process while the installer is running.
    crate::guard::set_quit_flag();
    let result = update.install(bytes);
    if result.is_err() {
        cleanup_temp_installers_in(&std::env::temp_dir(), Duration::ZERO);
    }
    result.map_err(|e| install_error_code(&e).to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn network_failures_use_the_network_code() {
        assert_eq!(error_code(&Error::Network("offline".into())), "network");
        assert_eq!(error_code(&Error::ReleaseNotFound), "update_check");
    }

    #[test]
    fn installer_failures_use_the_install_code() {
        assert_eq!(
            install_error_code(&Error::ReleaseNotFound),
            "update_install"
        );
    }

    #[test]
    fn updater_temp_names_are_specific() {
        assert!(is_updater_temp_dir("Cue-0.1.3-updater-abc"));
        assert!(!is_updater_temp_dir("Cue-0.1.3"));
        assert!(!is_updater_temp_dir("Other-0.1.3-updater-abc"));
    }

    #[test]
    fn cleanup_removes_only_installer_directories() {
        let root = std::env::temp_dir().join(format!("cue-cleanup-test-{}", std::process::id()));
        let updater = root.join("Cue-0.1.3-updater-test");
        let keep = root.join("Cue-0.1.3-data");
        std::fs::create_dir_all(&updater).unwrap();
        std::fs::create_dir_all(&keep).unwrap();
        std::fs::write(updater.join("Cue-0.1.3-installer.exe"), b"x").unwrap();
        std::fs::write(keep.join("data.txt"), b"x").unwrap();

        cleanup_temp_installers_in(&root, Duration::ZERO);

        assert!(!updater.exists());
        assert!(keep.exists());
        let _ = std::fs::remove_dir_all(root);
    }
}
