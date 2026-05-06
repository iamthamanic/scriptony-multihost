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

# DONE - T08 | Audio Production Orchestration an Script, Audio, Assets und Jobs anbinden

**Phase:** 5

## T08: Audio Production Orchestration an Script, Audio, Assets und Jobs anbinden

### Kontext

Audio Production soll aus Script Blocks Audio-Tracks erzeugen, Voice Assignments nutzen, TTS ueber `scriptony-audio` ausfuehren, Dateien ueber `scriptony-assets` speichern und Mix/Export als Job ausloesen.

### Problem

Aktuell sind Mixing/Export Fake-Antworten und Script ist nicht Source of Truth.

### Loesung

`scriptony-audio-production` Orchestration implementieren oder vorbereiten: `generate-from-script`, Preview Mix und Export erzeugen Jobs oder delegieren an eine Job-Facade. TTS-Execution bleibt in `scriptony-audio`. Job-Payloads speichern keine vollstaendigen Script-Inhalte als Inline-JSON; stattdessen wird ein Snapshot als Asset/externe Referenz abgelegt und im Job nur per `snapshot_id` verlinkt.

### User Journey

Ein Nutzer waehlt eine Szene, weist Stimmen zu, erzeugt Audio aus Dialogbloecken und startet einen Preview-Mix. Das Ergebnis ist nachvollziehbar und als Asset gespeichert.

### Akzeptanzkriterien

- `generate-from-script` liest `script_blocks`, kopiert sie nicht als Source of Truth.
- TTS wird ueber `scriptony-audio` oder dessen Service-Abstraktion ausgefuehrt.
- Generierte Dateien werden ueber `scriptony-assets` gespeichert oder verlinkt.
- Mix/Export erzeugt Jobstatus statt Fake-Ergebnis.
- Job Payload enthaelt eine Script-Revision **Referenz** (`script_id`, `revision`, `snapshot_id`), nicht den vollstaendigen Inhalt als Inline-JSON.
- Snapshot-Daten (z. B. serialisierte Script-Blocks fuer nachvollziehbare Wiedergabe) werden als separates Asset oder in einer eigenen `job_snapshots`-Collection gespeichert; das `jobs`-Dokument bleibt unter 100 KB Payload.
- Voice Discovery wird nicht lokal dupliziert.
- UI/UX: Audio-Production UI zeigt Loading, Job-Status, Fehler und leere Zustaende nach bestehenden Patterns; keine neuen ungeprueften Controls.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; Job-/Route-Smokes, UI/UX-Pruefung und AI Review muessen im Done Report dokumentiert sein.

### Tests

- Create audio session.
- Create scene audio track.
- Assign voice to character.
- Generate audio from script blocks.
- TTS call bleibt ausserhalb von Audio Production.
- Generated audio appears as asset.
- Preview mix creates job.
- Export creates job.
- Permission denied fuer falsches Projekt.
- Ein Export-Job mit >100 Script-Blocks erzeugt ein `jobs`-Dokument unter 100 KB; der Snapshot liegt als Asset oder externe Referenz.
- UI smoke fuer Jobstatus/Fehler, falls UI geaendert wird.
- Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Architektur-Hinweis

Die `jobs`-Collection bleibt Control-Plane (Status, Referenzen, Timestamps). Die echten Arbeitsobjekte (Script-Inhalte, Audio, Renders) liegen in ihren eigenen Domains und werden ueber Assets oder Snapshot-Collections referenziert, nicht inline im Job-Dokument.

### Verifizierungsmarker

`ARCH-REF-T08-DONE`

---
