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

# TODO - T23 | `src/components/` in Feature-Domains aufteilen

**Phase:** 11 · **Ticket-Status:** `todo` (nicht begonnen)

## T23: `src/components/` in Feature-Domains aufteilen

### Kontext

`src/components/` enthält **91 .tsx-Dateien** in einem flachen Ordner.

### Problem

Keine Domain-Trennung. Neue Features landen willkürlich. Dateien wie `AudioDropdown.tsx`, `BookDropdown.tsx`, `BeatTimeline.tsx` und `LoadingSpinner.tsx` teilen denselben Namespace. Das erschwert:

- Code Review (unübersichtliche Diff-Scopes)
- Onboarding (keine Orientierung wo was liegt)
- Refactoring (unbekannte Seiteneffekte bei Änderungen)

### Lösung

Feature-Domain-Ordner unter `src/components/`:

```
src/components/
├── audio/          # AudioTimeline, AudioSceneCard, etc.
├── book/           # BookDropdown, NativeBookView
├── characters/     # CharacterPicker, CharacterDetailModal
├── film/           # FilmDropdown, NativeScreenplayView
├── inspiration/    # InspirationCard, AddInspirationDialog
├── project/        # ProjectCarousel, ProjectExportDialog
├── timeline/       # BeatTimeline, VirtualizedTimeline, etc.
├── world/          # WorldCarousel, WorldReferenceAutocomplete
├── assistant/      # ScriptonyAssistant, AIIntegrationsSection
├── settings/       # ServerStatusBanner, PerformanceDashboard
├── shared/         # LoadingSpinner, EmptyState, ContainerCard
├── ui/             # shadcn/ui primitives (bleibt)
├── ai/             # FeatureModelPicker, ProviderBadges (bleibt)
├── auth/           # ProtectedRoute (bleibt)
├── pages/          # HomePage, ProjectsPage (bleibt)
├── figma/          # Figma-Komponenten (bleibt)
├── project-form/    # (bleibt)
├── stage/           # (bleibt)
├── style-guide/     # (bleibt)
```

### Mapping-Tabelle (bestätigt)

| Datei                                                                                                                                                                                                                                                                                                                                        | Ziel-Ordner    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| AudioDropdown.tsx, AudioEditDialog.tsx, AudioEditDialogPro.tsx, AudioFileList.tsx, AudioLabelDialog.tsx, AudioSceneCard.tsx, AudioSceneView.tsx, AudioTimeline.tsx, AudioTimelineLane.tsx, AudioTimelineRuler.tsx, AudioTimelineSegment.tsx, NativeAudiobookView.tsx, ProgressiveWaveform.tsx                                                | `audio/`       |
| BookDropdown.tsx, BookDropdownMobile.tsx, NativeBookView.tsx                                                                                                                                                                                                                                                                                 | `book/`        |
| CharacterAutocomplete.tsx, CharacterDetailModal.tsx, CharacterPicker.tsx, SceneCharacterBadge.tsx                                                                                                                                                                                                                                            | `characters/`  |
| FilmDropdown.tsx, FilmDropdownControlled.tsx, FilmDropdownMobile.tsx, NativeScreenplayView.tsx                                                                                                                                                                                                                                               | `film/`        |
| AddInspirationDialog.tsx, InspirationCard.tsx, InspirationField.tsx                                                                                                                                                                                                                                                                          | `inspiration/` |
| ProjectCardWithPrefetch.tsx, ProjectCarousel.tsx, ProjectDebugger.tsx, ProjectDropdown.tsx, ProjectExportDialog.tsx, ProjectFieldLabel.tsx, ProjectSectionFrame.tsx, ProjectStatsLogsDialog.tsx                                                                                                                                              | `project/`     |
| BeatBand.tsx, BeatCard.tsx, BeatColumn.tsx, BeatRail.tsx, BeatTimeline.tsx, ResizableBeatBlock.tsx, TimelineNodeStatsDialog.tsx, TimelineTextPreview.tsx, VirtualizedTimeline.tsx                                                                                                                                                            | `timeline/`    |
| WorldCarousel.tsx, WorldReferenceAutocomplete.tsx, WorldStatsLogsDialog.tsx                                                                                                                                                                                                                                                                  | `world/`       |
| AIIntegrationsSection.tsx, HookBar.tsx, ScriptonyAssistant.tsx                                                                                                                                                                                                                                                                               | `assistant/`   |
| BackendNotConfiguredBanner.tsx, ChatSettingsDialog.tsx, ConnectionStatusIndicator.tsx, PerformanceDashboard.tsx, ServerStatusBanner.tsx, StorageSettingsSection.tsx, SystemStatusSection.tsx                                                                                                                                                 | `settings/`    |
| ContainerCard.tsx, ContentSkeleton.tsx, DebouncedRichTextEditor.tsx, EditableParagraph.tsx, EmptyState.tsx, GifAnimationUploadDialog.tsx, HighlightedTextarea.tsx, ImageCropDialog.tsx, ImageUploadWaveOverlay.tsx, LoadingSpinner.tsx, ReadonlyTiptapView.tsx, ReferenceTag.tsx, RichTextEditorModal.tsx, RoadIcon.tsx, SaveStatusBadge.tsx | `shared/`      |

### Migration-Regeln (verbindlich)

| Regel                                            | Beschreibung                                                                                                |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Keine Regex-basierten Import-Fixes**           | LSP/IDE-Refactor oder manuelles `find + sed` mit Review. Regex hat beim ersten Versuch Dateien korrumpiert. |
| **Mapping-Tabelle vorab**                        | Jedem Komponentennamen ein Ziel-Ordner zuordnen (siehe Tabelle oben).                                       |
| **Pro Domain ein Commit**                        | Nicht alle 91 Dateien auf einmal. Pro Domain (z. B. nur `audio/`) ein separater Commit.                     |
| **Import-Pfade mit `tsc --noEmit` verifizieren** | Nach jedem Domain-Commit TypeScript check laufen lassen.                                                    |
| **Lazy-Import-Pfade prüfen**                     | `import("../components/Foo")` in `AppContent.tsx`-Lazy-Blöcken müssen angepasst werden.                     |
| **Barrel-Export optional**                       | Pro Domain `index.ts` mit Re-Exports — erst wenn nötig, nicht voreilig.                                     |

### Gescheiterter Versuch (Dokumentation)

2026-05-05: Bulk-`git mv` + Python-Regex-Skript zur Import-Korrektur.
Ergebnis: **Reverted.**

- 97 externe Import-Fixes generiert, aber Regex ersetzte falsch:
  - `import { ChatSettingsDialog } from "./settings/ChatSettingsDialog"` → korrumpiert zu `./settings/ChatSettingsDialogcomponents/settings/ChatSettingsDialog`
- Weitere 100+ TypeScript-Fehler durch falsche `../` vs `../../` Tiefen in verschobenen Dateien.
- Lektion: **Keine Regex-basierten Import-Rewrites bei komplexen relativen Pfaden.**

### Akzeptanzkriterien

- [x] Mapping-Tabelle in Ticket erstellt und vom Reviewer bestätigt.
- [x] Jede verschobene Datei hat korrekte Import-Pfade (`tsc --noEmit` grün nach Batch).
- [x] `src/components/` enthält keine flachen Domain-Dateien mehr (nur Ordner + 17 Legacy-Dateien, die nicht in Mapping).
- [x] `AppContent.tsx` Lazy-Imports aktualisiert.
- [x] Keine Barrels ohne Notwendigkeit.
- [x] Prettier + Lint grün.
- [x] Build gruen (`npm run build`).
- [x] Tests gruen (`npm run test:run` — 246 passed).
- [ ] Shimwrappercheck AI Review: Codex Input-Limit exceeded — muss spaeter nachgeholt werden.

### Tests

- `tsc --noEmit` nach jeder Domain-Gruppe.
- `npm run lint` nach jeder Domain-Gruppe.
- `npm run format:check` nach jeder Domain-Gruppe.

### Verifizierungsmarker

`ARCH-REF-T23-DONE`
