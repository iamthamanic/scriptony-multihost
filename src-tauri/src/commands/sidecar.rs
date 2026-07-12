//! Local jobs sidecar process lifecycle (T43).

use super::path_validate::validate_scriptony_project_dir;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

static SIDECAR_CHILD: Mutex<Option<Child>> = Mutex::new(None);
static SIDECAR_TOKEN: Mutex<Option<String>> = Mutex::new(None);

fn new_sidecar_token() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("sc_{seed:x}")
}

fn sidecar_port() -> u16 {
    std::env::var("SCRIPTONY_SIDECAR_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(3765)
}

fn server_script_path() -> Result<String, String> {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").map_err(|e| e.to_string())?;
    Ok(format!(
        "{}/../scripts/local-sidecar/server.mjs",
        manifest_dir
    ))
}

#[tauri::command]
pub fn spawn_sidecar(project_dir: String) -> Result<String, String> {
    let validated = validate_scriptony_project_dir(&project_dir)?;
    let mut guard = SIDECAR_CHILD.lock().map_err(|e| e.to_string())?;
    if guard.is_some() {
        let token_guard = SIDECAR_TOKEN.lock().map_err(|e| e.to_string())?;
        return Ok(token_guard.clone().unwrap_or_default());
    }

    let token = new_sidecar_token();
    let script = server_script_path()?;
    let port = sidecar_port();
    let child = Command::new("node")
        .arg(&script)
        .env("SCRIPTONY_PROJECT_DIR", validated.to_string_lossy().to_string())
        .env("SCRIPTONY_SIDECAR_TOKEN", &token)
        .env("SCRIPTONY_SIDECAR_PORT", port.to_string())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to start sidecar: {e}"))?;

    *guard = Some(child);
    let mut token_guard = SIDECAR_TOKEN.lock().map_err(|e| e.to_string())?;
    *token_guard = Some(token.clone());
    Ok(token)
}

#[tauri::command]
pub fn stop_sidecar() -> Result<(), String> {
    let mut guard = SIDECAR_CHILD.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
    }
    let mut token_guard = SIDECAR_TOKEN.lock().map_err(|e| e.to_string())?;
    *token_guard = None;
    Ok(())
}

#[tauri::command]
pub fn sidecar_health() -> bool {
    use std::net::TcpStream;
    let port = sidecar_port();
    TcpStream::connect(format!("127.0.0.1:{port}")).is_ok()
}
