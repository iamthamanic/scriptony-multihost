//! Workspace project deletion helpers (T26).

use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

const MANIFEST_FILENAME: &str = "scriptony.json";
const SCRIPTONY_SUFFIX: &str = ".scriptony";
const DELETE_CONFIRMATION_PHRASE: &str = "delete";

fn normalize_delete_confirmation(input: &str) -> String {
    input.trim().to_lowercase()
}

fn validate_delete_confirmation(confirmation_phrase: &str) -> Result<(), String> {
    if normalize_delete_confirmation(confirmation_phrase) != DELETE_CONFIRMATION_PHRASE {
        return Err(format!(
            "Confirmation phrase must be exactly \"{DELETE_CONFIRMATION_PHRASE}\""
        ));
    }
    Ok(())
}

pub fn project_dir_under_workspace(workspace: &Path, entry_path: &Path) -> Result<(), String> {
    let canonical = entry_path
        .canonicalize()
        .map_err(|e| format!("Project path not accessible: {e}"))?;

    if !canonical.is_dir() {
        return Err("Project path must be a directory".to_string());
    }

    let name = canonical
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");
    if !name.ends_with(SCRIPTONY_SUFFIX) {
        return Err("Only .scriptony project folders can be deleted".to_string());
    }

    let parent = canonical
        .parent()
        .ok_or_else(|| "Invalid project parent path".to_string())?;
    let workspace_canon = workspace
        .canonicalize()
        .map_err(|e| format!("Workspace root not accessible: {e}"))?;

    if parent != workspace_canon {
        return Err("Project is not a direct child of the trusted workspace".to_string());
    }

    Ok(())
}

fn manifest_project_id(manifest_path: &Path) -> Result<Option<String>, String> {
    let raw = fs::read_to_string(manifest_path)
        .map_err(|e| format!("Failed to read project manifest: {e}"))?;
    let value: serde_json::Value = serde_json::from_str(&raw)
        .map_err(|e| format!("Invalid project manifest JSON: {e}"))?;
    let id = value
        .get("projectId")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    Ok(id)
}

/// Delete a workspace project folder by manifest `projectId` (trusted Rust path only, T59).
pub fn delete_workspace_project(
    app: &AppHandle,
    project_id: String,
    confirmation_phrase: String,
) -> Result<(), String> {
    validate_delete_confirmation(&confirmation_phrase)?;

    let workspace = crate::commands::workspace::paths::load_trusted_root(app)?.ok_or_else(|| {
        "No workspace configured. Choose a workspace folder first.".to_string()
    })?;

    let target_id = project_id.trim();
    if target_id.is_empty() {
        return Err("Project id is empty".to_string());
    }

    let entries = fs::read_dir(&workspace)
        .map_err(|e| format!("Failed to read workspace: {e}"))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read workspace entry: {e}"))?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");
        if !name.ends_with(SCRIPTONY_SUFFIX) {
            continue;
        }

        project_dir_under_workspace(&workspace, &path)?;

        let manifest_path = path.join(MANIFEST_FILENAME);
        if !manifest_path.is_file() {
            continue;
        }

        let Some(id) = manifest_project_id(&manifest_path)? else {
            continue;
        };

        if id != target_id {
            continue;
        }

        if path.is_symlink() {
            return Err("Refusing to delete symlinked project path".to_string());
        }

        let canonical = path
            .canonicalize()
            .map_err(|e| format!("Project path not accessible: {e}"))?;
        project_dir_under_workspace(&workspace, &canonical)?;

        fs::remove_dir_all(&canonical)
            .map_err(|e| format!("Failed to delete project folder: {e}"))?;
        return Ok(());
    }

    Err(format!("Project {target_id} not found in workspace"))
}
