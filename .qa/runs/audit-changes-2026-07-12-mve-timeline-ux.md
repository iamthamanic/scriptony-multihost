# Audit — MVE Timeline UX Polish (2026-07-12)

Scope: uncommitted changes on branch `issue/49-timeline-row-shell-structure` implementing the
3 slices from `.qa/design/mve-timeline-ux-polish.md` (scene-sync debounce/preview, in-scene DnD
reorder, compact empty dialog lane height).

## Files touched by this work

**Slice 1 — Scene-Sync (300ms + live DOM preview)**
- `src/components/audio/AudioTimelineMveTextBlock.tsx` — debounce 800ms → 300ms; live width
  preview on keystroke via `applyMveSceneWidthPreviewPx`, gated to content-driven audio project
  types.
- `src/lib/ripple-engine/preview.ts` — new `applyMveSceneWidthPreviewPx` helper (direct DOM style
  mutation on `[data-scene-id]`, no React state).

**Slice 2 — In-scene DnD reorder**
- `src/lib/mve/resolve-scene-at-timeline-sec.ts` — new `reorderLineOrderIndexes` (pure index math).
- `src/lib/mve/reorder-text-block-in-scene.ts` — new persistence function
  `reorderTextBlockInScene`.
- `src/hooks/useMveLineReorder.ts` — new hook, extracted mutation to keep `useMveLines.ts` under
  the file-size budget.
- `src/hooks/useMveLines.ts` — wires `useMveLineReorder`, exposes `reorderLineInScene`.
- `src/hooks/useMveTextBlockLaneDrop.ts` — same-scene drop now reorders via `onReorderLineInScene`
  instead of falling through to cross-scene move.
- `src/components/timeline/audio/AudioClipLaneContent.tsx` — passes reorder handler/lines/wpm into
  the drop hook; `draggable` enabled when reorder handler present.
- `src/components/structure/timeline/tracks/StructureTimelineAudioLanes.tsx` — wires
  `mve.reorderLineInScene` into the `mveLines` handlers object passed down.

**Slice 3 — Compact empty dialog lane height**
- `src/lib/audio-lane.ts` — new `LANE_UI.heightDialogEmpty` (152px); `resolveLaneHeightPx` gains
  `hasContent` param.
- `src/components/timeline/audio/AudioClipLaneTracks.tsx` — computes `hasContent` per lane, passes
  to `laneHeight` and sidebar.
- `src/components/timeline/audio/AudioClipLaneSidebar.tsx` — accepts `hasContent`, uses it for
  height calc.

**Tests added/updated for this work**
- `src/lib/mve/__tests__/resolve-scene-at-timeline-sec.test.ts` (new, 7 cases)
- `src/lib/mve/__tests__/reorder-text-block-in-scene.test.ts` (new, 3 cases)
- `src/lib/mve/__tests__/mve-dialog-clip-layout.test.ts` (extended `resolveLaneHeightPx` cases)
- `src/components/audio/__tests__/AudioTimelineMveTextBlock.test.tsx` (new DOM-preview case)

## Out of scope (pre-existing uncommitted work in the same tree)

The working tree also carries unrelated, already-uncommitted changes from earlier sessions
(live WPM preview / emotion chips / waveform footer / tag parsing:
`MveDialogClipCard.tsx`, `MveDialogClipHost.tsx`, `MveDialogClipWaveformFooter.tsx`,
`MveEmotionChip.tsx`, `HighlightedTextarea.tsx`, `useMveTextBlockEditor.ts`, `tags.ts`,
`sync-scene-duration-for-mve-content.ts`, `.qa/acceptance/mve-textblock-order-sync.md`,
`.qa/acceptance/mve-textblock-live-wpm-shrink.md`, `.qa/queue/state.json`,
`.qa/runs/ecc-check-2026-07-10.md`). These were not created or modified by this task and are left
untouched.

## Checks run

`npm run verify -- --frontend` (Prettier, ESLint, TypeScript, Vitest, Vite build):

- Prettier (frontend): **PASS**
- ESLint (frontend): **PASS**
- TypeScript (`tsc --noEmit`): **PASS**
- Vitest: **PASS** — 190 test files / 1047 tests passed on the clean full run.
  - One earlier isolated run of `src/components/structure/timeline/mve/__tests__/MveEmotionChip.test.tsx`
    (3 tests, pre-existing file unrelated to this task's slices) showed a flaky
    `ReferenceError: document is not defined` when run inside the full suite alongside other jsdom
    files despite its own `@vitest-environment jsdom` pragma. A second full clean run passed all
    1047 tests including that file — treated as test-isolation flakiness, not a regression caused
    by this change set (file is untouched by any of the 3 slices).
- Vite build: **PASS**

## Manual/behavioral review

- `reorderLineOrderIndexes` is pure index math with unit coverage for front/middle/end/clamped
  targets and no-ops; `reorderTextBlockInScene` only persists lines whose `orderIndex` actually
  changed, minimizing writes.
- Cross-scene move path (`onMoveLineToScene`) is unchanged; in-scene reorder is a new branch in
  `onDrop` gated on `draggedLine.sceneId === targetSceneId && onReorderLineInScene`, so existing
  T32 cross-scene behavior is preserved when the reorder handler isn't wired (backward compatible).
- Live scene-width preview (`applyMveSceneWidthPreviewPx`) is a direct style mutation with no
  React state/ripple; it is self-correcting on the next keystroke and gets overwritten by the
  authoritative width once the debounced backend sync invalidates the timeline query — matches the
  "no ripple per keystroke" requirement.
- `LANE_UI.heightDialogEmpty` (152px) matches the standard `heightCompact`, so empty dialog lanes
  no longer reserve inline-editor space; `hasContent` is computed from both bound audio clips and
  MVE lines, so a lane becomes "compact" only once fully empty.
- No new Appwrite/cloud imports; no frozen paths touched.

## Verdict: **CLEAN**

No blocking issues found in the scope of this task. Ready for `@ecc-check`.
