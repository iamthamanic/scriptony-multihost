# Code health — duplicate clones (top 20 by ROI)

**Ticket:** T75  
**Generated:** 2026-06-15  
**Tool:** `npx fallow dupes --format json` (fallow **2.96.0**, config [`.fallowrc.jsonc`](../.fallowrc.jsonc))  
**Scope:** Post-filtered to `src/` and `functions/_shared/` only (565 raw clone groups → **201** with ≥2 in-scope instances across ≥2 files).

## Method

1. Full-repo duplicate scan respects `.fallowrc.jsonc` (`entry`: `src/**`, `functions/**`; ignores bundles, MCP, `.agents`, etc.).
2. Results filtered to paths under `src/` or `functions/_shared/`.
3. **ROI score** (relative, for prioritization): `line_count × instance_count × cross-file factor × cross-runtime factor (src↔_shared) × category boost`, with **down-rank** for `src/imports/` (Figma) and test-only groups.
4. **Category boosts** (highest first): dropdown loaders, trim/snap helpers, `_shared`↔`src/lib` drift, function entry (see T71), stats/dialog/carousel clusters.

### Function entry (T71)

Cross-function `functions/scriptony-*/index.ts` boilerplate was consolidated in **T71** (`functions/_shared/appwrite-handler.ts`). Fallow still reports **~15** cross-`index.ts` clone groups outside this doc’s `_shared`-only slice — treat as **regression watch**, not top ROI inside `src/` + `_shared/`.

---

## Top 20 duplicate groups

| Rank | Clone ID | Lines | Inst. | Category | ROI | Locations (line ranges) | Recommended action |
|------|----------|-------|-------|----------|-----|-------------------------|-------------------|
| 1 | `dup:c7187d49` | 450 | 2 | dropdown · native views | 3105 | `src/components/audio/NativeAudiobookView.tsx` L42–393; `src/components/book/NativeBookView.tsx` L53–502 | Extract shared native reader shell (layout + dropdown chrome) for book/audio. |
| 2 | `dup:bcd77bb4` | 301 | 2 | shared drift | 3102 | `functions/_shared/ripple-engine-reorder.ts` L17–317; `src/lib/ripple-engine-reorder.ts` L17–317 | Single canonical `ripple-engine-reorder`; other side re-exports or generated sync — no dual edits. |
| 3 | `dup:869ed7e4` | 282 | 2 | shared drift | 2906 | `functions/_shared/ripple-engine-calculate.ts` L38–319; `src/lib/ripple-engine-calculate.ts` L38–319 | Same as rank 2 for `ripple-engine-calculate`. |
| 4 | `dup:5c41bcd4` | 218 | 2 | shared drift | 2407 | `functions/_shared/default-assistant-system-prompt.ts` L10–227; `src/lib/assistant-system-prompt.ts` L6–223 | One assistant system-prompt module; cloud function imports shared text from a single file. |
| 5 | `dup:05feeb75` | 288 | 2 | dropdown loader | 1987 | `src/components/book/BookDropdownViewMobile.tsx` L144–427; `src/components/structure/DropdownViewMobile.tsx` L206–493 | Shared mobile dropdown view + data wiring; parameterize book vs structure. |
| 6 | `dup:57a4f7f9` | 368 | 2 | dialog | 1862 | `src/components/ProjectStatsLogsDialogEnhanced.tsx` L224–516; `src/components/project/ProjectStatsLogsDialog.tsx` L163–530 | Merge enhanced/base project stats dialogs into one component with variants. |
| 7 | `dup:b8e3678f` | 274 | 2 | dialog | 1386 | `ProjectStatsLogsDialogEnhanced.tsx` L735–1008; `ProjectStatsLogsDialog.tsx` L647–920 | Continue stats dialog unification (footer / log list block). |
| 8 | `dup:faeaa8bb` | 127 | 2 | carousel | 876 | `src/components/project/ProjectCarousel.tsx` L89–215; `src/components/world/WorldCarousel.tsx` L80–206 | Extract `EntityCarousel` primitive (project/world/home). |
| 9 | `dup:f4382887` | 173 | 2 | dialog | 875 | `ProjectStatsLogsDialogEnhanced.tsx` L622–706; `ProjectStatsLogsDialog.tsx` L440–612 | Shared stats dialog section (className/layout block). |
| 10 | `dup:1411f50b` | 70 | 2 | shared drift | 721 | `functions/_shared/ripple-engine-types.ts` L18–87; `src/lib/ripple-engine-types.ts` L18–87 | Deduplicate ripple types with rank 2–3 migration. |
| 11 | `dup:0fa4161f` | 54 | 2 | shared drift | 596 | `functions/_shared/audio-utils.ts` L33–86; `src/lib/audio-utils.ts` L10–63 | Single `audio-utils` (WPM defaults + helpers); align Tauri and Functions. |
| 12 | `dup:c6740c16` | 47 | 2 | shared drift | 484 | `functions/_shared/audio-utils.ts` L9–38; `src/lib/types/audio.ts` L92–138 | Move narrator/voice types next to `audio-utils` or shared `types/audio`. |
| 13 | `dup:d0ca8b7a` | 95 | 2 | dialog | 481 | `ProjectStatsLogsDialogEnhanced.tsx` L81–175; `ProjectStatsLogsDialog.tsx` L63–157 | Shared stats dialog header / fetch setup. |
| 14 | `dup:40be696f` | 90 | 2 | dialog | 455 | `ProjectStatsLogsDialog.tsx` L889–977; `TimelineNodeStatsDialog.tsx` L1129–1218 | Generalize stats dialog for project vs timeline node context. |
| 15 | `dup:d692ee71` | 60 | 3 | dialog | 455 | Enhanced L815–870; `ProjectStatsLogsDialog.tsx` L727–782; `TimelineNodeStatsDialog.tsx` L978–1037 | Extract shared log-row renderer (3-way). |
| 16 | `dup:a7342843` | 59 | 3 | dialog | 448 | Enhanced L425–483; `ProjectStatsLogsDialog.tsx` L364–422; `TimelineNodeStatsDialog.tsx` L322–377 | Shared date/format helper for stats dialogs. |
| 17 | `dup:87d6bcb2` | 61 | 2 | trim/snap | 421 | `src/hooks/useStructureTimelineMoveBridge.ts` L77–122; `src/hooks/useStructureTimelineTrimBridge.ts` L100–160 | Merge move/trim bridge hooks into one hook with mode flag or shared core. |
| 18 | `dup:40925025` | 55 | 2 | dropdown loader | 379 | `BookDropdownViewMobile.tsx` L74–128; `DropdownViewMobile.tsx` L115–169 | Shared mobile dropdown state (`Set` / selection bootstrap). |
| 19 | `dup:6f547b08` | 68 | 2 | dialog | 344 | `ProjectStatsLogsDialog.tsx` L454–521; `TimelineNodeStatsDialog.tsx` L406–473 | Another stats dialog slice — fold into generalized dialog from ranks 6–16. |
| 20 | `dup:c0b3ad34` | 145 | 2 | page shell | 334 | `src/components/pages/ProjectsPage.tsx`; `src/components/pages/WorldbuildingPage.tsx` L448–592; `ProjectsPage.tsx` L1075–1219 | Extract shared page chrome / list shell; keep domain-specific data hooks separate. |

### Honorable mention (in scope, lower ROI)

| Clone ID | Notes |
|----------|--------|
| `dup:bd36f026` | `functions/_shared/ai-feature-profile.ts` ↔ `src/lib/ai-image-feature-routing.ts` (9 lines) — align image feature model resolution (T72 boundary). |
| `dup:2f70e47d` | Desktop `BookDropdownView.tsx` ↔ `DropdownView.tsx` (19 lines) — part of dropdown unification epic with ranks 1, 5, 18. |

### Deprioritized noise

Large clone groups under `src/imports/**` (Figma) score high on raw line count but are **down-ranked** here; do not refactor unless promoted into production components.

---

## Regenerate

```bash
npx fallow dupes --format json -q -o /tmp/fallow-dupes.json
# Post-filter with script or manual review to src/ + functions/_shared/
```

