# Local Project Format (`.scriptony`)

Scriptony local projects are folders with the `.scriptony` extension. They work
without Appwrite, Docker, or a user account (local runtime).

**Related tickets:** T37 (format + schema), T38 (LocalBackend repositories),
T39 (asset files), T40 (cloud sync).

## Folder layout

```text
My_Movie.scriptony/
├── scriptony.json       # Manifest (metadata, sync flags)
├── database.sqlite      # Structured project data (schema v1)
├── assets/
│   ├── images/
│   ├── audio/
│   ├── video/
│   └── documents/
├── exports/
└── cache/
```

## `scriptony.json` manifest

| Field | Type | Description |
|-------|------|-------------|
| `format` | `"scriptony-project"` | Magic identifier |
| `version` | number | Manifest schema version (currently `1`) |
| `projectId` | string | Local ID, prefix `local_` |
| `title` | string | Display name |
| `description` | string? | Optional |
| `storageMode` | `"local"` \| `"cloud"` \| `"hybrid"` | Default `local` |
| `createdAt` / `updatedAt` | ISO string | Timestamps |
| `sync` | object | `enabled`, optional `provider`, `cloudProjectId`, `lastSyncedAt` |

Example:

```json
{
  "format": "scriptony-project",
  "version": 1,
  "projectId": "local_abc123",
  "title": "My Movie",
  "storageMode": "local",
  "createdAt": "2026-05-24T12:00:00.000Z",
  "updatedAt": "2026-05-24T12:00:00.000Z",
  "sync": { "enabled": false }
}
```

## `database.sqlite`

- Schema version: **1** (stored in `schema_meta` table).
- Core tables: `projects`, `project_nodes`, `script_blocks`, `characters`,
  `world_items`, `scene_audio_tracks`, `audio_clips`, `assets`, `jobs`,
  `change_log`.
- Audio/timeline columns match T31/T32 (lane, waveform, FX, mix controls).
- `change_log` is reserved for future per-project sync (T40).

DDL source: [`src/local/project-schema.ts`](../src/local/project-schema.ts).

## Creating and opening projects (API)

Desktop only (`npm run dev:desktop`). TypeScript API: [`src/local/`](../src/local/).

```ts
import { createProjectFolder, openProjectFolder } from "@/local";

const { dirPath, manifest } = await createProjectFolder({
  parentDir: "/Users/me/Documents",
  title: "My Movie",
});
```

- **Collision:** If `My_Movie.scriptony` exists with a valid manifest, creation
  fails (no overwrite). Otherwise suffix `_2`, `_3`, … is used.
- **Moved projects:** Re-open via folder path (Tauri file dialog in a later ticket).

## LocalBackend (T38/T39)

- [`LocalProjectContext`](../src/backend/local/LocalProjectContext.ts) opens `database.sqlite` and keeps `scriptony.json` in sync.
- Repositories: projects, structure (`project_nodes`), scripts (`script_blocks`), assets (`assets` table + files under `assets/`).
- Asset bytes: [`LocalStorageService`](../src/backend/local/LocalStorageService.ts) copies into `assets/images|audio|video|documents`; metadata stores **relative** paths only.
- Desktop asset URLs: Tauri `convertFileSrc` on absolute path inside the `.scriptony` folder.

## Cloud Sync (T40)

Manifest `sync` fields: `enabled`, `syncStatus` (`disabled` | `pendingActivation` | `active` | `error`), `cloudProjectId`, `lastSyncedAt`, `lastError`. Activation via [`CloudActivationService`](../src/backend/sync/CloudActivationService.ts) — initial snapshot uploads structure nodes and image assets to Scriptony Cloud; project stays local.

## Storage provider registry

Cloud storage settings UI uses [`src/lib/storage-provider/`](../src/lib/storage-provider/) — not duplicated. Local project assets do not use that registry for bytes (project folder only).

## Edge cases

| Case | Behavior |
|------|----------|
| Folder exists with valid manifest | Error — open existing project instead |
| Folder exists without manifest | Try suffixed name (`_2`, `_3`, …) |
| Missing `database.sqlite` | `openProjectFolder` / validation error |
| Missing asset file | Metadata may reference path; UI marks missing (T39) |
| Cloud fields empty | Allowed (`cloud_audio_file_id`, sync fields nullable) |
