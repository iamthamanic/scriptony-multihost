//! Voicebox local TTS app lifecycle (macOS auto-launch).
//!
//! Voicebox runs as a separate desktop app exposing REST on port 17493.
//! Scriptony polls GET /profiles for readiness (unlike Kokoro sidecar spawn).

use std::process::Command;
use std::time::Duration;

fn voicebox_port() -> u16 {
    std::env::var("VOICEBOX_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(17493)
}

fn default_voicebox_app_name() -> String {
    std::env::var("VOICEBOX_APP_NAME").unwrap_or_else(|_| "Voicebox".to_string())
}

fn profiles_url() -> String {
    format!("http://127.0.0.1:{}/profiles", voicebox_port())
}

fn http_get(url: &str, timeout_secs: u64) -> Result<String, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(timeout_secs))
        .build()
        .map_err(|e| format!("HTTP client error: {e}"))?;
    let resp = client
        .get(url)
        .send()
        .map_err(|e| format!("HTTP error: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("HTTP status {}", resp.status()));
    }
    resp.text()
        .map_err(|e| format!("Body read error: {e}"))
}

fn voicebox_profiles_reachable() -> bool {
    http_get(&profiles_url(), 2).is_ok()
}

/// True when Voicebox HTTP `/profiles` responds successfully.
#[tauri::command]
pub fn voicebox_server_health() -> bool {
    voicebox_profiles_reachable()
}

/// Launch Voicebox app on macOS when not already reachable.
#[tauri::command]
pub fn start_voicebox_app(app_name: Option<String>, app_path: Option<String>) -> Result<String, String> {
    if voicebox_profiles_reachable() {
        return Ok("already_running".to_string());
    }

    let name = app_name
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(default_voicebox_app_name);

    #[cfg(target_os = "macos")]
    {
        let resolved_path = app_path
            .filter(|s| !s.trim().is_empty())
            .or_else(|| {
                std::env::var("VOICEBOX_APP_PATH")
                    .ok()
                    .filter(|s| !s.trim().is_empty())
            });

        let output = if let Some(path) = resolved_path {
            Command::new("open")
                .arg("-g")
                .arg("-j")
                .arg(&path)
                .output()
                .map_err(|e| format!("TTS-Dienst konnte nicht gestartet werden ({path}): {e}"))?
        } else {
            Command::new("open")
                .arg("-g")
                .arg("-j")
                .arg("-a")
                .arg(&name)
                .output()
                .map_err(|e| format!("TTS-Dienst konnte nicht gestartet werden ({name}): {e}"))?
        };

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            let hint = if stderr.contains("Unable to find application") {
                format!(
                    "Lokaler TTS-Dienst ist nicht installiert. \
                     Einmalig ausführen: ./scripts/install-voicebox-macos.sh \
                     (läuft danach im Hintergrund — Einstellungen nur in Scriptony)."
                )
            } else {
                format!(
                    "Lokaler TTS-Dienst konnte nicht gestartet werden. \
                     Scriptony startet ihn automatisch im Hintergrund."
                )
            };
            if !stderr.is_empty() {
                return Err(format!("{hint} ({stderr})"));
            }
            return Err(hint);
        }

        Ok("launched".to_string())
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = name;
        Err(
            "Voicebox Auto-Start ist nur unter macOS verfügbar. Bitte Voicebox manuell starten."
                .to_string(),
        )
    }
}
