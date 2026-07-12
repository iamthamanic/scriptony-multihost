# Scriptony Architecture Refactor Ticket T42 — Blender Bridge Grundlage fuer Desktop

**Status:** done (2026-05-24) — ARCH-REF-T42-DONE

Stand: 2026-05-23

## Ziel

Scriptony bekommt eine Desktop-only BlenderService-Grenze, damit lokale oder cloud-synced Projekte spaeter Blender lokal verbinden koennen, ohne Web/Cloud-Clients zu belasten.

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

Blender laeuft lokal auf dem User-Geraet. Nach **T36** (Desktop-Shell) und **T37–T39** (lokale Projekte/Assets) braucht Scriptony eine klare **Desktop-only** `BlenderService`-Grenze. Web/Mobile: Export-only oder deaktiviert.

## Problem

Ohne eigene Blender-Grenze besteht die Gefahr, dass Blender-Logik in Timeline, Assets, Appwrite Functions oder UI-Komponenten landet. Web/Mobile koennen Blender nicht lokal steuern. Cloud kann hoechstens Exportdaten liefern, aber nicht Blender starten oder Add-ons installieren.

## Loesung

Ein `BlenderService` Interface einfuehren:

```ts
export interface BlenderService {
  isAvailable(): Promise<boolean>;
  getInstalledVersion(): Promise<string | null>;
  exportProject(input: ExportBlenderProjectInput): Promise<BlenderExportResult>;
  installAddon(input: InstallBlenderAddonInput): Promise<void>;
  connectLive(input: ConnectBlenderInput): Promise<BlenderConnection>;
  syncScene(input: SyncBlenderSceneInput): Promise<void>;
}
```

Implementierungen:

```text
src/backend/local/LocalBlenderService.ts
src/backend/appwrite/AppwriteBlenderService.ts
src-tauri/src/commands/blender.rs
```

Cloud/Web Verhalten:

- Export-Package moeglich
- Live Connection nicht moeglich
- klare Fehlermeldung: Desktop erforderlich

Desktop Verhalten:

- Blender suchen
- Version pruefen
- Export-Package schreiben
- Add-on Installation vorbereiten
- Live Bridge spaeter anschliessen

## User Journey

### Local Desktop Blender Export

1. User oeffnet lokales Projekt.
2. Klickt `Blender Export`.
3. Scriptony erzeugt Export-Package mit Szenen, Shots, Characters und Assets.
4. User importiert Package in Blender oder Scriptony startet spaeter den Import.

### Cloud Desktop Blender Export

1. User oeffnet cloud-synced Projekt in Desktop.
2. Desktop cached relevante Assets lokal.
3. Scriptony exportiert lokale Arbeitskopie fuer Blender.

### Web User

1. User oeffnet Cloud-Projekt im Browser.
2. Blender Live Connection ist deaktiviert.
3. Optional: Export ZIP herunterladen.

## Architektur

```text
Desktop
  ↓
ScriptonyBackend.blender
  ↓
LocalBlenderService
  ↓
Tauri Command / Sidecar
  ↓
Blender executable / Blender Add-on
```

Web/Cloud:

```text
Web UI
  ↓
AppwriteBlenderService
  ↓
Export Package only / Desktop-required errors
```

## Beispiele

### LocalBlenderService

```ts
export class LocalBlenderService implements BlenderService {
  async isAvailable(): Promise<boolean> {
    return invoke("blender_is_available");
  }

  async getInstalledVersion(): Promise<string | null> {
    return invoke("blender_get_version");
  }

  async exportProject(input: ExportBlenderProjectInput): Promise<BlenderExportResult> {
    return invoke("blender_export_project", { input });
  }

  async installAddon(input: InstallBlenderAddonInput): Promise<void> {
    return invoke("blender_install_addon", { input });
  }

  async connectLive(input: ConnectBlenderInput): Promise<BlenderConnection> {
    return invoke("blender_connect_live", { input });
  }

  async syncScene(input: SyncBlenderSceneInput): Promise<void> {
    return invoke("blender_sync_scene", { input });
  }
}
```

### Cloud Fallback

```ts
export class AppwriteBlenderService implements BlenderService {
  async isAvailable(): Promise<boolean> {
    return false;
  }

  async getInstalledVersion(): Promise<string | null> {
    return null;
  }

  async connectLive(): Promise<BlenderConnection> {
    throw new Error("Live Blender connection requires Scriptony Desktop.");
  }
}
```

## Edge Cases

1. **Blender nicht installiert**: UI zeigt Installationshinweis, kein Crash.
2. **Mehrere Blender-Versionen**: Version waehlen oder neueste kompatible Version verwenden.
3. **Cloud Asset noch nicht lokal gecached**: Export blockiert mit Download-Schritt oder fehlende Assets markieren.
4. **Web/Mobile versucht Live Connection**: Feature disabled, klare Erklaerung.
5. **Blender Add-on inkompatibel**: Version pruefen und Update anbieten.

## Akzeptanzkriterien

- [ ] `BlenderService` Interface existiert.
- [ ] `LocalBlenderService` existiert und nutzt Tauri invoke/Command-Stubs.
- [ ] `AppwriteBlenderService` existiert mit Desktop-required Fallbacks.
- [ ] Web/Mobile zeigen keine aktive Live-Blender-Connection.
- [ ] Desktop kann Blender-Verfuegbarkeit pruefen oder Command-Stubs bereitstellen.
- [ ] Export-Package-Struktur ist dokumentiert.
- [ ] Blender-Logik ist nicht in Timeline-/Asset-Komponenten dupliziert.
- [ ] Cloud/Appwrite Functions werden nicht fuer lokale Blender-Steuerung verwendet.
- [ ] `npm run typecheck` laeuft durch.
- [ ] Shimwrappercheck laeuft durch.

## SOLID / DRY / KISS

- **SRP**: BlenderService kapselt Blender-spezifische Operationen.
- **OCP**: Live Bridge kann spaeter ergaenzt werden, ohne Export-Flow umzubauen.
- **LSP**: AppwriteBlenderService und LocalBlenderService erfuellen dasselbe Interface.
- **ISP**: Blender-Funktionen bleiben getrennt von Asset-/Timeline-Repositories.
- **DIP**: UI haengt an BlenderService, nicht an Tauri oder Blender CLI.
- **DRY**: Eine Blender-Grenze fuer Local, Cloud-Fallback und spaetere Live Bridge.
- **KISS**: Erst Export/Detection, Live Bridge spaeter.
