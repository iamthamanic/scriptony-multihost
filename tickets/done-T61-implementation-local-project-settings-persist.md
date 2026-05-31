# T61 — Local project settings persist (done)

## Problem

In Tauri, saving project settings in `ProjectDetail` reset type to **film** and cleared logline, genre, narrative structure, etc.

## Root cause

- `projectsApi.update` local branch only mapped `title`, `description`, `projectType` — not `type` / `logline` / extended fields.
- Reload via `getAll()` returned slim legacy shape; `ProjectDetail` `useEffect` reset form from empty fields.
- `scriptony.json` was not updated on save.

## Solution

- `src/local/project-settings.ts` — `project-settings.json` per `.scriptony` folder for extended UI metadata.
- `projects-adapter` local `update`: SQLite + manifest + settings file + `persist()`.
- `getAll` / `getOne` / `create` merge settings into legacy project shape.

## Acceptance

- Desktop: edit project (book/audio/series), save, reload list — type and logline/genre/narrative fields remain.
