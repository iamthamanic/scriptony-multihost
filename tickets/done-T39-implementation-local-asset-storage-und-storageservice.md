# Scriptony Architecture Refactor Ticket T39 — Local Asset Storage und StorageService

Stand: 2026-05-23

## Ziel

Assets werden im Local Mode im Projektordner gespeichert, waehrend Cloud Mode weiter Appwrite Storage bzw. scriptony-storage nutzt.

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

T38 macht lokale Core-Daten nutzbar. Fuer eine echte lokale Creator-App muessen Assets ebenfalls lokal liegen: Bilder, Audio, Video, Dokumente, Exports und spaeter Blender-relevante Dateien.

## Problem

Appwrite Storage ist fuer Cloud korrekt, aber Local Mode braucht lokale Dateien. Assets duerfen nicht doppelt ueber verschiedene Wege hochgeladen oder gespeichert werden.

**Bestehende Basis:** `src/lib/storage-provider/types.ts`, `registry.ts` — **nicht** zweite Storage-Welt bauen. T39 integriert Domain-`StorageService` / `AssetRepository` mit dieser Registry bzw. kapselt sie unter `src/backend/`.

Cloud: fachliche Asset-Metadaten weiter ueber Domain-Repositories; physische Ablage ueber Appwrite / `scriptony-storage` wie bisher.

## Loesung

Ein gemeinsames `StorageService` und `AssetRepository` verwenden.

Local Mode:

```text
My Movie.scriptony/assets/
├── images/
├── audio/
├── video/
└── documents/
```

Cloud Mode:

```text
Appwrite Storage / scriptony-storage
```

Implementierungen (Domain-Layer unter Backend; Registry bleibt fuer Einstellungen → Speicher):

```text
src/backend/local/
├── LocalAssetRepository.ts
└── LocalStorageService.ts      # nutzt Tauri FS / Projektordner assets/

src/backend/appwrite/
├── AppwriteAssetRepository.ts
└── AppwriteStorageService.ts   # wrappt bestehende API + storage-provider wo passend

src/lib/storage-provider/       # bestehend — erweitern, nicht ersetzen
```

## User Journey

### Local Asset Import

1. User oeffnet lokales Projekt.
2. Klickt `Asset importieren`.
3. Waehlt Datei.
4. Scriptony kopiert Datei in `assets/<type>/`.
5. SQLite speichert Asset-Metadaten und relativen Pfad.
6. UI zeigt Asset sofort an.
7. Kein Cloud Upload findet statt.

### Cloud Asset Import

1. User oeffnet Cloud-Projekt.
2. Importiert Datei.
3. Bestehender Appwrite/scriptony-storage Pfad wird verwendet.
4. UI-Verhalten bleibt gleich.

## Architektur

```text
UI
  ↓
backend.assets.importAsset()
  ↓
LocalAssetRepository / AppwriteAssetRepository
  ↓
LocalStorageService / AppwriteStorageService
  ↓
Project assets folder / Appwrite Storage
```

Asset-Metadaten und Datei-Bytes bleiben getrennt.

## Beispiele

### Domain Shape

```ts
export interface Asset {
  id: string;
  projectId: string;
  type: "image" | "audio" | "video" | "document" | "other";
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  storage: AssetStorageRef;
  createdAt: string;
  updatedAt: string;
}

export type AssetStorageRef =
  | { mode: "local"; relativePath: string }
  | { mode: "appwrite"; bucketId: string; fileId: string }
  | { mode: "external"; url: string };
```

### Local Import

```ts
export class LocalAssetRepository implements AssetRepository {
  async importAsset(input: ImportAssetInput): Promise<Asset> {
    const copied = await this.storage.copyIntoProjectAssets(input.filePath, input.type);

    const asset = createAssetDomainObject({
      projectId: input.projectId,
      type: input.type,
      filename: copied.filename,
      storage: { mode: "local", relativePath: copied.relativePath },
    });

    await this.db.insertAsset(asset);
    await this.db.insertChange({
      entityType: "asset",
      entityId: asset.id,
      operation: "create",
      payload: asset,
    });

    return asset;
  }
}
```

## Edge Cases

1. **Dateiname existiert bereits**: Eindeutigen Dateinamen erzeugen, Originalnamen in Metadaten behalten.
2. **Datei ausserhalb Projektordner wird geloescht**: Import muss kopieren, nicht nur referenzieren.
3. **Sehr grosse Dateien**: Progress/Fehlerzustand vorbereiten; kein UI-Freeze.
4. **Cloud-synced Projekt**: Datei lokal speichern und spaeter separat uploaden; in diesem Ticket noch kein Sync erforderlich.
5. **Fehlende lokale Datei**: Asset in UI als missing markieren, nicht crashen.

## Akzeptanzkriterien

- [x] `AssetStorageRef` unterscheidet local/appwrite/external.
- [x] Keine duplizierte Storage-Registry; Anbindung an `src/lib/storage-provider/` dokumentiert oder implementiert.
- [x] `LocalStorageService` kann Dateien in Projektordner kopieren.
- [x] `LocalAssetRepository.importAsset()` speichert Metadaten in SQLite.
- [x] Asset-Dateien werden nach Typ in `assets/` abgelegt.
- [x] Relative Pfade werden gespeichert, keine absoluten Pfade als Source of Truth.
- [x] Cloud Asset Import bleibt unveraendert.
- [x] Kein Upload findet im Local-only Projekt statt.
- [x] Mutierende Asset-Operationen schreiben `change_log`.
- [x] `npm run typecheck` laeuft durch.
- [ ] Shimwrappercheck laeuft durch (snippet scope empfohlen).

## SOLID / DRY / KISS

- **SRP**: AssetRepository verwaltet Metadaten; StorageService verwaltet Bytes.
- **OCP**: Neue Storage-Modi koennen ueber `AssetStorageRef` ergaenzt werden.
- **LSP**: Local und Appwrite Storage liefern dieselben Domain-Assets.
- **ISP**: Asset-API bleibt klein: import, list, get, delete, resolveUrl.
- **DIP**: UI kennt keine Buckets oder Dateipfade direkt.
- **DRY**: Keine parallele Upload-Logik ausserhalb der Storage-Abstraktion.
- **KISS**: Lokaler Projektordner statt lokaler Storage-Server.
