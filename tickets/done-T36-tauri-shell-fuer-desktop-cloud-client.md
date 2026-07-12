# Scriptony Architecture Refactor Ticket T36 — Tauri Shell fuer Desktop (Phase 1: Cloud Client)

Stand: 2026-05-23

## Ziel

Scriptony wird als Desktop-App startbar, ohne bereits LocalBackend, SQLite oder Sidecar einzufuehren. **Phase 1:** Desktop nutzt weiterhin den bestehenden Appwrite Cloud-/Self-hosted-Backendpfad. **Local Mode produktiv** folgt in T37/T38 — Tauri erzwingt bis dahin kein `local`-Profil als Default fuer Cloud-Nutzer.

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

Nach T34 und T35 existieren Runtime- und Backend-Grenzen. Jetzt kann Tauri als Desktop-Huelle eingefuehrt werden, ohne Appwrite-Logik in Rust oder Tauri Commands zu verschieben. Ziel ist ein kleiner, kontrollierter Schritt: Scriptony startet als native Desktop-App, nutzt aber weiterhin den Cloud/Appwrite-Pfad.

## Problem

Wenn Tauri zu frueh mit LocalBackend, SQLite, Sidecar, Blender und Auto-Updater vermischt wird, entsteht eine schwer testbare Grossbaustelle. Der erste Desktop-Schritt muss nur beweisen: React/Vite laeuft stabil in Tauri.

## Loesung

Tauri als Shell hinzufuegen:

```text
src-tauri/
├── Cargo.toml
├── tauri.conf.json
└── src/
    └── main.rs
```

Neue Scripts:

```json
{
  "scripts": {
    "dev:web": "vite",
    "dev:desktop": "tauri dev",
    "build:web": "vite build",
    "build:desktop": "tauri build"
  }
}
```

In diesem Ticket explizit nicht enthalten:

- kein SQLite
- kein LocalBackend MVP
- kein Sidecar
- kein Blender
- kein Auto-Updater als Pflicht
- keine Offline-Garantie

## User Journey

### Desktop Cloud User

1. User startet Scriptony Desktop.
2. Desktop-App oeffnet dieselbe React/Vite UI.
3. User meldet sich mit bestehendem Cloud-Konto an.
4. Cloud-Projekte funktionieren wie im Browser.
5. Local Mode ist noch nicht produktiv nutzbar, kann aber als Runtime-Profil intern erkannt werden.

### Developer

1. Entwickler startet `npm run dev:desktop`.
2. Tauri oeffnet die App.
3. App nutzt `RuntimeProfile` und `ScriptonyBackend` aus T34/T35.
4. Cloud-Funktionalitaet bleibt Regressionstest.

## Architektur

```text
Tauri Desktop
  └── WebView
        └── React/Vite App
              └── ScriptonyBackend
                    └── AppwriteBackend
```

Noch kein lokaler Persistenzpfad:

```text
LocalBackend = Stub
SQLite = nicht aktiv
Tauri Commands = nur minimal/shell
```

## Beispiele

### Tauri-Konfiguration grob

```json
{
  "build": {
    "beforeDevCommand": "npm run dev:vite",
    "beforeBuildCommand": "npm run build:web",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Scriptony",
        "width": 1440,
        "height": 960,
        "resizable": true
      }
    ]
  }
}
```

### Runtime Detection fuer Desktop

```ts
export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
```

## Edge Cases

1. **Cloud Login OAuth Redirect im Tauri-Fenster**: Siehe **T36b** (Deep-Link / OAuth Callback). In T36: Email/Password testen; OAuth Known Risk dokumentieren falls T36b noch offen.
2. **Browser APIs fehlen/anders in WebView**: Smoke-Test fuer Auth, Editor, Timeline, Audio UI.
3. **CSP/Asset Loading**: Lokale Build-Pfade und Appwrite-Assets muessen korrekt laden.
4. **Mac/Windows/Linux Unterschiede**: In diesem Ticket mindestens ein primaeres Dev-OS testen, weitere OS als Known Risk dokumentieren.
5. **Runtime default falsch**: Bis T38 fertig: Desktop-Dev nutzt **`cloud`** oder explizites Env; Auto-`local` nur wenn LocalBackend verfuegbar (siehe `detect-runtime.ts`).

## Akzeptanzkriterien

- [ ] `src-tauri/` existiert.
- [ ] `npm run dev:desktop` startet Scriptony.
- [ ] `npm run build:desktop` erzeugt einen Desktop-Build oder dokumentierten Build-Stand.
- [ ] Bestehender Cloud Login funktioniert im Desktop-Dev-Modus oder Known Risk ist dokumentiert.
- [ ] Bestehende Cloud-Projekte koennen im Desktop-Dev-Modus geoeffnet werden.
- [ ] Keine lokale Persistenz wird in diesem Ticket eingefuehrt.
- [ ] Keine Appwrite-Function wird lokal portiert.
- [ ] `RuntimeProfile` erkennt Desktop-Kontext ohne UI-Hacks.
- [ ] `npm run typecheck` laeuft durch.
- [ ] Shimwrappercheck laeuft durch.

## SOLID / DRY / KISS

- **SRP**: Tauri ist nur Shell; Backend bleibt Backend.
- **OCP**: Spaetere Commands/Plugins koennen ergaenzt werden, ohne Cloud-Flow zu brechen.
- **LSP**: Desktop nutzt dieselben Backend-Interfaces wie Web.
- **ISP**: Keine Tauri-spezifischen APIs in Domain-Interfaces.
- **DIP**: React-App haengt nicht direkt an Tauri.
- **DRY**: Dieselbe React/Vite UI wird fuer Web und Desktop verwendet.
- **KISS**: Erst Desktop-Huelle, dann lokale Persistenz in spaeteren Tickets.
