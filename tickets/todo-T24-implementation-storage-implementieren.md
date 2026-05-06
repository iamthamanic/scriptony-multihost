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

# TODO - T20.1 | `scriptony-storage` implementieren

**Phase:** laufend · **Abhaengigkeiten:** T20 (Zielmodell), T01 (Domain Map)

## T20.1: `scriptony-storage` Function bauen

### Kontext

T20 hat das Zielmodell und die Provider-Boundary definiert. Die Implementierung existiert noch nicht.

### Problem

Storage-Provider-OAuth, Storage-Connections, Storage-Targets und Storage-Objects sind derzeit unter `scriptony-auth` und `scriptony-assets` verteilt. `scriptony-storage` als Platform-Domain fehlt.

### Loesung

Neue Function `functions/scriptony-storage/` mit Hono-Entrypoint und Routen fuer:

**Routen:**
- `GET /storage/providers` — Liste verfuegbarer Provider
- `POST /storage/connections` — Storage-Connection anlegen
- `GET /storage/connections` — eigene Connections listen
- `DELETE /storage/connections/:id` — Connection entfernen
- `POST /storage/targets` — Storage-Target fuer Projekt/Org/User setzen
- `GET /storage/targets/:ownerType/:ownerId` — Targets lesen
- `POST /storage/objects` — Storage-Object-Metadaten anlegen
- `GET /storage/objects/:id` — Object lesen
- `POST /storage/sync` — Sync-Status aktualisieren
- `POST /storage/import` — Import-Job starten
- `POST /storage/export` — Export-Job starten

**Zu migrierende Logik:**
- `functions/scriptony-auth/storage-providers/oauth/authorize.ts` → `scriptony-storage/routes/oauth.ts`
- `functions/scriptony-auth/storage-providers/oauth/callback.ts` → `scriptony-storage/routes/oauth.ts`
- `functions/scriptony-auth/storage/` (upload.ts, usage.ts) → `scriptony-storage/routes/objects.ts`

**Datenmodelle:**
- `storage_connections` (neue Collection)
- `storage_targets` (neue Collection)
- `storage_objects` (neue Collection)
- `storage_sync_status` (neue Collection, optional)

**Akzeptanzkriterien**

- [ ] `functions/scriptony-storage/` existiert mit Hono-Entrypoint
- [ ] Zod-Validierung aller Inputs
- [ ] Access-Helper fuer Owner-Checks (nur Owner darf Connections/Targets verwalten)
- [ ] `storage_connections` Collection provisioniert
- [ ] `storage_targets` Collection provisioniert
- [ ] `storage_objects` Collection provisioniert
- [ ] OAuth-Flows (Google Drive, Dropbox, etc.) migriert von `scriptony-auth`
- [ ] Upload/Usage-Logik migriert von `scriptony-auth/storage/`
- [ ] `scriptony-auth` enthaelt keine Storage-Provider-OAuth mehr (JSDoc: @deprecated)
- [ ] Tests fuer Routen und Access-Helper
- [ ] Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --backend` gruen

**Tests**

- Unit-Tests fuer Storage-Connection CRUD
- Unit-Tests fuer Target-Resolution (welcher Speicher gilt fuer welchen Owner)
- Integrationstest fuer OAuth-Flow (Mock)

**Verifizierungsmarker**

`ARCH-REF-T20.1-DONE`

---

# TODO - T21.1 | `scriptony-collaboration` implementieren

**Phase:** laufend · **Abhaengigkeiten:** T21 (Zielmodell), T01 (Domain Map), T04 (scriptony-script Access-Helper)

## T21.1: `scriptony-collaboration` Function bauen

### Kontext

T21 hat das Zielmodell, die RBAC-Matrix und die Access-Helper-Vertraege definiert. Die Implementierung existiert noch nicht.

### Problem

Projektzugriff laeuft derzeit nur ueber `created_by`. `project_members`, `project_invites`, `organization_members` und `organization_invites` fehlen. `scriptony-collaboration` als Platform-Domain existiert nicht.

### Loesung

Neue Function `functions/scriptony-collaboration/` mit Hono-Entrypoint und Routen fuer:

**Routen:**
- `GET /collaboration/projects/:projectId/members` — Mitglieder listen
- `POST /collaboration/projects/:projectId/members` — Mitglied hinzufuegen (direkt oder via Invite)
- `PATCH /collaboration/projects/:projectId/members/:userId` — Rolle aendern
- `DELETE /collaboration/projects/:projectId/members/:userId` — Mitglied entfernen
- `POST /collaboration/projects/:projectId/invites` — Einladung senden
- `POST /collaboration/invites/:inviteId/accept` — Einladung annehmen
- `POST /collaboration/invites/:inviteId/reject` — Einladung ablehnen
- `GET /collaboration/organizations` — eigene Organisationen
- `POST /collaboration/organizations` — Organisation erstellen
- `POST /collaboration/organizations/:orgId/members` — Org-Mitglied einladen
- `POST /collaboration/organizations/:orgId/members/:userId` — Org-Mitglied Rolle aendern
- `POST /collaboration/access/check` — Access-Check API (fuer andere Functions)

**Zentrale Access-Helper:**
Die Function exportiert `canReadProject`, `canEditProject`, `canManageProject` als HTTP-API (fuer andere Functions) und als interne Helfer.

**Datenmodelle:**
- `project_members` (neue Collection)
- `project_invites` (neue Collection)
- `organization_members` (neue Collection)
- `organization_invites` (neue Collection)
- `projects.owner_type` (Erweiterung bestehende Collection)
- `projects.owner_id` (Erweiterung bestehende Collection)

**Zu migrierende Logik:**
- `functions/scriptony-auth/organizations/` → `functions/scriptony-collaboration/routes/organizations.ts`
- Duplizierte Access-Helper in `scriptony-assets/_shared/access.ts`, `scriptony-audio-story/_shared/access.ts`, `scriptony-script/_shared/access.ts` → zentrale API bei `scriptony-collaboration`

**Akzeptanzkriterien**

- [ ] `functions/scriptony-collaboration/` existiert mit Hono-Entrypoint
- [ ] `projects` Collection erweitert: `owner_type` ('user' | 'organization'), `owner_id`
- [ ] `project_members` Collection provisioniert
- [ ] `project_invites` Collection provisioniert (mit `expires_at`, `token_hash`, `accepted_at`)
- [ ] `organization_members` Collection provisioniert
- [ ] `organization_invites` Collection provisioniert
- [ ] Zod-Validierung aller Inputs
- [ ] RBAC-Matrix implementiert (Owner/Admin/Editor/Viewer)
- [ ] `canManageProject` delegiert NICHT an `canReadProject` (keine Authz-Eskalation)
- [ ] Einladungen haben TTL (7 Tage Default, konfigurierbar)
- [ ] Rate-Limiting fuer Einladungen (10/hour per inviter per project)
- [ ] `scriptony-auth/organizations/` als @deprecated markiert (JSDoc)
- [ ] Access-Helper API (`/collaboration/access/check`) fuer andere Functions
- [ ] Tests fuer RBAC-Matrix, Invite-Flow, Org-Management
- [ ] Shimwrappercheck: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --backend` gruen

**Tests**

- Unit-Tests: Owner kann Editor einladen, Editor kann nicht Owner einladen, Viewer kann nichts aendern
- Unit-Tests: Abgelaufene Einladung wird abgelehnt
- Unit-Tests: Einmaliger Token wird bei Annahme invalidiert
- Integrationstest: Org-Workflow (Erstellen, Einladen, Rolle setzen, Verlassen)

**Verifizierungsmarker**

`ARCH-REF-T21.1-DONE`

---

# TODO - T21.2 | Access-Helper zentralisieren und `created_by` entfernen

**Phase:** laufend · **Abhaengigkeiten:** T21.1 (Collaboration live), T04-T06, T08, T12 (Functions mit duplizierten Access-Helpern)

## T21.2: Access-Helper Konsolidierung

### Kontext

Nach T21.1 existiert `scriptony-collaboration` mit zentraler Access-Check-API. Die bestehenden Functions haben noch eigene Duplikate.

### Problem

- `functions/scriptony-assets/_shared/access.ts`
- `functions/scriptony-audio-story/_shared/access.ts`
- `functions/scriptony-script/_shared/access.ts`

enthalten identische/isomorphe `canReadProject`/`canEditProject`/`canManageProject`. Bei RBAC-Änderungen müssen alle 3 Files gepflegt werden.

### Loesung

**Phase 1 (kompatibel):** Functions nutzen `scriptony-collaboration` HTTP-API fuer Access-Checks. Fallback auf lokale Helper bei Netzwerkfehler.

**Phase 2 (nach Migration):** Lokale `_shared/access.ts` Dateien löschen. Einheitliche Quelle: `scriptony-collaboration`.

**Konvergenz-Fahrplan:**

| Function | Status Ziel | Aktion |
|---|---|---|
| `scriptony-assets` | Nutzt Collaboration API | `_shared/access.ts` entfernen |
| `scriptony-audio-story` | Nutzt Collaboration API | `_shared/access.ts` entfernen |
| `scriptony-script` | Nutzt Collaboration API | `_shared/access.ts` entfernen |
| `scriptony-editor-readmodel` | Nutzt Collaboration API | (hat noch keinen Helper, direkt API) |
| `scriptony-audio` | Nutzt Collaboration API | (hat noch keinen Helper, direkt API) |
| `scriptony-image` | Nutzt Collaboration API | (hat noch keinen Helper, direkt API) |

**Akzeptanzkriterien**

- [ ] `scriptony-collaboration/access/check` API dokumentiert und stabil
- [ ] `scriptony-assets` nutzt Collaboration-API statt lokalem Helper
- [ ] `scriptony-audio-story` nutzt Collaboration-API statt lokalem Helper
- [ ] `scriptony-script` nutzt Collaboration-API statt lokalem Helper
- [ ] Keine `created_by`-Checks mehr in Route-Handlern (nur via Access-Helper)
- [ ] Fallback-Logik bei Collaboration-API-Netzwerkfehler
- [ ] Shimwrappercheck gruen nach jeder Function-Migration

**Verifizierungsmarker**

`ARCH-REF-T21.2-DONE`
