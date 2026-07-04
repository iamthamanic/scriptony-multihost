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
- `StructureTimelineRowShell` — sticky label + content column per row (`heightPx` optional).
- `StructureTimelineStructureRows` — Zeit, Beat, Act, Sequence, Scene (+ Shot when film) as RowShell pairs; cross-track marquee stack width = label + content.
- `StructureTimelineStructureRowLabels` — extracted label chrome from editor.
- `StructureTimelineEditor` — vertical row stack for structure tracks; legacy parallel columns remain for audio/film (#50/#51).
- Playhead overlay spans full timeline height with `left: labelColumnPx`.
- Playwright `.qa/runs/2026-07-04-timeline-row-alignment.spec.ts` — pass.
