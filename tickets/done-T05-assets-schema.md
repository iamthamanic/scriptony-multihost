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

# DONE - T05 | `scriptony-assets` Schema planen und provisionieren

**Phase:** 3

## T05: `scriptony-assets` Schema planen und provisionieren

### Kontext

Uploads und Datei-Metadaten sind heute ueber mehrere Functions verteilt.

### Problem

Project-Cover, Shot-Images, Shot-Audio, World-Images, Stage-Dokumente und Styleguide-Referenzen duplizieren Upload-, Storage- und Metadatenlogik.

### Loesung

Neue Collection `assets` planen und provisionieren. Eine erlaubte Matrix fuer `owner_type`, `media_type` und `purpose` verhindert, dass `assets` zur unkontrollierten Ablage wird.

### User Journey

Ein Nutzer laedt eine Datei hoch und kann sie eindeutig einem Projekt, Shot, Script Block, World Item oder Style Guide zuordnen.

### Akzeptanzkriterien

- `assets` Collection ist geplant und provisioniert.
- Felder sind definiert: `project_id`, `owner_type`, `owner_id`, `media_type`, `purpose`, `file_id`, `bucket_id`, `filename`, `mime_type`, `size`, `duration`, `width`, `height`, `status`, `metadata`, `created_by`, `created_at`, `updated_at`.
- Owner-/Purpose-Matrix ist dokumentiert.
- Schema trennt fachliche Asset-Metadaten von physischer Storage-Provider-Logik.
- Optionales Feld fuer Storage-Referenz ist erlaubt, OAuth/Token-Logik ist verboten.
- Die Beziehung zu future `scriptony-storage` ist dokumentiert.
- `project_id` bleibt Pflichtfeld fuer spaetere Collaboration-/Access-Checks.
- Bestehende Buckets werden nicht unkoordiniert ersetzt.
- Delete-Policy ist definiert: Metadata-only delete vs. Storage-file delete.
- UI/UX: keine UI-Aenderung; Upload-UX-Regeln werden fuer T06 festgelegt.
- Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` muss laufen; Appwrite-Schema-/Bucket-Pruefung und AI Review muessen im Done Report dokumentiert sein.

### Tests

- Collection/Attribute/Index-Existenz pruefen.
- Bucket-Mapping fuer bestehende Buckets pruefen.
- Owner-/Purpose-Matrix mit validen und invaliden Beispielen testen.
- Permission-Modell dokumentieren und Testfaelle definieren.
- Dokumentation zur Storage-Abstraktion ist vorhanden.
- Shimwrappercheck Gate: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.

### Verifizierungsmarker

`ARCH-REF-T05-DONE`

---
