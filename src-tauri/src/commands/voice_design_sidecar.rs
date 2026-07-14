//! Qwen VoiceDesign sidecar process lifecycle (MVE #56).

use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

static VOICE_DESIGN_SIDECAR_CHILD: Mutex<Option<Child>> = Mutex::new(None);
static VOICE_DESIGN_SIDECAR_TOKEN: Mutex<Option<String>> = Mutex::new(None);

fn new_sidecar_token() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("vd_{seed:x}")
}

fn voice_design_sidecar_port() -> u16 {
    std::env::var("SCRIPTONY_VOICE_DESIGN_SIDECAR_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(3767)
}

fn server_script_path() -> Result<String, String> {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").map_err(|e| e.to_string())?;
    Ok(format!(
        "{}/../scripts/qwen-voicedesign-sidecar/server.py",
        manifest_dir
    ))
}

#[tauri::command]
pub fn spawn_voice_design_sidecar() -> Result<String, String> {
    let mut guard = VOICE_DESIGN_SIDECAR_CHILD
        .lock()
        .map_err(|e| e.to_string())?;
    if guard.is_some() {
        let token_guard = VOICE_DESIGN_SIDECAR_TOKEN
            .lock()
            .map_err(|e| e.to_string())?;
        return Ok(token_guard.clone().unwrap_or_default());
    }

    let token = new_sidecar_token();
    let script = server_script_path()?;
    let port = voice_design_sidecar_port();
    let mut command = Command::new("python3");
    command
        .arg(&script)
        .env("SCRIPTONY_VOICE_DESIGN_SIDECAR_TOKEN", &token)
        .env("SCRIPTONY_VOICE_DESIGN_SIDECAR_PORT", port.to_string())
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    if let Ok(stub) = std::env::var("QWEN_VOICEDESIGN_STUB") {
        command.env("QWEN_VOICEDESIGN_STUB", stub);
    }

    let child = command
        .spawn()
        .map_err(|e| format!("Qwen VoiceDesign Sidecar konnte nicht gestartet werden: {e}"))?;

    *guard = Some(child);
    let mut token_guard = VOICE_DESIGN_SIDECAR_TOKEN
        .lock()
        .map_err(|e| e.to_string())?;
    *token_guard = Some(token.clone());
    Ok(token)
}

#[tauri::command]
pub fn stop_voice_design_sidecar() -> Result<(), String> {
    let mut guard = VOICE_DESIGN_SIDECAR_CHILD
        .lock()
        .map_err(|e| e.to_string())?;
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
    }
    let mut token_guard = VOICE_DESIGN_SIDECAR_TOKEN
        .lock()
        .map_err(|e| e.to_string())?;
    *token_guard = None;
    Ok(())
}

#[tauri::command]
pub fn voice_design_sidecar_health() -> bool {
    use std::net::TcpStream;
    let port = voice_design_sidecar_port();
    TcpStream::connect(format!("127.0.0.1:{port}")).is_ok()
}
