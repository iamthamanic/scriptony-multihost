//! Voicebox local TTS backend lifecycle (macOS headless auto-launch).
//!
//! Scriptony starts `voicebox-server` inside Voicebox.app — not the GUI —
//! so TTS runs headless and does not auto-play in the Voicebox window.

use std::path::PathBuf;
use std::process::{Command, Stdio};
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

fn resolve_voicebox_bundle(app_name: &str, app_path: Option<&str>) -> PathBuf {
    if let Some(path) = app_path.filter(|s| !s.trim().is_empty()) {
        return PathBuf::from(path);
    }
    if let Ok(env_path) = std::env::var("VOICEBOX_APP_PATH") {
        if !env_path.trim().is_empty() {
            return PathBuf::from(env_path);
        }
    }
    PathBuf::from(format!("/Applications/{app_name}.app"))
}

fn resolve_voicebox_server_binary(
    app_name: &str,
    app_path: Option<&str>,
) -> Result<PathBuf, String> {
    let server = resolve_voicebox_bundle(app_name, app_path)
        .join("Contents/MacOS/voicebox-server");
    if server.is_file() {
        return Ok(server);
    }
    Err(format!(
        "voicebox-server nicht gefunden unter {}. \
         Einmalig ausführen: ./scripts/install-voicebox-macos.sh",
        server.display()
    ))
}

fn spawn_voicebox_server_headless(
    app_name: &str,
    app_path: Option<&str>,
) -> Result<(), String> {
    let server = resolve_voicebox_server_binary(app_name, app_path)?;
    Command::new(&server)
        .arg("--port")
        .arg(voicebox_port().to_string())
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("TTS-Server konnte nicht gestartet werden: {e}"))?;
    Ok(())
}

/// Launch Voicebox headless server on macOS when not already reachable.
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
        let app_path_ref = app_path.as_deref();
        match spawn_voicebox_server_headless(&name, app_path_ref) {
            Ok(()) => return Ok("launched".to_string()),
            Err(headless_err) => {
                // Fallback: legacy GUI launch if server binary missing (old installs).
                let resolved_path = resolve_voicebox_bundle(&name, app_path_ref);
                if !resolved_path.exists() {
                    return Err(format!(
                        "Lokaler TTS-Dienst ist nicht installiert. \
                         Einmalig ausführen: ./scripts/install-voicebox-macos.sh \
                         ({headless_err})"
                    ));
                }
                let output = Command::new("open")
                    .arg("-g")
                    .arg("-j")
                    .arg(&resolved_path)
                    .output()
                    .map_err(|e| format!("TTS-Dienst konnte nicht gestartet werden: {e}"))?;

                if !output.status.success() {
                    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                    return Err(if stderr.is_empty() {
                        headless_err
                    } else {
                        format!("{headless_err} ({stderr})")
                    });
                }
                return Ok("launched_gui_fallback".to_string());
            }
        }
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
