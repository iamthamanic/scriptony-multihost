# Epic Design: Structure Timeline Row-Pair Layout (Slice 2)

<!-- from @pingpong-solution / feature-intake — 2026-07-04 -->

## Problem & Intent

Track-Labels und Lane-Inhalte in der Structure Timeline sollen **zeilenweise im DOM gekoppelt** sein (CapCut/FL Studio), nicht als zwei unabhängige Listen mit impliziter Höhen-Synchronisation.

**Slice 1 (done):** Film-Reihenfolge-Bug + Audio-Section-Chrome-Symmetrie + Playwright-Alignment.

**Slice 2 (this epic):** Architektur-Refactor auf Row-Pair-Shell, damit neue Zeilen nicht mehr aus der Reihe tanzen können.

## Non-Goals

- Trim/Ripple/Marquee/Transport neu schreiben
- Playhead-Autorität ändern (`scrollRef`, `--playhead-left-px`)
- Cloud/Appwrite-Pfade
- MVE-Card-internes Scroll (Enhance-Panel) — optional Slice 3

## Assumptions

- Labels bleiben **horizontal fix**; nur Lanes scrollen horizontal (CapCut-Stil)
- Ein gemeinsamer `scrollRef` für horizontales Scrollen aller Content-Zeilen bleibt
- `StructureTimelineEditor.tsx` soll schrumpfen (T50)

## Options Considered

### A — YAGNI: nur Slice 1 (done)

Stop after alignment patches. Risk: every new track requires manual left/right sync.

### B — Row-Pair Shell (chosen)

```
verticalScrollRef
  horizontalScrollRef (scrollRef — playhead)
    for each row:
      flex row [sticky label 248px | content width totalWidthPx]
```

Reuse pattern from `StructureTimelineAudioLanesStack` (already pairs label+content per stack).

### C — CSS Subgrid two-column

Keep two columns; shared `grid-template-rows`. Still fragile for order; rejected.

## Decision

**Option B** — staged migration:

1. Introduce `StructureTimelineRowShell` (label slot + content slot, shared row height)
2. Migrate structure tracks (Beat → Scene → Shot)
3. Migrate audio section (per-lane rows + section chrome as rows)
4. Migrate film production rows (Clip, Musik, SFX)
5. Remove legacy parallel label column from `StructureTimelineEditor`

## Runtime Matrix

| Area | Local desktop | Cloud session | Appwrite |
|------|---------------|---------------|----------|
| Layout shell | yes | n/a | frozen |
| Marquee/trim refs | yes | n/a | frozen |

## Implementation Sketch

```
Affected paths:
  src/components/structure/timeline/StructureTimelineRowShell.tsx (new)
  src/components/structure/timeline/StructureTimelineEditor.tsx (shrink)
  src/components/structure/timeline/tracks/StructureTimelineAudioLanes.tsx
  docs/STRUCTURE_TIMELINE.md (layout + glossary)

Tests:
  .qa/runs/2026-07-04-timeline-row-alignment.spec.ts (extend)
  Manual Tauri smoke after migration

New dependencies: none
Estimated scope: ~500–800 LOC moved/refactored
```

## Cross-Domain Sign-Off

| Domain | Status |
|--------|--------|
| KISS | ⚠️ larger refactor, justified after Slice 1 |
| SOLID | ✅ single row abstraction |
| UI/UX | ✅ alignment by construction |
| Testability | ✅ Playwright Y-delta checks |
| Maintainability | ✅ T50-compatible |

## Confidence

82% — Marquee/selection `containerRef`s need careful migration smoke.

## Ready for /implement?

**YES** after Slice 1 merged and Tauri smoke documented.

## Research

- Code: `StructureTimelineEditor.tsx` ~5285+, `StructureTimelineAudioLanesStack`
- Acceptance: `.qa/acceptance/timeline-row-alignment.md` (Slice 1)
