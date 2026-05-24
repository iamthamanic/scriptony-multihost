# Scriptony Architecture Refactor Ticket T40 — Cloud Sync pro Projekt aktivieren

Stand: 2026-05-23

## Ziel

Ein lokales Projekt kann explizit mit **Scriptony Cloud** verbunden werden. Login wird erst bei dieser Aktion notwendig; das Projekt bleibt lokal vorhanden und bekommt eine Cloud-Kopie.

**Abhaengigkeit:** T37–T39 (lokales Format + Daten + Assets). **Unabhaengig von T41** (Self-hosted ist separater Team-Pfad). Reihenfolge in README: T41 kann vor T40 liegen.

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

Nach T37-T39 existieren lokale Projekte mit lokalen Daten und Assets. Jetzt muss Cloud optional pro Projekt aktivierbar werden. Cloud ist nicht global fuer alle Projekte, sondern eine Eigenschaft einzelner Projekte.

## Problem

Wenn Cloud als globaler App-Modus gedacht wird, verlieren User Kontrolle darueber, welche Projekte lokal bleiben. Das widerspricht dem Produktziel: Solo-Creator sollen unabhaengig lokal arbeiten; Cloud ist fuer Backup, Multi-Device, Team und Collaboration.

## Loesung

Projektweise Cloud-Aktivierung einfuehren:

```text
Local-only Project
  ↓ user action: Cloud Sync aktivieren
Cloud-synced Project
```

Ablauf:

1. User klickt `Cloud Sync aktivieren`.
2. Falls nicht eingeloggt: Appwrite Login anzeigen.
3. Cloud-Projekt in Appwrite erstellen.
4. Lokale Projektdaten initial hochladen.
5. Lokales `scriptony.json` bekommt `cloudProjectId`.
6. Projekt bleibt lokal vorhanden.

In diesem Ticket: Initialer Upload/Link. Kein perfekter bidirektionaler Echtzeit-Sync.

## User Journey

1. User arbeitet lokal an `My Movie.scriptony`.
2. User moechte Backup oder Teamzugriff.
3. Klickt `Cloud Sync aktivieren`.
4. Scriptony erklaert: Projekt bleibt lokal, eine Cloud-Kopie wird erstellt.
5. User loggt sich ein.
6. Upload startet.
7. Nach Erfolg steht im Projektstatus: `Cloud Sync aktiv`.
8. Projekt erscheint in Web/Cloud-Projektliste.

## Architektur

```text
Local Project
  ↓
CloudActivationService
  ↓
AppwriteBackend
  ├── create cloud project
  ├── upload domain entities
  ├── upload/copy assets
  └── persist cloudProjectId locally
```

Lokale Projektdatei danach:

```json
{
  "sync": {
    "enabled": true,
    "provider": "scriptony-cloud",
    "cloudProjectId": "cloud_proj_789",
    "lastSyncedAt": "2026-05-23T12:00:00.000Z"
  }
}
```

## Beispiele

### Cloud Activation Service

```ts
export class CloudActivationService {
  async activateCloudSync(projectPath: string): Promise<ProjectSyncState> {
    const localProject = await this.localProjects.open(projectPath);
    const user = await this.auth.getCurrentUser();

    if (!user || user.mode === "local") {
      throw new CloudLoginRequiredError();
    }

    const cloudProject = await this.appwrite.projects.createProject({
      title: localProject.title,
      source: "local-import",
    });

    await this.uploadInitialSnapshot(localProject.id, cloudProject.id);
    await this.localProjects.updateSyncState(localProject.id, {
      enabled: true,
      provider: "scriptony-cloud",
      cloudProjectId: cloudProject.id,
      lastSyncedAt: new Date().toISOString(),
    });

    return this.localProjects.getSyncState(localProject.id);
  }
}
```

## Edge Cases

1. **User bricht Login ab**: Lokales Projekt bleibt unveraendert.
2. **Upload bricht mittendrin ab**: Sync-State bleibt `error` oder `pendingActivation`; kein falsches `enabled: true`.
3. **Cloud-Projekt existiert schon**: Doppelte Aktivierung verhindern.
4. **Assets sehr gross**: Upload-Fortschritt und Retry vorbereiten.
5. **User will Cloud wieder deaktivieren**: In diesem Ticket nur Status/Entkopplung dokumentieren, vollstaendige Loeschlogik spaeter.

## Akzeptanzkriterien

- [ ] Lokales Projekt hat `sync.enabled = false` als Default.
- [ ] UI-Aktion `Cloud Sync aktivieren` existiert fuer Local Projects.
- [ ] Login wird erst bei Cloud-Aktivierung verlangt.
- [ ] Cloud-Projekt wird ueber AppwriteBackend erstellt.
- [ ] Initialer Daten-Snapshot wird hochgeladen **oder** als explizites Follow-up (`todo-T40b-…`) mit klarer UI-Sperre bis Snapshot fertig ist — kein halbfertiger „Sync aktiv“-Status.
- [ ] `cloudProjectId` wird lokal in `scriptony.json` gespeichert.
- [ ] Lokales Projekt bleibt nach Aktivierung lokal oeffenbar.
- [ ] Fehlerhafte Aktivierung hinterlaesst keinen falschen Sync-Erfolg.
- [ ] Web/Cloud kann aktiviertes Projekt sehen, sofern Snapshot implementiert ist.
- [ ] `npm run typecheck` laeuft durch.
- [ ] Shimwrappercheck laeuft durch.

## SOLID / DRY / KISS

- **SRP**: CloudActivationService macht nur Aktivierung/Initial-Linking.
- **OCP**: Andere Provider koennen spaeter ueber denselben Prozess ergaenzt werden.
- **LSP**: Appwrite Cloud und Self-hosted koennen spaeter denselben Sync-State verwenden.
- **ISP**: Kein Full-Sync-Interface in diesem Ticket.
- **DIP**: Activation-Service haengt an Backend-Interfaces, nicht an Appwrite SDK direkt.
- **DRY**: Bestehende AppwriteBackend-Operationen wiederverwenden.
- **KISS**: Erst Initial Upload/Link, kein CRDT/Realtime-Sync.
