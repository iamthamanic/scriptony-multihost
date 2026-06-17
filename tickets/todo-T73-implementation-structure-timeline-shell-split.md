# T73 — StructureTimelineEditor shell split (pass 1)

**Status:** at-work  
**Typ:** implementation  
**Epic:** T50 file-size refactor

## Ziel

`StructureTimelineEditor.tsx` zur Composition-Shell (&lt;400 LOC langfristig). Pass 1: Helpers, Film-Production-Lanes, toter DEPRECATED-Code.

## Pass 1 (done)

- [`structure-timeline-editor-helpers.ts`](../src/components/structure/timeline/structure-timeline-editor-helpers.ts) — page markers, shot audio layout, preview URL
- [`StructureTimelineFilmProductionTracks.tsx`](../src/components/structure/timeline/StructureTimelineFilmProductionTracks.tsx) — editorial / music / SFX scroll rows
- Entfernt: `actBlocks_DEPRECATED`, `sequenceBlocks_DEPRECATED`, `sceneBlocks_DEPRECATED` (~418 LOC)
- `BookTimelineData` aus `@/lib/book-timeline-data`
- Editor: ~6527 → ~5940 LOC (−587)

## Offen (Pass 2+)

- CRUD-Dialoge → `StructureTimelineAddDialog`, `StructureTimelineEditDialog`
- Sidebar film-production labels (ShotTrackLabel, Musik, SFX) → `StructureTimelineFilmProductionLabels`
- Inline `calculateWordCount` in Preview → `timeline-book-duration`
- Shell-Ziel &lt;400 LOC (mehrere PRs, T50 Welle A)

## Gate

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend" \
SHIM_CHANGED_FILES="src/components/structure/timeline/StructureTimelineEditor.tsx,src/components/structure/timeline/structure-timeline-editor-helpers.ts,src/components/structure/timeline/StructureTimelineFilmProductionTracks.tsx" \
npm run checks
```
