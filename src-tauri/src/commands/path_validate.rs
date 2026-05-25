//! Path validation for desktop commands (T42/T43).

use std::path::{Component, PathBuf};

pub fn validate_scriptony_project_dir(project_dir: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(project_dir);
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Invalid project path".to_string())?;

    if !file_name.ends_with(".scriptony") {
        return Err("Project path must end with .scriptony".to_string());
    }

    let canonical = path
        .canonicalize()
        .map_err(|e| format!("Project path not found: {e}"))?;

    if !canonical.is_dir() {
        return Err("Project path must be a directory".to_string());
    }

    Ok(canonical)
}

pub fn validate_export_under_project(
    project_dir: &str,
    export_dir: &str,
) -> Result<PathBuf, String> {
    let project = validate_scriptony_project_dir(project_dir)?;
    let export = PathBuf::from(export_dir);
    let export_canonical = if export.is_absolute() {
        export
            .canonicalize()
            .map_err(|e| format!("Export path invalid: {e}"))?
    } else {
        project.join(export)
    };

    if !export_canonical.starts_with(&project) {
        return Err("Export path must stay inside the project directory".to_string());
    }

    for component in export_canonical.components() {
        if matches!(component, Component::ParentDir) {
            return Err("Export path must not contain parent references".to_string());
        }
    }

    Ok(export_canonical)
}
