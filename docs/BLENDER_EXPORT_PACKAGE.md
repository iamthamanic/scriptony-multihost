# Blender Export Package (T42)

Scriptony desktop can write a portable export folder for Blender workflows.

## Layout

Written under `<project>.scriptony/exports/blender/scriptony-blender-export/`:

```
<scriptony-blender-export>/
  manifest.json      # schemaVersion, project meta
  structure.json     # project structure (when populated by export)
  characters.json    # character list
  assets/            # copied media with relative paths
```

## manifest.json

| Field | Description |
|-------|-------------|
| `schemaVersion` | `1` |
| `projectId` | Scriptony project id |
| `projectName` | Display name |
| `exportedAt` | ISO timestamp |
| `source` | `local` or `cloud` |
| `structurePath` | Relative path to structure file |
| `charactersPath` | Relative path to characters file |
| `assetsDir` | Relative assets directory name |

## Desktop commands

Tauri commands: `blender_is_available`, `blender_get_version`, `blender_export_project`.

Live bridge (`blender_connect_live`, `blender_sync_scene`) returns `not implemented` in MVP.

## Distinction from local-bridge

`local-bridge/` is the Docker render/ComfyUI pipeline. T42 is the local Blender executable + export package only.
