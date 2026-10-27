use std::sync::atomic::{AtomicBool, Ordering};

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::{Error, UpdaterExt};

static UPDATING: AtomicBool = AtomicBool::new(false);

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
    update
        .install(bytes)
        .map_err(|e| install_error_code(&e).to_string())
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
}
