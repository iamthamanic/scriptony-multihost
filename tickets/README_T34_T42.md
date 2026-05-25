# Scriptony Local-first / Tauri Ticket Set T34–T43

## Leitentscheidung

Scriptony wird **local-first** für Solo-Creator, aber **Appwrite bleibt** Cloud-/Self-hosted-Backend für Sync, Collaboration, Teams und Web/Mobile.

- **Local Mode:** kein echter Account, kein Appwrite-Server, kein Docker-Stack.
- **Cloud / Self-hosted:** Login erst bei Cloud-Projekten, Sync, Collaboration oder expliziter Server-Verbindung.

## Reihenfolge (Pflichtpfad)

| # | Ticket | Kurz |
|---|--------|------|
| 1 | T34 | Runtime Profile + Auth Boundary (`AuthClient`, nicht neues Auth-Interface) |
| 2 | T35 | `ScriptonyBackend` + `AppwriteBackend` Wrapper + `BackendProvider` |
| 3 | T36 | ~~Tauri Shell~~ **done** (Cloud-Desktop; Local ab T37/T38) |
| 3b | T36b | ~~Tauri OAuth / Deep-Link~~ **done** |
| 4 | T37 | ~~`.scriptony` Projektformat + SQLite Schema~~ **done** |
| 5 | T38 | ~~LocalBackend MVP~~ **done** |
| 6 | T39 | ~~Local Assets~~ **done** |
| 7 | T41 | ~~Self-hosted Appwrite verbinden~~ **done** |
| 8 | T40 | ~~Cloud Sync pro Projekt~~ **done** |
| 9 | T42 | ~~Blender Bridge (Desktop-only)~~ **done** |
| opt | T43 | ~~Local Functions Sidecar~~ **done** *(jobs MVP)* |

**Hinweis T41 vor T40:** Studios mit eigenem Appwrite brauchen oft **keinen** Scriptony-Cloud-Sync zuerst. T41 und T40 sind voneinander unabhängig.

## Repo-Konventionen

- Ticket-Dateinamen: `{status}-T{NN}-{ziel}-{name}.md` (z. B. `todo-T35-implementation-…`)
- Keine Business-Logik in UI-Komponenten; Runtime/Backend nur über Provider/Hooks.
- Bestehende Module wiederverwenden:
  - Auth: `src/lib/auth/AuthClient.ts`, `AppwriteAuthAdapter`, `LocalAuthAdapter`, `getAuthClient.ts`
  - API: `src/lib/api/*`, `src/lib/api-gateway.ts`
  - Storage-Registry: `src/lib/storage-provider/`
- Vite Dev-Server: **Port 3000** (`vite.config.ts`), nicht 5173.

## T34 Implementierungsstand (Kurz)

Bereits im Repo (Stand Review):

- `src/runtime/` (`detect-runtime.ts`, `RuntimeProvider`, `useRuntime`)
- `LocalAuthAdapter`, `createAuthFactory`, `getAuthClient` mit Runtime-Auswahl

Offen / in T34 nachziehen: `useAuth` vollständig an Runtime koppeln, keine verstreute Detection in Komponenten, Done Report.

## Abhängigkeiten

```text
T34 → T35 → T36 → T36b (parallel zu T36 wenn OAuth blockiert)
T35 → T37 → T38 → T39
T38 → T43 (optional)
T35 + T37 → T40 | T41 (parallel)
T36 + T38/T39 → T42
```
