# Feature: Structure Timeline: migrate audio lanes to row-pair shell

<!-- seeded by ecc-runner from issue #50 on 2026-07-14 — @implement may refine -->

## Intent
Audio-Section und jede DAW-Lane als Row-Pair statt getrennte Label-/Scroll-Listen.

## Happy Path
- [ ] - [ ] Audio header/footer als Row-Pair-Zeilen
- [ ] - [ ] Jede Lane: sidebar + content in einer Zeile
- [ ] - [ ] Dialog lane Δ ≤ 2px in Playwright
- [ ] - [ ] Expanded 280/320px heights sync

## Edge Cases
- [ ] (from .qa/edge-cases.md + @implement)

## Regression
- [ ] Feed and topic routes still load

## Assumptions
- none

## Screenshots
| Step | Filename |
|------|----------|
| 1 | `01-happy-path.png` |

## Implementation Notes

- Added `StructureTimelineAudioRowPairs`: header/footer and each DAW lane render as `[sticky label | content]` flex rows inside the shared scroller (#50).
- `StructureTimelineEditor` and QA harness `TimelineRowAlignmentPreviewPage` use row pairs instead of parallel label/scroll columns.
- Playwright `.qa/runs/2026-07-04-timeline-row-alignment.spec.ts`: 3/3 pass (dialog lane Δ ≤ 2px).
- Legacy split exports (`StructureTimelineAudioLaneLabels` / `ScrollRows`) retained for `StructureTimelineAudioLanesStack`.
