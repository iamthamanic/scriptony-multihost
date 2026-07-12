# Scriptony Architecture Refactor Ticket T37 — Local Project Format und SQLite Schema

Stand: 2026-05-23

## Ziel

Scriptony definiert das lokale Projektformat fuer Solo-Creator: ein `.scriptony` Projektordner mit `scriptony.json`, `database.sqlite`, Assets, Exports und Cache.

## Arbeitsregeln

- Keine Breaking Changes ohne Compatibility Wrapper oder dokumentierte Migration.
- Neue Runtime-/Backend-Logik darf nicht direkt in UI-Komponenten landen.
- UI-Komponenten duerfen keine Appwrite-, SQLite-, Tauri- oder Self-hosted-Details kennen.
- Neue Fachlogik muss ueber Domain-Services, Repositories oder klar benannte Adapter laufen.
- Cloud/Appwrite bleibt fuer bestehende Web-/Team-Features voll funktionsfaehig.
- Local Mode darf keinen Login, keinen Appwrite-Server und keinen Docker-Stack voraussetzen.
- Self-hosted Mode darf erst greifen, wenn ein User explizit einen eigenen Endpoint verbindet.
- Jeder Schritt muss Feature-Flag-/Runtime-sicher sein: Cloud-Verhalten darf durch Local-Vorbereitung nicht regressieren.
- Alle Aenderungen muessen zum bestehenden UI/UX-System passen.

## Pflicht-Checks

Standard-Gate fuer normale Tickets:

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks
```

Frontend-only Gate, wenn sicher keine Functions/Appwrite-Konfiguration betroffen sind:

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --frontend
```

Backend-only Gate, wenn sicher kein Frontend/UI betroffen ist:

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --backend
```

Beim Abschluss muss ein Done Report in `docs/scriptony-architecture-refactor 25.04.26.md` ergaenzt werden.

---
## Kontext

Nach T36 existiert eine Desktop-Shell. Der naechste Local-first Schritt ist nicht sofort komplette Offline-Funktionalitaet, sondern das stabile lokale Projektformat. Scriptony braucht fuer Solo-Creator ein Format, das ohne Server funktioniert und spaeter mit Cloud/Self-hosted synchronisiert werden kann.

## Problem

Appwrite Collections sind fuer Cloud sinnvoll, aber kein lokales Projektformat. Ohne lokales Format entstehen spaeter unklare Speicherorte, schwer migrierbare Daten und schlechte Blender-/Asset-Integration.

Das lokale Format muss T31/T32 beruecksichtigen: Audio-Clips haben echte Dauer, Waveform, Lane-Daten, Mix-Controls und FX-Metadaten.

## Loesung

Ein lokaler Projektordner wird Standard fuer Local Mode:

```text
My Movie.scriptony/
├── scriptony.json
├── database.sqlite
├── assets/
│   ├── images/
│   ├── audio/
│   ├── video/
│   └── documents/
├── exports/
└── cache/
```

`scriptony.json` enthaelt Projekt- und Sync-Metadaten:

```json
{
  "format": "scriptony-project",
  "version": 1,
  "projectId": "local_proj_123",
  "title": "My Movie",
  "storageMode": "local",
  "sync": {
    "enabled": false
  }
}
```

SQLite speichert strukturierte Daten:

- projects
- project_nodes
- script_blocks
- characters
- world_items
- scene_audio_tracks
- audio_clips
- assets
- jobs
- change_log

## User Journey

1. User startet Desktop-App.
2. Klickt `Neues lokales Projekt`.
3. Waehlt Speicherort.
4. Scriptony erstellt `My Movie.scriptony/`.
5. Scriptony erzeugt `scriptony.json`, `database.sqlite` und Ordnerstruktur.
6. Projekt oeffnet ohne Login.
7. Noch nicht alle Editor-Funktionen muessen lokal implementiert sein; das Format existiert stabil.

## Architektur

```text
Tauri Desktop
  ↓
Local Project Service
  ↓
Project Folder
  ├── scriptony.json
  ├── database.sqlite
  └── assets/
```

SQLite wird nicht als Cloud-Ersatz verstanden, sondern als lokaler Speicheradapter fuer dasselbe Scriptony-Domainmodell.

## Beispiele

### Minimal Schema

```sql
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'local'
);

CREATE TABLE IF NOT EXISTS audio_clips (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  track_id TEXT,
  type TEXT NOT NULL,
  text TEXT,
  local_audio_path TEXT,
  cloud_audio_file_id TEXT,
  start_sec REAL NOT NULL,
  end_sec REAL NOT NULL,
  duration_sec REAL,
  waveform_json TEXT,
  lane_index INTEGER NOT NULL DEFAULT 0,
  fx_preset_id TEXT,
  volume REAL NOT NULL DEFAULT 1.0,
  pan REAL NOT NULL DEFAULT 0.0,
  mute INTEGER NOT NULL DEFAULT 0,
  solo INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'local',
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS change_log (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  device_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  synced_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

### Sync-Metadaten spaeter

```json
{
  "sync": {
    "enabled": true,
    "provider": "scriptony-cloud",
    "cloudProjectId": "cloud_proj_789",
    "lastSyncedAt": null
  }
}
```

## Edge Cases

1. **Projektordner existiert bereits**: Keine Dateien ueberschreiben; eindeutigen Ordnernamen vorschlagen.
2. **SQLite Migration schlaegt fehl**: Projekt nicht als geoeffnet markieren; Fehler sichtbar machen.
3. **User verschiebt Projektordner**: Projekt muss ueber Datei-/Ordnerauswahl (Tauri `dialog` / native picker) erneut oeffenbar sein; Pfade plattformneutral halten (Win/macOS/Linux).
4. **Assets fehlen im Ordner**: Asset-Metadaten duerfen nicht crashen; fehlende Datei markieren.
5. **Cloud-Felder lokal leer**: `cloud_audio_file_id` und Sync-Felder duerfen null sein.

## Akzeptanzkriterien

- [x] Lokales Projektformat ist dokumentiert (`docs/LOCAL_PROJECT_FORMAT.md`).
- [x] `scriptony.json` Schema ist definiert (`src/local/project-manifest.ts`).
- [x] SQLite Initialschema fuer Kernentitaeten existiert (`SCHEMA_STATEMENTS`, `database.sqlite` via `createProjectDatabase`).
- [x] Audio-/Timeline-Felder aus T31/T32 sind im Schema beruecksichtigt.
- [x] `change_log` ist fuer spaeteren Sync vorgesehen.
- [x] Projektordnerstruktur wird angelegt (`createProjectFolder`).
- [x] Keine Cloud-Verbindung ist fuer Projekterstellung notwendig.
- [x] Noch nicht implementierte Local-Repositories sind klar als spaetere Arbeit markiert (T38).
- [x] `npm run typecheck` laeuft durch.
- [x] Shimwrappercheck laeuft durch (snippet, `src/local/**`).

## SOLID / DRY / KISS

- **SRP**: Projektformat-Service legt Projekte an; Repositories schreiben Daten; Asset-Service verwaltet Dateien.
- **OCP**: Neue Tabellen/Migrations koennen ergaenzt werden, ohne Projektformat zu brechen.
- **LSP**: Local Daten koennen spaeter ueber dieselben Domain-Interfaces gelesen werden.
- **ISP**: SQLite-Migrationen sind getrennt von UI und Sync.
- **DIP**: Domain kennt SQLite nicht direkt.
- **DRY**: Ein Projektformat fuer Local, Blender und spaeteren Sync.
- **KISS**: Ordner + SQLite-Datei statt lokalem Postgres/Appwrite/Docker.
