# Feature: Structure Timeline: introduce RowShell and migrate Beat–Scene rows

<!-- seeded by ecc-runner from issue #49 on 2026-07-04 — @implement may refine -->

## Intent
Einführung von `StructureTimelineRowShell` (Label-Slot + Content-Slot pro Zeile) und Migration der Structure-Tracks Beat, Act, Sequence, Scene.

## Happy Path
- [ ] - [ ] Jede Structure-Zeile ist ein DOM-Paar `[label | content]`
- [ ] - [ ] Vertikal ein Row-Stack; horizontal ein gemeinsamer scrollRef
- [ ] - [ ] Labels horizontal fix
- [ ] - [ ] Playwright Beat/Akt alignment Δ ≤ 2px
- [ ] - [ ] Marquee/trim Beat/Act regression grün

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

**2026-07-05 — REVERTED.** First RowShell integration moved the label column
*inside* the horizontal `scrollRef`. That shifted the timeline coordinate
origin by the label width (248px/96px) and broke every consumer that assumes
scroll content starts at timeline x=0:

- `src/hooks/timeline/timeline-scrub-utils.ts` (`timeSecFromTimelineClientX`,
  `playheadLeftPxFromTimeSec`) — playhead seek/scrub off by label width
- Marquee stacks (`structureStackRef`, `beatStackRef`) — selection offset
- Lane content vs sidebar visually shifted

Editor layout restored to two-column state (labels outside horizontal scroll,
Slice-1 fixes re-applied: film label order, testids, metronome mirror).

**Blocker for redesign:** RowShell needs either (a) offset-aware scrub/marquee
utils (`labelOffsetPx` threaded through transport, trim engine, marquee), or
(b) labels rendered as overlay outside the scroll coordinate system.
→ back to `needs-design`.
