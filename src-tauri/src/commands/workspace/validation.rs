//! Workspace path validation (T26).

use std::path::{Component, Path, PathBuf};

pub fn is_home_root(canonical: &Path) -> bool {
    if let Ok(home) = std::env::var("HOME").map(PathBuf::from) {
        if let Ok(home_canon) = home.canonicalize() {
            return canonical == home_canon;
        }
    }
    false
}

pub fn validate_workspace_root(path: &str) -> Result<PathBuf, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Workspace path is empty".to_string());
    }

    let path = PathBuf::from(trimmed);
    if !path.is_absolute() {
        return Err("Workspace path must be absolute".to_string());
    }

    for component in path.components() {
        if matches!(component, Component::ParentDir) {
            return Err("Workspace path must not contain parent references".to_string());
        }
    }

    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");

    if file_name.is_empty() || file_name == "." || file_name == ".." {
        return Err("Workspace path must name a folder".to_string());
    }

    if file_name.ends_with(".scriptony") {
        return Err(
            "Workspace root must be a normal folder, not a .scriptony project directory"
                .to_string(),
        );
    }

    if !path.exists() {
        return Err("Workspace path must exist before registration".to_string());
    }

    let canonical = path
        .canonicalize()
        .map_err(|e| format!("Workspace path not accessible: {e}"))?;

    if !canonical.is_dir() {
        return Err("Workspace path must be a directory".to_string());
    }

    if canonical.components().count() <= 1 {
        return Err("Workspace path cannot be a filesystem root".to_string());
    }

    if is_home_root(&canonical) {
        return Err(
            "Choose a subfolder inside your home directory, not the home root itself".to_string(),
        );
    }

    Ok(canonical)
}
