//! Kokoro local TTS sidecar process lifecycle.
//!
//! Spawns a Python HTTP server (tools/kokoro-server/main.py) that wraps the
//! Kokoro ONNX TTS engine.  The server exposes /voices and /synthesize.

use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

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
    base.join(".scriptony")
        .join("kokoro-output")
        .to_string_lossy()
        .to_string()
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

fn http_post_json(
    url: &str,
    body: &serde_json::Value,
    timeout_secs: u64,
) -> Result<String, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(timeout_secs))
        .build()
        .map_err(|e| format!("HTTP client error: {e}"))?;
    let resp = client
        .post(url)
        .json(body)
        .send()
        .map_err(|e| format!("HTTP error: {e}"))?;
    if !resp.status().is_success() {
        let status = resp.status();
        let err = resp.text().unwrap_or_default();
        return Err(format!("HTTP status {status}: {err}"));
    }
    resp.text()
        .map_err(|e| format!("Body read error: {e}"))
}

fn prune_dead_child(guard: &mut std::sync::MutexGuard<'_, Option<Child>>) {
    if let Some(child) = guard.as_mut() {
        if child
            .try_wait()
            .ok()
            .flatten()
            .is_some()
        {
            guard.take();
        }
    }
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KokoroServerStatus {
    pub status: String,
    pub kokoro_ready: bool,
    pub phase: String,
    pub progress: i32,
    pub message: String,
}

#[derive(serde::Deserialize)]
struct KokoroStatusApiResponse {
    status: String,
    kokoro_ready: bool,
    phase: String,
    progress: i32,
    message: String,
}

fn read_kokoro_status() -> Result<Option<KokoroServerStatus>, String> {
    let port = kokoro_port();
    let url = format!("http://127.0.0.1:{port}/status");
    let body = match http_get(&url, 3) {
        Ok(b) => b,
        Err(_) => return Ok(None),
    };
    let parsed: KokoroStatusApiResponse =
        serde_json::from_str(&body).map_err(|e| format!("JSON parse error: {e}"))?;
    Ok(Some(KokoroServerStatus {
        status: parsed.status,
        kokoro_ready: parsed.kokoro_ready,
        phase: parsed.phase,
        progress: parsed.progress,
        message: parsed.message,
    }))
}

/// True when Kokoro HTTP `/health` returns `{ "status": "ok" }`.
#[tauri::command]
pub fn kokoro_server_health() -> bool {
    let port = kokoro_port();
    let url = format!("http://127.0.0.1:{port}/health");
    let Ok(body) = http_get(&url, 2) else {
        return false;
    };
    serde_json::from_str::<serde_json::Value>(&body)
        .ok()
        .and_then(|v| v.get("status").and_then(|s| s.as_str()).map(|s| s == "ok"))
        .unwrap_or(false)
}

#[tauri::command]
pub fn start_kokoro_sidecar(project_dir: String) -> Result<String, String> {
    if kokoro_server_health() {
        if let Ok(Some(status)) = read_kokoro_status() {
            if status.kokoro_ready {
                return Ok("already_running".to_string());
            }
            if status.phase != "error" {
                return Ok("already_running".to_string());
            }
        } else {
            return Ok("already_running".to_string());
        }
        let _ = stop_kokoro_sidecar();
    }

    let mut guard = KOKORO_CHILD.lock().map_err(|e| e.to_string())?;
    prune_dead_child(&mut guard);

    if guard.is_some() {
        let _ = guard.take().map(|mut c| c.kill());
    }

    let port = kokoro_port();
    let output_dir = resolve_project_output_dir(&project_dir);

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

#[derive(serde::Serialize, serde::Deserialize, Clone)]
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

    let body = tokio::task::spawn_blocking(move || http_get(&url, 5))
        .await
        .map_err(|e| format!("Task error: {e}"))??;

    #[derive(serde::Deserialize)]
    struct VoicesResponse {
        voices: Vec<VoiceEntry>,
    }

    let parsed: VoicesResponse =
        serde_json::from_str(&body).map_err(|e| format!("JSON parse error: {e}"))?;

    Ok(parsed.voices)
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KokoroSynthesizeResponse {
    pub audio_path: String,
    pub duration: f64,
    pub format: String,
}

/// Synthesize speech via Kokoro sidecar (bypasses WebView CORS on POST).
#[tauri::command]
pub async fn synthesize_kokoro(
    text: String,
    voice: String,
    speed: Option<f64>,
    format: Option<String>,
) -> Result<KokoroSynthesizeResponse, String> {
    let port = kokoro_port();
    let url = format!("http://127.0.0.1:{port}/synthesize");
    let body = serde_json::json!({
        "text": text,
        "voice": voice,
        "speed": speed.unwrap_or(1.0),
        "format": format.unwrap_or_else(|| "wav".to_string()),
    });

    let response_text = tokio::task::spawn_blocking(move || http_post_json(&url, &body, 120))
        .await
        .map_err(|e| format!("Task error: {e}"))??;

    serde_json::from_str(&response_text).map_err(|e| format!("JSON parse error: {e}"))
}

/// Detailed Kokoro sidecar status (`/status`). Returns None when HTTP is not up yet.
#[tauri::command]
pub fn kokoro_server_status() -> Result<Option<KokoroServerStatus>, String> {
    read_kokoro_status()
}
