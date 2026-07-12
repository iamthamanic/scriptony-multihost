# Scriptony Ticket T50 — Plan: Codebase File-Size Refactor (Epic)

Stand: 2026-05-23

## Ziel

Gesamte Codebase schrittweise an **AGENTS.md**-Größenlimits anpassen, ohne Big-Bang-Rewrite.

| Limit | Wert | Gate |
|-------|------|------|
| Soft | **300** Zeilen/Datei | WARN (Snippet) / FAIL (Full) |
| Hard | **500** Zeilen/Datei | **FAIL** immer |
| Komponente | **150** Zeilen (Richtwert) | manuell beim Split |

**Ist-Stand (Full-Scan):** **54 Hard**, **~56 Soft** (siehe unten).  
**Tool:** `scripts/checks/project-rules.sh` · Hilfe: `bash scripts/checks/list-file-size-violations.sh --markdown`

## Regeln (Epic)

1. **Kein Verhalten ändern** — reine Extraktion (`git mv`, neue Module), außer Bugfix explizit im Ticket.
2. **Ein Brocken pro Implementation-Ticket** — max. 1–3 verwandte Dateien.
3. **Snippet-First:** neuer Code in geänderten Dateien unter 300 Zeilen halten.
4. **Full grün** ist Epic-Abschluss, nicht Voraussetzung für Feature-Tickets (T34–T43).
5. Vorbild im Repo: `functions/scriptony-audio-story/routes/tts-callback-helpers.ts` (T31-Split).

## Check-Befehle

```bash
# Gesamtinventar
CHECK_MODE=full bash scripts/checks/project-rules.sh

# Markdown-Tabelle (Copy für Tickets)
bash scripts/checks/list-file-size-violations.sh --markdown

# Refactor-Ticket abschließen
SHIM_CHANGED_FILES="src/lib/api-gateway.ts,..." CHECK_MODE=snippet npm run checks
```

## Wellen & Priorität

### Welle A — Shared / Infrastruktur (P1, zuerst)

Viele Abhängigkeiten; kleine Splits, hoher Hebel.

| Zeilen | Datei | Vorschlag Split |
|--------|-------|-----------------|
| 667 | `src/lib/api-gateway.ts` | **T51** → `route-map.ts`, `gateway-errors.ts`, `gateway-fetch.ts` |
| 705 | `src/lib/types/index.ts` | **T52** → `types/project.ts`, `types/timeline.ts`, … |
| 599 | `src/lib/api-client.ts` | **T53** → transport vs. auth-retry |
| 592 | `src/lib/cache-manager.ts` | cache tiers / storage keys |
| 558 | `src/lib/project-export.ts` | format writers pro Export-Typ |
| 570 | `src/lib/api/shots-api.ts` | CRUD vs. batch |
| 743 | `src/lib/api/timeline-api-v2.ts` | read vs. mutate |
| 739 | `src/lib/templates/registry-v2.ts` | registry vs. template defs |
| 684 | `src/lib/beat-templates.ts` | templates by genre |
| 558 | `src/hooks/useHierarchyCRUD.ts` | read / create-update / delete |
| 732 | `src/contexts/TimelineStateContext.tsx` | state / actions / selectors |
| 1354 | `functions/_shared/graphql-operations/handlers-all.ts` | **T54** pro Domain-Handler |
| 939 | `functions/_shared/ai-central-store.ts` | store / migrations / queries |
| 873 | `functions/_shared/timeline.ts` | build vs. mutate vs. types |
| 530 | `functions/_shared/ai-feature-profile.ts` | profiles / defaults |
| 518 | `functions/_shared/ai-service/model-discovery.ts` | providers split |

### Welle B — Mega-UI (P2, ticketisiert, isoliert testen)

| Zeilen | Datei | Vorschlag |
|--------|-------|-----------|
| 8582 | `src/components/VideoEditorTimeline.tsx` | **T55** — höchstes Risiko; Unterordner `timeline/editor/` |
| 8161 | `src/components/pages/ProjectsPage.tsx` | **T56** — `projects/` Feature-Ordner |
| 4068 | `src/components/film/FilmDropdown.tsx` | **T33** (bestehend) fortsetzen |
| 3112 | `src/engines/stage-2d/StageCanvas.tsx` | **T57** — canvas / tools / layers |
| 2895 | `src/components/assistant/ScriptonyAssistant.tsx` | assistant panels + hooks |
| 2814 | `src/components/book/BookDropdown.tsx` | book/ subcomponents |
| 2509 | `src/components/ai/AISettingsForm.tsx` | sections → tabs files |
| 2476 | `src/components/pages/WorldbuildingPage.tsx` | worldbuilding/ folder |
| 1794 | `src/components/MapBuilder.tsx` | map tools / canvas |
| 1719 | `src/components/assistant/AIIntegrationsSection.tsx` | provider cards |
| 1635 | `src/components/ShotCard.tsx` | card / actions / media |
| 1230 | `src/modules/creative-gym/presentation/CreativeGymApp.tsx` | gym/ modules |
| 1220 | `src/components/timeline/TimelineNodeStatsDialog.tsx` | stats tabs |
| 1187 | `src/components/audio/AudioDropdown.tsx` | audio/ split (T31-Nähe) |
| 1014 | `src/components/StructureBeatsSection.tsx` | beats list / editor |

Weitere Hard (>500, Welle B/C):

- `src/components/ProjectStatsLogsDialogEnhanced.tsx` (1235)
- `src/components/project/ProjectStatsLogsDialog.tsx` (979)
- `src/components/shared/RichTextEditorModal.tsx` (835)
- `src/components/pages/SettingsPage.tsx` (704)
- `src/components/film/FilmDropdownMobile.tsx` (728)
- `src/components/audio/AudioEditDialog.tsx` (744)
- `src/components/ai/FeatureProviderCard.tsx` (863)
- `src/components/book/NativeBookView.tsx` (619)
- `src/components/book/BookDropdownMobile.tsx` (639)
- `src/components/pages/SuperadminPage.tsx` (629)
- `src/components/project-form/ProjectForm.tsx` (592)
- `src/components/world/WorldStatsLogsDialog.tsx` (601)
- `src/components/Navigation.tsx` (545)
- `src/components/ShotCardModal.tsx` (503)
- `src/components/settings/StorageSettingsSection.tsx` (502)

### Welle C — Functions Entrypoints (P2)

| Zeilen | Datei |
|--------|-------|
| 805 | `functions/scriptony-audio/tts.ts` |
| 786 | `functions/scriptony-gym/index.ts` |
| 768 | `functions/scriptony-style-guide/index.ts` |
| 735 | `functions/scriptony-ai/index.ts` |
| 660 | `functions/scriptony-video/index.ts` |
| 602 | `functions/scriptony-audio-story/routes/tracks.ts` |

Split-Muster: `routes/` + `services/` (wie `scriptony-audio-story`).

### Welle D — Tests & Seeds (P3)

| Zeilen | Datei |
|--------|-------|
| 602 | `src/lib/ripple-engine.test.ts` |
| 622 | `src/modules/creative-gym/infrastructure/seeds/challenge-seeds.ts` |

Tests: pro Describe-Block Datei. Seeds: pro Kategorie.

## Soft Violations (>300, ≤500)

In **Full-Mode FAIL**. Beim Anfassen mitrefactoren oder eigenes Mini-Ticket.

Auszug (56 Dateien — vollständige Liste via Script):

- `functions/scriptony-audio-story/routes/tts-callback.ts` (500 — Grenzfall)
- `src/lib/utils/index.ts` (484)
- `src/components/style-guide/StyleGuideReferencesTab.tsx` (481)
- `src/lib/auth/AppwriteAuthAdapter.ts` (366)
- … `bash scripts/checks/list-file-size-violations.sh --all`

## Implementation-Tickets (aus diesem Plan)

| Ticket | Scope | Status |
|--------|-------|--------|
| **T50** | Epic-Plan (dieses Ticket) | todo |
| **T51** | `api-gateway.ts` Split | todo |
| **T52** | `lib/types/index.ts` Split | todo |
| **T53** | `api-client.ts` Split | todo |
| **T54** | `handlers-all.ts` Split | todo |
| **T55** | `VideoEditorTimeline.tsx` | todo |
| **T56** | `ProjectsPage.tsx` | todo |
| **T57** | `StageCanvas.tsx` | todo |
| T33 | `FilmDropdown` (bestehend) | todo |

Weitere Brocken: bei Bedarf `todo-T5x-implementation-…` anlegen.

## Split-Checkliste (pro Datei)

- [ ] Full-Scan: Datei >500 (oder >300 wenn angefasst)
- [ ] Extraktion geplant (Komponenten / Hooks / Services)
- [ ] `git mv` statt Kopien (`*_CLEAN`, Duplikate verboten)
- [ ] Imports aktualisiert, Barrel-Exports minimal
- [ ] Keine Logik-Änderung (oder separat dokumentiert)
- [ ] `SHIM_CHANGED_FILES=… CHECK_MODE=snippet npm run checks`
- [ ] Betroffene Datei ≤500 (Ziel ≤300)
- [ ] Done Report Zeile in `docs/scriptony-architecture-refactor 25.04.26.md`

## Akzeptanzkriterien (Epic T50)

- [ ] Plan und Inventar liegen in `tickets/` (dieses Ticket).
- [ ] `list-file-size-violations.sh` existiert und ist dokumentiert.
- [ ] Wellen A–D mit priorisierten Dateien und Folge-Tickets T51–T57.
- [ ] Team-Regel: neue Dateien ≤300, Hard-Limit 500 enforced auf touched files.

## SOLID / DRY / KISS

- **SRP:** Eine Datei = eine Domäne/Concern.
- **OCP:** Neue Features in kleinen Modulen, nicht in Mega-Files anhängen.
- **DRY:** Shared Logic nach `_shared/` / `lib/`, nicht copy-paste beim Split.
- **KISS:** Ein Ticket, ein Brocken; Full-Scan grün als Epic-Ende, nicht vorher alles blockieren.
