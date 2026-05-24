# Scriptony Architecture Refactor Ticket T38 — LocalBackend MVP fuer Core Domains

Stand: 2026-05-23

## Ziel

Der Local Mode wird fuer Solo-Creator nutzbar. Domains laufen lokal ueber SQLite im `.scriptony`-Projektordner (T37).

## Phasen (Scope)

### Must-have (Ticket-Abschluss erforderlich)

- `projects`
- `structure`
- `scripts`

### Nice-to-have (same ticket, wenn Zeit — sonst Follow-up T38b)

- `characters`
- `worldbuilding`
- `timeline`
- `audio` (Lesen/Schreiben Basis; volle T31/T32-Paritaet nicht erforderlich)
- `jobs` (nur Queue-Persistenz; Ausfuehrung → T43 Sidecar)

Wenn Nice-to-have nicht fertig wird: Stub mit klarer Fehlermeldung, **kein** stiller Appwrite-Fallback.

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

T37 hat das lokale Projektformat und SQLite-Schema definiert. Jetzt muss der LocalBackend-MVP die wichtigsten Solo-Creator-Funktionen implementieren. Ziel ist nicht komplette Paritaet mit Cloud/Appwrite, sondern ein nutzbarer lokaler Kern.

## Problem

Local Mode darf nicht nur eine Shell mit Stubs bleiben. Gleichzeitig waere es falsch, alle 30+ Appwrite Functions lokal zu portieren. Der MVP muss die Domains abdecken, die ein Solo-Creator zum Schreiben und Strukturieren braucht.

## Loesung

Implementiere Local-Repositories fuer:

```text
projects
structure
scripts
characters
worldbuilding
timeline
audio
jobs basic
```

Nicht enthalten:

```text
collaboration
organizations
invites
admin
observability
full sync
full AI orchestration
```

Neue Implementierungen:

```text
src/backend/local/
├── LocalProjectRepository.ts
├── LocalStructureRepository.ts
├── LocalScriptRepository.ts
├── LocalCharacterRepository.ts
├── LocalWorldbuildingRepository.ts
├── LocalTimelineRepository.ts
├── LocalAudioRepository.ts
└── LocalJobService.ts
```

## User Journey

1. User oeffnet lokales Projekt.
2. Erstellt Struktur/Acts/Scenes/Nodes.
3. Schreibt Script Blocks.
4. Erstellt Characters und Worldbuilding-Eintraege.
5. Erstellt/veraendert Audio-Clips lokal.
6. Timeline liest lokale Daten aus SQLite.
7. Alles funktioniert ohne Konto und ohne Appwrite.

## Architektur

```text
React UI / Hooks
  ↓
ScriptonyBackend
  ↓
LocalBackend
  ↓
Local Repositories
  ↓
SQLite database.sqlite
```

Jede Repository-Methode schreibt bei mutierenden Operationen einen Eintrag in `change_log`, auch wenn Sync erst spaeter implementiert wird.

## Beispiele

### Local Script Repository

```ts
export class LocalScriptRepository implements ScriptRepository {
  constructor(private readonly db: LocalDb) {}

  async listBlocks(projectId: string): Promise<ScriptBlock[]> {
    const rows = await this.db.all(
      "SELECT * FROM script_blocks WHERE project_id = ? AND deleted_at IS NULL ORDER BY position ASC",
      [projectId],
    );

    return rows.map(mapScriptBlockRowToDomain);
  }

  async updateBlock(blockId: string, input: UpdateScriptBlockInput): Promise<ScriptBlock> {
    const now = new Date().toISOString();

    await this.db.run(
      "UPDATE script_blocks SET content = ?, updated_at = ?, version = version + 1, sync_status = 'pending' WHERE id = ?",
      [input.content, now, blockId],
    );

    await this.db.insertChange({
      entityType: "script_block",
      entityId: blockId,
      operation: "update",
      payload: input,
    });

    const updated = await this.getBlock(blockId);
    if (!updated) throw new Error("Script block not found after update");
    return updated;
  }
}
```

### Basic Local Job

```ts
export class LocalJobService implements JobService {
  async createJob(input: CreateJobInput): Promise<Job> {
    // MVP: persist queued job locally. Execution → T43 (Local Functions Sidecar).
  }
}
```

## Edge Cases

1. **Deleted Entities**: Keine harten Deletes fuer sync-relevante Entities; `deleted_at` setzen.
2. **Positionskonflikte**: Reorder-Operationen muessen atomar laufen.
3. **Audio Ripple lokal**: Ripple-Berechnung muss dieselbe Domain-Logik wie Cloud verwenden.
4. **Ungültige Daten aus alter DB-Version**: Mapper validieren Domain-Shapes und geben klare Fehler.
5. **Sync Status vorhanden, aber Sync nicht aktiv**: `pending` ist erlaubt, aber wird noch nicht hochgeladen.

## Akzeptanzkriterien

### Must-have

- [ ] Local Projects koennen gelesen/erstellt/aktualisiert werden.
- [ ] Local Structure Nodes koennen gelesen/erstellt/aktualisiert/geloescht/reordered werden.
- [ ] Local Script Blocks koennen gelesen/erstellt/aktualisiert/geloescht/reordered werden.
- [ ] Mutierende Operationen schreiben `change_log` Eintraege.
- [ ] Soft Delete wird fuer sync-relevante Entities verwendet.
- [ ] UI nutzt `useScriptonyBackend()`, keine direkte SQLite-Nutzung.
- [ ] Cloud/Appwrite-Verhalten bleibt unveraendert.

### Nice-to-have

- [ ] Characters und Worldbuilding funktionieren lokal.
- [ ] Timeline/Audio-Clips koennen lokal gelesen und aktualisiert werden.
- [ ] `LocalJobService` persistiert Jobs; Ausfuehrung explizit out of scope (T43).

### Allgemein

- [ ] `npm run typecheck` laeuft durch.
- [ ] Shimwrappercheck laeuft durch.

## SOLID / DRY / KISS

- **SRP**: Jede Domain hat ihr eigenes Repository.
- **OCP**: Weitere Local-Repositories koennen spaeter ergaenzt werden.
- **LSP**: Local-Repositories ersetzen Appwrite-Repositories hinter demselben Interface.
- **ISP**: Keine generische Mega-DB-Klasse als Public API.
- **DIP**: UI/Domain haengt nicht an SQLite.
- **DRY**: Domain-Mapper und Validierung wiederverwenden.
- **KISS**: Nur Core Domains, keine Collaboration/Sync in diesem Ticket.
