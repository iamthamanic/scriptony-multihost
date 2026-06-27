# Feature: T32 — Drag & Drop Text Block Between Scenes

<!-- seeded by ecc-runner from issue #31 on 2026-06-27 — @implement may refine -->

## Intent
From GitHub issue #31: T32 — Drag & Drop Text Block Between Scenes

## Happy Path
- [ ] Text block draggable from dialog lane when not editing
- [ ] Drop on another scene region moves MveLine.sceneId
- [ ] Bound audio clip follows (sceneId + startSec/endSec)
- [ ] Text block re-renders in target scene column

## Edge Cases
- [ ] Drop outside scene → no-op
- [ ] Drop on same scene → no-op
- [ ] Audio longer than target scene → T29 extend ripple (best effort)

## Regression
- [ ] Feed and topic routes still load
- [ ] Inline text edit + audio menu still work

## Assumptions
- Local desktop runtime only
- Scene timing from structure timeline sceneBlocksRef

## Screenshots
| Step | Filename |
|------|----------|
| 1 | `01-text-block-drag-drop.png` |

## Implementation Notes
- `move-text-block-to-scene.ts` + `resolve-scene-at-timeline-sec.ts`
- `sceneId` patch on MveLine + AudioClip local repos
- DnD: `AudioTimelineMveTextBlock` + `useMveTextBlockLaneDrop`
- Scene-aligned text block layout via `textBlockTimingForLine`
