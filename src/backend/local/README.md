# `src/backend/local/`

SQLite **source of truth** for desktop local profile when a `.scriptony` project is open.

- [`LocalBackend.ts`](LocalBackend.ts) — facade over repositories
- [`LocalProjectContext.ts`](LocalProjectContext.ts) — opens `database.sqlite` + `scriptony.json`
- Repositories: structure, characters, beats, audio, worldbuilding, assets

UI must not import this folder directly — use [`lib/api/*`](../../lib/api/) facades or `useScriptonyBackend()`.

See [`docs/ARCHITECTURE_LOCAL_CLOUD.md`](../../docs/ARCHITECTURE_LOCAL_CLOUD.md).
