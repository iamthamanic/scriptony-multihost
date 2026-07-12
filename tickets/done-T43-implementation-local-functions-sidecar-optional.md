# Scriptony Architecture Refactor Ticket T43 — Local Functions Sidecar (optional)

**Status:** done (2026-05-24) — ARCH-REF-T43-DONE

Stand: 2026-05-23

## Ziel

Im **Local Mode** koennen schwere Features (TTS, Media-Jobs, AI-Orchestrierung) **ohne Appwrite** laufen, indem bestehende **`functions/`** Hono-Handler als **lokaler Sidecar** auf `127.0.0.1` gestartet werden — statt alles in SQLite/Repositories zu portieren.

## Abhaengigkeit

- **T38** (LocalBackend MVP — CRUD-Kern)
- **T35** (`api-gateway` Umschaltung der `functionsBaseUrl` bei `runtime.profile === "local"`)

Optional — nicht blockierend fuer Local-Schreiben/Strukturieren.

## Problem

T31/T32 und Jobs/AI nutzen Appwrite Functions. Vollstaendige Portierung nach SQLite waere DRY-Verletzung und hoher Aufwand. Sidecar reuse ist KISS.

## Loesung

1. Sidecar-Prozess (Node, gebundelt via esbuild wie deploy) startet bei Tauri-App-Start oder on-demand.
2. `getBackendConfig()` / `api-gateway`: `functionsBaseUrl = http://127.0.0.1:<port>` im Local Mode.
3. Sidecar nutzt **lokale** SQLite/Projektordner-Adapter statt Appwrite SDK (schrittweise; MVP: subset routes).
4. Tauri: Sidecar-Lifecycle (start/stop/health) in Rust minimal halten.

Nicht in Scope: Cloud Functions aendern; Docker/Appwrite lokal erzwingen.

## MVP-Routen (Vorschlag)

- `scriptony-jobs` (queue read/update)
- `scriptony-audio-story` / TTS subset
- `scriptony-media-worker` dispatch stub

## Akzeptanzkriterien

- [ ] Sidecar startet lokal und antwortet auf Health-Check.
- [ ] Mindestens eine bestehende UI-Funktion (z. B. Job-Status) nutzt Sidecar statt Cloud im Local Mode.
- [ ] Kein stiller Fallback auf Cloud bei Sidecar-Ausfall — klare Fehlermeldung.
- [ ] Cloud Mode unveraendert.
- [ ] Functions-Build-Check (`SHIM_RUN_FUNCTIONS_BUILD=1`) bleibt gruen.

## SOLID / DRY / KISS

- **DRY:** Gleiche Hono-Routen/Services wie Cloud; andere Persistence-Injection.
- **OCP:** Weitere Routes im Sidecar ergaenzen ohne UI-Umbau.
