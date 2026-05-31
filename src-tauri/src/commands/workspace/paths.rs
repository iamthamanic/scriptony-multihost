//! Workspace trusted-root persistence helpers (T26).

use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use tauri::AppHandle;
use tauri::Manager;
use tauri_plugin_fs::FsExt;

static TRUSTED_WORKSPACE: Mutex<Option<PathBuf>> = Mutex::new(None);

pub fn workspace_root_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("App data dir unavailable: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create app data dir: {e}"))?;
    Ok(dir.join("workspace-root.txt"))
}

pub fn persist_trusted_root(app: &AppHandle, canonical: &std::path::Path) -> Result<(), String> {
    let file = workspace_root_file(app)?;
    fs::write(&file, canonical.to_string_lossy().as_bytes())
        .map_err(|e| format!("Failed to persist workspace root: {e}"))?;
    let mut guard = TRUSTED_WORKSPACE
        .lock()
        .map_err(|_| "Workspace state lock poisoned".to_string())?;
    *guard = Some(canonical.to_path_buf());
    Ok(())
}

pub fn load_trusted_root(app: &AppHandle) -> Result<Option<PathBuf>, String> {
    if let Ok(guard) = TRUSTED_WORKSPACE.lock() {
        if let Some(path) = guard.as_ref() {
            return Ok(Some(path.clone()));
        }
    }

    let file = workspace_root_file(app)?;
    if !file.exists() {
        return Ok(None);
    }

    let raw = fs::read_to_string(&file)
        .map_err(|e| format!("Failed to read workspace root: {e}"))?;
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }

    let canonical = crate::commands::workspace::validation::validate_workspace_root(trimmed)?;
    if let Ok(mut guard) = TRUSTED_WORKSPACE.lock() {
        *guard = Some(canonical.clone());
    }
    Ok(Some(canonical))
}

pub fn clear_trusted_root(app: &AppHandle) -> Result<(), String> {
    if let Ok(mut guard) = TRUSTED_WORKSPACE.lock() {
        *guard = None;
    }
    let file = workspace_root_file(app)?;
    if file.exists() {
        fs::remove_file(&file).map_err(|e| format!("Failed to clear workspace root: {e}"))?;
    }
    Ok(())
}

pub fn allow_workspace_directory(app: &AppHandle, canonical: &std::path::Path) -> Result<(), String> {
    app.fs_scope()
        .allow_directory(canonical, true)
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn ensure_trusted_root(app: &AppHandle, path: &str) -> Result<PathBuf, String> {
    let canonical = crate::commands::workspace::validation::validate_workspace_root(path)?;
    let trusted = load_trusted_root(app)?;
    match trusted {
        Some(saved) if saved == canonical => Ok(canonical),
        Some(_) => Err("Workspace path does not match the trusted desktop selection".to_string()),
        None => Err("No trusted workspace configured".to_string()),
    }
}
