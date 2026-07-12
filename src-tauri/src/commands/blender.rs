//! Blender bridge commands (T42) — detect, version, export stub.

use super::path_validate::validate_export_under_project;
use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportBlenderProjectInput {
    pub project_dir: Option<String>,
    pub project_id: Option<String>,
    pub source: String,
    pub export_dir: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BlenderExportResult {
    pub export_dir: String,
    pub manifest_path: String,
    pub schema_version: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BlenderConnection {
    pub connected: bool,
    pub message: Option<String>,
}

fn find_blender_binary() -> Option<String> {
    if Command::new("blender")
        .arg("--version")
        .output()
        .ok()
        .filter(|o| o.status.success())
        .is_some()
    {
        return Some("blender".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        let app = "/Applications/Blender.app/Contents/MacOS/Blender";
        if std::path::Path::new(app).exists() {
            return Some(app.to_string());
        }
    }

    None
}

#[tauri::command]
pub fn blender_is_available() -> bool {
    find_blender_binary().is_some()
}

#[tauri::command]
pub fn blender_get_version() -> Option<String> {
    let bin = find_blender_binary()?;
    let output = Command::new(&bin).arg("--version").output().ok()?;
    if !output.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&output.stdout);
    text.lines().next().map(|s| s.trim().to_string())
}

#[tauri::command]
pub fn blender_export_project(input: ExportBlenderProjectInput) -> Result<BlenderExportResult, String> {
    let project_dir = input
        .project_dir
        .as_deref()
        .ok_or_else(|| "projectDir is required for export".to_string())?;
    let export_dir = validate_export_under_project(project_dir, &input.export_dir)?;
    let package_dir = export_dir.join("scriptony-blender-export");
    std::fs::create_dir_all(&package_dir).map_err(|e| e.to_string())?;

    let manifest = serde_json::json!({
        "schemaVersion": 1,
        "projectId": input.project_id,
        "projectDir": input.project_dir,
        "source": input.source,
        "exportedAt": chrono_lite_now(),
    });

    let manifest_path = package_dir.join("manifest.json");
    std::fs::write(
        &manifest_path,
        serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    Ok(BlenderExportResult {
        export_dir: package_dir.to_string_lossy().to_string(),
        manifest_path: manifest_path.to_string_lossy().to_string(),
        schema_version: 1,
    })
}

fn chrono_lite_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("{secs}")
}

#[tauri::command]
pub fn blender_install_addon() -> Result<(), String> {
    Err("blender_install_addon: not implemented in MVP".to_string())
}

#[tauri::command]
pub fn blender_connect_live() -> BlenderConnection {
    BlenderConnection {
        connected: false,
        message: Some("Live Blender bridge not implemented yet.".to_string()),
    }
}

#[tauri::command]
pub fn blender_sync_scene() -> Result<(), String> {
    Err("blender_sync_scene: not implemented in MVP".to_string())
}
