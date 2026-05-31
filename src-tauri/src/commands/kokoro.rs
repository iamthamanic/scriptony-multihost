//! Kokoro local TTS sidecar process lifecycle.
//!
//! Spawns a Python HTTP server (tools/kokoro-server/main.py) that wraps the
//! Kokoro ONNX TTS engine.  The server exposes /voices and /synthesize.
//!
//! Environment:
//!   KOKORO_PORT        – override default port 8080
//!   KOKORO_OUTPUT_DIR  – where generated WAV files are written
//!
//! Tauri commands:
//!   start_kokoro_sidecar(project_dir)
//!   stop_kokoro_sidecar()
//!   kokoro_health()
//!   kokoro_voices()      – fetch available voices from the sidecar

use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

static KOKORO_CHILD: Mutex<Option<Child>> = Mutex::new(None);

fn kokoro_port() -> u16 {
    std::env::var("KOKORO_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(8080)
}

fn kokoro_script_path() -> Result<String, String> {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").map_err(|e| e.to_string())?;
    Ok(format!(
        "{}/../tools/kokoro-server/start.sh",
        manifest_dir
    ))
}

fn resolve_project_output_dir(project_dir: &str) -> String {
    let base = std::path::PathBuf::from(project_dir);
    let out = base.join(".scriptony").join("kokoro-output");
    out.to_string_lossy().to_string()
}

#[tauri::command]
pub fn start_kokoro_sidecar(project_dir: String) -> Result<String, String> {
    let mut guard = KOKORO_CHILD.lock().map_err(|e| e.to_string())?;
    if guard.is_some() {
        return Ok("already_running".to_string());
    }

    let port = kokoro_port();
    let output_dir = resolve_project_output_dir(&project_dir);

    // Ensure output directory exists before the Python server starts
    if let Err(e) = std::fs::create_dir_all(&output_dir) {
        return Err(format!("Failed to create Kokoro output dir: {e}"));
    }

    let script = kokoro_script_path()
        .map_err(|e| format!("Failed to resolve Kokoro script path: {e}"))?;

    let child = Command::new("bash")
        .arg(&script)
        .env("KOKORO_PORT", port.to_string())
        .env("KOKORO_OUTPUT_DIR", &output_dir)
        .env("SCRIPTONY_PROJECT_DIR", &project_dir)
        .env("PYTHON", std::env::var("PYTHON").unwrap_or_else(|_| "python3".to_string()))
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start Kokoro sidecar ({script}): {e}"))?;

    *guard = Some(child);
    Ok(format!("ok:{port}"))
}

#[tauri::command]
pub fn stop_kokoro_sidecar() -> Result<(), String> {
    let mut guard = KOKORO_CHILD.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
    }
    Ok(())
}

#[tauri::command]
pub fn kokoro_health() -> bool {
    use std::net::TcpStream;
    let port = kokoro_port();
    TcpStream::connect(format!("127.0.0.1:{port}")).is_ok()
}

// ── Helper: fetch voices from Kokoro REST API ─────────────────────────────

#[derive(serde::Serialize, serde::Deserialize)]
pub struct VoiceEntry {
    pub id: String,
    pub name: String,
    pub lang: String,
    pub gender: String,
}

#[tauri::command]
pub async fn list_kokoro_voices() -> Result<Vec<VoiceEntry>, String> {
    let port = kokoro_port();
    let url = format!("http://127.0.0.1:{port}/voices");

    // Simple HTTP GET using tauri::async_runtime blocking task
    let body = tokio::task::spawn_blocking(move || {
        let client = reqwest::blocking::Client::new();
        client.get(&url).timeout(std::time::Duration::from_secs(5)).send()
    })
    .await
    .map_err(|e| format!("Task error: {e}"))?
    .map_err(|e| format!("HTTP error: {e}"))?
    .text()
    .map_err(|e| format!("Body read error: {e}"))?;

    #[derive(serde::Deserialize)]
    struct VoicesResponse {
        voices: Vec<VoiceEntry>,
    }

    let parsed: VoicesResponse = serde_json::from_str(&body)
        .map_err(|e| format!("JSON parse error: {e}"))?;

    Ok(parsed.voices)
}
