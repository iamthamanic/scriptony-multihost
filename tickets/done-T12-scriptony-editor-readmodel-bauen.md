# Scriptony Architecture Refactor Tickets

Stand: 2026-04-25

## Ziel

Diese Tickets stabilisieren die Appwrite Function-Architektur phasenweise. Das Ziel ist nicht, alle Functions sofort physisch umzubauen, sondern neue Arbeit ab sofort eindeutig nach Verantwortungsgrenzen zu sortieren und fehlende Kern-Domaenen zuerst zu bauen.

## Zielarchitektur

| Gruppe    | Functions                                                                                                                                                                                |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core      | `scriptony-auth`, `scriptony-projects`, `scriptony-structure`, `scriptony-script`, `scriptony-characters`, `scriptony-worldbuilding`, `scriptony-timeline`, `scriptony-editor-readmodel` |
| Media     | `scriptony-assets`, `scriptony-audio`, `scriptony-image`, `scriptony-video`, `scriptony-media-worker`                                                                                    |
| Workflows | `scriptony-audio-production`, `scriptony-stage`, `scriptony-stage2d`, `scriptony-stage3d`, `scriptony-style`, `scriptony-style-guide`, `scriptony-sync`, `scriptony-gym`                 |
| Platform  | `scriptony-ai`, `scriptony-assistant`, `scriptony-jobs`, `scriptony-observability`, `scriptony-admin`, `scriptony-mcp-appwrite`, `scriptony-storage`, `scriptony-collaboration`          |
| Legacy    | `jobs-handler`, `make-server-3b52693b`                                                                                                                                                   |

## Arbeitsregeln

- Neue Features muessen vor Codeaenderung in der Domain Map einer Ziel-Function zugeordnet sein.
- Jede Code-Phase beginnt mit Analyse der betroffenen Dateien, Routen, Collections, Buckets, Env Vars und Frontend-Aufrufer.
- Keine Breaking Changes ohne Compatibility Wrapper oder dokumentierte Migration.
- Keine technische Provider-Logik in Produkt-Orchestration.
- Keine Produktlogik in technischen Media APIs.
- Keine Upload-Duplikation ausserhalb von `scriptony-assets`.
- Keine Job-Status-Duplikation ausserhalb von `scriptony-jobs`.
- Kein Script-/Dialogtext in `scriptony-audio-production` als Source of Truth.
- Keine Editor-Aggregation in `scriptony-structure`.
- `_shared` enthaelt primitive Infrastruktur, Typen, Permission-Primitives und kleine Adapter, aber keine Workflow-Orchestration.
- `scriptony-storage` besitzt Storage Provider, Storage-OAuth, Storage Connections, Storage Targets, Storage Objects, Sync, Import und Export.
- `scriptony-assets` besitzt fachliche Asset-Metadaten, nicht Provider-OAuth oder physische Storage-Strategie.
- Asset-Uploads muessen ueber eine Storage-Abstraktion laufen. Initial darf diese Appwrite Storage verwenden.
- `scriptony-collaboration` besitzt Projektfreigaben, Mitglieder, Rollen, Einladungen, Organisationen/Workspaces und Access Checks.
- Direkte Projektfreigabe ohne Organisation muss moeglich bleiben.
- Neue Domain-Functions duerfen Projektzugriff nicht direkt ueber `project.created_by` pruefen.
- Neue Domain-Functions muessen Access-Helper wie `canReadProject`, `canEditProject`, `canManageProject` verwenden.
- Initiale Access-Helper-Implementierung darf intern noch `created_by` pruefen, muss aber spaeter `project_members` und `organization_members` beruecksichtigen koennen.
- UI-Aenderungen muessen zum bestehenden UI/UX-System passen: keine neuen Marketing-Layouts, keine unpassenden Komponenten, keine ungeprueften Responsiveness- oder Accessibility-Regressions.

## Done-Report-Vertrag

Beim Abschluss jedes Tickets muss ein Done Report in `docs/scriptony-architecture-refactor 25.04.26.md` geschrieben werden.

Format:

```md
## Phase X - <Bereich>

### Done Report: TXX - <Ticket-Titel>

- Date: YYYY-MM-DD HH:mm CEST
- Verification Marker: ARCH-REF-TXX-DONE
- Changed files:
- Appwrite collections:
- Appwrite buckets:
- Env vars:
- Routes:
- UI/UX checks:
- Tests run:
- Shimwrappercheck command:
- Shimwrappercheck result:
- AI Review result:
- Known risks:
- Rollback plan:
- Notes:
```

Wenn die passende Phase im Done-Report-Dokument noch fehlt, wird sie beim Abschluss des Tickets angelegt.

## Pflicht-Checks

Alle Implementierungstickets muessen ueber den Shim laufen. AI Review darf nicht deaktiviert werden. Die genaue Check-Matrix steht zusaetzlich in `docs/scriptony-architecture-refactor 25.04.26.md`.

Standard-Gate fuer normale Tickets:

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks
```

Wenn unrelated User-Aenderungen im Worktree liegen, muss der Ticket-Scope explizit gesetzt werden:

```bash
SHIM_CHANGED_FILES="path/a.ts,path/b.md" CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks
```

Alternativ kann `SHIM_CHANGED_FILES_FILE` auf eine Datei mit einem Pfad pro Zeile zeigen. Der Scope gilt fuer Format/Lint/Function-Build und wird an den AI Review als Diff-Datei durchgereicht.

Backend-only Gate, wenn sicher kein Frontend/UI betroffen ist:

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --backend
```

Frontend-only Gate, wenn sicher keine Functions/Appwrite-Konfiguration betroffen sind:

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --frontend
```

Gate fuer grosse Refactor-Checkpoints:

```bash
CHECK_MODE=full SHIM_CHECKS_ARGS="" npm run checks -- --refactor
```

Release-, Deploy-, Security- oder Dependency-Aenderungen muessen zusaetzlich `npm audit` ueber den Shim aktivieren:

```bash
SHIM_RUN_NPM_AUDIT=1 CHECK_MODE=full SHIM_CHECKS_ARGS="" npm run checks -- --refactor
```

Bei reinen Dependency-/Tooling-Tickets kann alternativ ein enger Gate laufen:

```bash
SHIM_RUN_NPM_AUDIT=1 CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks
```

Wichtig: `CHECK_MODE=snippet` soll den aktuell geaenderten Code in den AI Review einbeziehen und vermeidet, dass unrelated Altlasten als Blocker fuer ein enges Ticket behandelt werden. Wenn der AI Review trotzdem fremde Altlasten meldet, muss der Done Report klar trennen zwischen `blocking for this ticket` und `pre-existing unrelated`. Bei jedem Ticket muss in den Akzeptanzkriterien dokumentiert sein, welcher dieser Shim-Befehle verbindlich ist.

Codex Usage Limits, CLI-Ausfaelle oder ein fehlendes `VERDICT: ACCEPT` zaehlen nicht als bestandener AI Review. In diesem Fall bleibt das Ticket offen und derselbe scoped Shimwrappercheck-Befehl muss spaeter erneut laufen.

---

# DONE - T12 | `scriptony-editor-readmodel` bauen

**Phase:** 7

## T12: `scriptony-editor-readmodel` bauen

### Kontext

Der Editor braucht zusammengesetzte Daten. Der aktuelle `nodes/ultra-batch-load` erfuellt diesen Bedarf, liegt aber in der falschen Function.

### Problem

`scriptony-structure` darf nicht Characters, Shots, Clips, Assets, Script Blocks und Audio Tracks als Editor-State aggregieren.

### Loesung

Neue read-only Function `scriptony-editor-readmodel` mit `GET /editor/projects/:projectId/state`. Sie aggregiert Project, Structure, Characters, Script Blocks, Shots, Clips, Assets, Scene Audio Tracks und Style Summary. Falls die Aggregation bei grossen Projekten zu langsam wird, unterstuetzt sie einen `lite`-Modus (nur Meta/Struktur) neben `full`, und die Langfriststrategie ist ein gecachter Snapshot (Redis, `project_editor_snapshots`-Collection oder aehnlich).

### User Journey

Ein Nutzer oeffnet den Editor und bekommt schnell einen vollstaendigen Ladezustand, ohne dass Schreiblogik in der Aggregation steckt.

### Akzeptanzkriterien

- `GET /editor/projects/:projectId/state` funktioniert.
- Function ist read-only.
- Keine `createDocument`, `updateDocument`, `deleteDocument` oder Storage Writes in der Function.
- Keine Provider Calls.
- Keine Job-Erstellung.
- Permissions werden fuer alle gelesenen Daten respektiert.
- `ultra-batch-load` wird nicht mehr erweitert.
- Response-Zeit fuer Projekte mit >100 Nodes/Shots wird gemessen. Ueberschreitet sie 10 Sekunden, wird im Done Report dokumentiert, dass dieses Readmodel **V1** ist und durch eine Async-Strategie (Snapshot/Cache) ersetzt werden muss.
- Ein optionaler `lite`-Query-Parameter ist dokumentiert: `lite` liefert nur Meta/Struktur, `full` liefert Assets/Tracks.
- Die JSON-Antwortgroesse wird ueberwacht; grossen Response-Streaming oder Chunking sind als Fallback dokumentiert.
- UI/UX: Editor Loading, Empty States und Fehler nutzen bestehende Patterns; keine Layoutverschiebungen auf Desktop/Mobile.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; Editor-Smoke, Read-only-Pruefung und AI Review muessen im Done Report dokumentiert sein.

### Tests

- Empty project.
- Small project.
- Large project.
- Permission denied.
- Response enthaelt erwartete Bereiche.
- No mutation side effects.
- Performance-Messung gegen bisherigen Editor Load.
- Performance-Test mit einem „grossen Projekt“ (mind. 100 timeline_nodes, 200 shots, 50 clips, 100 script_blocks, 50 assets). Falls der Test fehlschlaegt, wird im Done Report ein Migrationspfad zu einem gecachten Snapshot dokumentiert.
- UI smoke fuer Editor-Start.
- Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Architektur-Hinweis

`scriptony-editor-readmodel` ist explizit als **read-only View-Model V1** dokumentiert. Es darf niemals Schreiblogik enthalten und ist kein Ersatz fuer eine spaetere Such-/Analytics-Ebene. Bei Skalierungsproblemen ist der Wechsel auf einen gecachten Snapshot (Redis oder `project_editor_snapshots`) die bevorzugte Fortsetzung.

### Verifizierungsmarker

`ARCH-REF-T12-DONE`

---
