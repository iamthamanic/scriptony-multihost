# T63 — VETILALORAPP: Abweichungs-Matrix (Spec §18 vs. Code)

Status: `at-work` (T63a + T63c erledigt 2026-06-06)  
Ziel: `implementation`  
Referenz: `docs/pages/ventilalorapp.md` §13, §18, §19

## Legende

| Symbol | Bedeutung |
|--------|-----------|
| ✅ | erfüllt |
| 🟡 | teilweise |
| ❌ | offen |
| ➖ | bewusst out of scope (Beat/NLE/DAW) |

## Matrix

| # | Spec §18 / §13 | Code-Stand | Ticket-Schritt |
|---|----------------|------------|----------------|
| 1 | Structure-Trim über TimelineTree | 🟡 alle pct-Typen inkl. Buch (Tree-Layout); Audio-DAW separat | T63f Registry |
| 2 | Act/Seq/Scene/Shot gleicher Preview-Pfad | 🟡 Buch-Shots Legacy (keine Shot-Lane) | T63b Legacy Buch-Shot entfernen wenn Lane weg |
| 3 | Hierarchical Ripple grow/shrink | ✅ Engine-Tests | — |
| 4 | Magnetic Snap scope-aware | ✅ Engine | — |
| 5 | Parent Auto-Fit alle Ebenen | ✅ Engine | — |
| 6 | Kein React-State bei pointermove | 🟡 Layout-Freeze aktiv; Zoom während Drag noch prüfen | T63d manuell |
| 7 | Kein API bei pointermove | ✅ Bridge | — |
| 8 | Kein raw pct als Layout-Quelle | 🟡 Render: Tree; Persist: pct abgeleitet | — |
| 9 | Persistenz robust | ✅ persist layer + Revert | — |
| 10 | Reload identisch | ❌ manuell offen | T63d Journeys 12.1–12.5 Desktop |
| 11 | Alte Engine-Dateien entfernt | 🟡 pct-Module weg; VET-Monolith + NLE-expand bleiben | T63e Phase 5 Cleanup |
| 12 | Tests Engine/Tree/Hook | ✅ ~100 Tests | — |
| 13 | VET ohne monolithische Trim-Engine | ❌ `handleTrimClipMove` Legacy Buch | T63e |
| 14 | Kein Act-Sonderfall | ✅ Engine | — |
| 15 | Alle Projekttypen, eine Timeline-Physik | 🟡 Registry: Audio `timelineview` = DAW ohne VET | T63f Registry → StructureTimelineView |
| 16 | Viewport-Refs live beim Drag/Scroll | ✅ syncViewport + reapply on scroll | T63d manuell |
| 17 | Preview = Persist = Render | ❌ UI-Bug | T63c + T63d |

## Root Cause (2026-06-09, bestätigt per Test)

**Symptom:** Nach Structure-Trim (Act/Seq/Scene) überlappen Blöcke, mehrere Titel in einer Spur, Seq/Scene passen nicht zum Act.

**Ursache:** `resetStructurePreviewStyles()` löscht per DOM alle `transform`/`width`/`left`. React reconciled danach nur Styles, die sich **gegenüber dem letzten Render geändert** haben — nicht gegenüber dem echten DOM. Unveränderte Items (typisch Seq/Scene bei Act-`shell-resize`, manchmal zweiter Act) behalten **leeres `transform`** → mit `left:0` stapeln alle bei x=0.

**Test:** `src/lib/ripple-engine/__tests__/preview-react-reconcile.test.tsx`

**Nicht die Ursache:** Engine/Ripple (26 Tests grün), T63f Registry, T63d manuelle Journeys.

**Fix-Richtung (T63g):** Reset entfernen oder durch erzwungenes React-Reconcile ersetzen (`key`-bump, `flushSync`, Preview nur auf Ref-Layer, oder alle Structure-Styles aus React ziehen).

## Umsetzungsreihenfolge (KISS)

1. **T63g** — Post-Trim Handoff: kein DOM-reset ohne React-Style-Resync (P0)
2. **T63c** — Layout-Freeze + Viewport-Sync (erledigt, reicht für Drag allein nicht)
2. **T63a** — Buch: Bridge + `usePctStructureTreeLayout` (P0, in Arbeit)
3. **T63d** — Manuelle Journeys + `VETILALORAPP_USER_JOURNEYS.md` Status
4. **T63f** — `projectTypeRegistry` audio/book `timelineview` vereinheitlichen
5. **T63e** — Legacy `handleTrimClipMove` / NLE-pct aus Structure-Pfad trennen
6. **T63b** — Toten Buch-Shot-Legacy entfernen (optional, keine Shot-Lane)

## Checks (scoped)

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend" \
SHIM_CHANGED_FILES="src/components/VideoEditorTimeline.tsx,src/hooks/useVetStructureTrimBridge.ts,src/hooks/useStructureTrimSession.ts,src/lib/vet-structure-trim-active.ts,src/lib/vet-structure-trim-layout-freeze.ts" \
npm run checks
```
