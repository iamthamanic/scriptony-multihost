# Feature: Structure Timeline: film rows in RowShell; remove parallel label column

<!-- seeded by ecc-runner from issue #51 on 2026-07-14 — @implement may refine -->

## Intent
Film-Zeilen (Shot/Clip/Musik/SFX) in RowShell; parallele Label-Spalte entfernen; Editor shrink (T50).

## Happy Path
- [ ] - [ ] Film row order korrekt im Row-Stack
- [ ] - [ ] Keine parallele Label-Spalte
- [ ] - [ ] Tauri `#qa-timeline-row-alignment-tauri` PASS
- [ ] - [ ] docs/STRUCTURE_TIMELINE.md Layout-Abschnitt

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

- `StructureTimelineFilmProductionRowPairs`: Clip/Musik/SFX each render as `[sticky label | content]` flex rows (#51).
- Removed parallel film label column block from `StructureTimelineEditor` (~130 LOC shrink).
- `docs/STRUCTURE_TIMELINE.md`: row-pair layout section added.
- Playwright alignment 3/3 pass.
