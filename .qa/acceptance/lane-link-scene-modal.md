# Feature: T30 — Lane Link Icon + Scene Selection Modal

<!-- seeded by ecc-runner from issue #29 on 2026-06-27 — @implement may refine -->

## Intent
From GitHub issue #29: T30 — Lane Link Icon + Scene Selection Modal

## Happy Path
- [ ] Link-Icon erscheint in Dialog-Spur-Header neben Delete
- [ ] Klick öffnet Modal mit Act → Sequence → Scene Baum
- [ ] Auswahl speichert Lane-Link; Header zeigt Szenenname
- [ ] Neue Text-Blöcke nutzen verknüpfte Szene als Default

## Edge Cases
- [ ] Gelöschte/verschobene Szene → Warnfarbe im Link-Indicator
- [ ] Verknüpfung entfernen löscht Lane-Link

## Regression
- [ ] Feed and topic routes still load
- [ ] T28 Szene-Auswahl bei Generate/Upload/Record unverändert

## Assumptions
- Local desktop runtime only (`useMveLaneLinks` / `LocalMveLaneLinkRepository`)
- Shot-Auswahl optional (P2) — nur Scene für audio/book

## Screenshots
| Step | Filename |
|------|----------|
| 1 | `01-lane-link-modal.png` |

## Implementation Notes
- `MveLaneLinkModal` + `buildStructurePickerTree` für hierarchische Auswahl
- Link-Button in `TrackTransportToggles`; Status in `TrackCharacterRow`
- Wired via `StructureTimelineAudioLanes` → `AudioClipLaneSidebar` → `useMveLaneLinks`
- Unit tests: `structure-picker-tree.test.ts`
