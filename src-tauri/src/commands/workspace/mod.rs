//! Workspace root FS scope registration (T44).
//! REFACTORED: split into workspace/ sub-modules (T26).

pub mod delete;
pub mod paths;
pub mod validation;

use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn pick_workspace_folder(app: AppHandle) -> Result<String, String> {
    let dialog_app = app.clone();
    let picked = tauri::async_runtime::spawn_blocking(move || {
        dialog_app
            .dialog()
            .file()
            .set_title("Scriptony-Workspace-Ordner wählen")
            .blocking_pick_folder()
    })
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "Folder selection cancelled".to_string())?;

    let path = picked
        .into_path()
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .to_string();
    let canonical = validation::validate_workspace_root(&path)?;
    paths::allow_workspace_directory(&app, &canonical)?;
    paths::persist_trusted_root(&app, &canonical)?;
    Ok(canonical.to_string_lossy().to_string())
}

#[tauri::command]
pub fn restore_workspace_scope(app: AppHandle) -> Result<(), String> {
    let canonical = paths::load_trusted_root(&app)?.ok_or_else(|| {
        "No workspace configured. Choose a workspace folder first.".to_string()
    })?;
    paths::allow_workspace_directory(&app, &canonical)
}

#[tauri::command]
pub fn get_stored_workspace_root(app: AppHandle) -> Result<Option<String>, String> {
    Ok(paths::load_trusted_root(&app)?.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub fn clear_stored_workspace_root(app: AppHandle) -> Result<(), String> {
    paths::clear_trusted_root(&app)
}

#[tauri::command]
pub fn register_workspace_scope(app: AppHandle, path: String) -> Result<(), String> {
    let canonical = paths::ensure_trusted_root(&app, &path)?;
    paths::allow_workspace_directory(&app, &canonical)
}

#[tauri::command]
pub fn delete_workspace_project(
    app: AppHandle,
    project_id: String,
    confirmation_phrase: String,
) -> Result<(), String> {
    delete::delete_workspace_project(&app,
        project_id,
        confirmation_phrase,
    )
}
