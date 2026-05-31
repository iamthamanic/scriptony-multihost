//! Workspace root FS scope registration (T44).
//! REFACTORED: split into workspace/ sub-modules (T26).

mod workspace;

pub use workspace::delete::*;
pub use workspace::paths::*;
pub use workspace::validation::*;

use tauri::AppHandle;
use tauri::Manager;

/// Native folder picker + validated FS scope (trusted user consent path).
#[tauri::command]
pub async fn pick_workspace_folder(app: AppHandle) -> Result<String, String> {
    let picked = rfd::AsyncFileDialog::new()
        .set_title("Scriptony-Workspace-Ordner wählen")
        .pick_folder()
        .await
        .ok_or_else(|| "Folder selection cancelled".to_string())?;

    let path = picked.path().to_string_lossy().to_string();
    let canonical = workspace::validation::validate_workspace_root(&path)?;
    workspace::paths::allow_workspace_directory(&app, &canonical)?;
    workspace::paths::persist_trusted_root(&app, &canonical)?;
    Ok(canonical.to_string_lossy().to_string())
}

/// Re-allow FS access for the trusted workspace root stored on the Rust side.
#[tauri::command]
pub fn restore_workspace_scope(app: AppHandle) -> Result<(), String> {
    let canonical = workspace::paths::load_trusted_root(&app)?.ok_or_else(|| {
        "No workspace configured. Choose a workspace folder first.".to_string()
    })?;
    workspace::paths::allow_workspace_directory(&app, &canonical)
}

#[tauri::command]
pub fn get_stored_workspace_root(app: AppHandle) -> Result<Option<String>, String> {
    Ok(workspace::paths::load_trusted_root(&app)?.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub fn clear_stored_workspace_root(app: AppHandle) -> Result<(), String> {
    workspace::paths::clear_trusted_root(&app)
}

/// Legacy: only re-register if path matches trusted root (refresh after app restart).
#[tauri::command]
pub fn register_workspace_scope(app: AppHandle, path: String) -> Result<(), String> {
    let canonical = workspace::paths::ensure_trusted_root(&app, &path)?;
    workspace::paths::allow_workspace_directory(&app, &canonical)
}

/// Delete a workspace project folder by manifest `projectId` (trusted Rust path only, T59).
#[tauri::command]
pub fn delete_workspace_project(
    app: AppHandle,
    project_id: String,
    confirmation_phrase: String,
) -> Result<(), String> {
    workspace::delete::delete_workspace_project(&app,
        project_id,
        confirmation_phrase,
    )
}
