# Feature: T31 — Recording Metronome + Settings Modal

<!-- seeded by ecc-runner from issue #30 on 2026-06-27 — @implement may refine -->

## Intent
From GitHub issue #30: T31 — Recording Metronome + Settings Modal

## Happy Path
- [ ] Metronom-Button in Audio-Spuren-Header öffnet Einstellungs-Modal
- [ ] BPM, Takt, Count-in-Schläge speicherbar (localStorage pro Projekt)
- [ ] 3-Klick-Count-in vor Lane-Recording (120 BPM default)
- [ ] Count-in auch bei MVE-Textblock-Recording

## Edge Cases
- [ ] BPM = 0 → ein einzelner Klick
- [ ] Abbrechen während Count-in (R erneut) → keine Aufnahme

## Regression
- [ ] Feed and topic routes still load
- [ ] Upload/Generate ohne Count-in unverändert

## Assumptions
- Local desktop runtime only
- Web Audio API verfügbar im Tauri WebView

## Screenshots
| Step | Filename |
|------|----------|
| 1 | `01-metronome-modal.png` |

## Implementation Notes
- `metronome-config.ts` + `metronome-count-in.ts` (scheduling + Web Audio)
- `MetronomeSettingsModal` / `MetronomeSettingsButton` in timeline audio header
- `useAudioRecording` count-in gate; `useMetronomeSettings` persistence
- Unit tests: `metronome-count-in.test.ts`
