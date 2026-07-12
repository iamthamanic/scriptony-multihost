# Feature: MVE Characters — Voice Row + Editor Modal (Mockup #6b)

<!-- updated by /verify-ui on 2026-06-14 — PASS with Playwright evidence -->

## Intent

Charakter-Stimme in der **CharacterCard** als kompakte Zeile („Charakterstimme“ + Play + Edit), nicht als Inline-Formular. **Edit** öffnet `VoiceProfileEditorModal` (MVP 0.1: Stimme, Standard-Satz, Basis-Einstellungen, Beschreibung). DAW-FX und Clip-Editor bleiben unverändert.

Roadmap: MVE Epic — MVP 0.1 Characters/Voice.

## Happy Path

- [x] Pro Charakter (expanded): eine Zeile „Charakterstimme“ + Stimmen-Status + Play + Edit (kein Dropdown/Input inline) — Playwright OK
- [x] Play spielt Standard-Satz (`previewText`) mit zugewiesener Stimme — UI enabled; Audio optional Tauri
- [x] Edit öffnet Modal mit Stimmen-Auswahl, Standard-Satz, Geschwindigkeit, Beschreibung — Playwright OK
- [x] Kokoro-Zuweisung im Modal → `mve_voice_profiles` persistiert — Unit OK
- [x] Generate Audio auf Dialog-Spur nutzt weiter `baseVoiceId` — Code OK (Timeline manuell optional)
- [x] DE UI — Screenshots OK

## Edge Cases

- [x] Charakter ohne Stimme → Play deaktiviert; Modal erlaubt Zuweisung — Screenshot 01
- [ ] Keine Cloud-Session → Hinweis im Charaktere-Bereich — Code OK, nicht in Harness
- [ ] Nicht-local / kein Audio-Projekt → Voice-Zeile ausgeblendet — Code OK
- [x] Modal: Voice Studio 0.4-Abschnitte sichtbar aber disabled — Screenshot 02

## Regression

- [ ] Bearbeiten/Löschen an CharacterCard unverändert
- [x] Dialogtext + Regie am Clip (#5) — Unit grün
- [x] Lane FX-Kette (`TrackFxChain`) unverändert
- [ ] Record/Upload Add Audio

## Assumptions

- Voice-Zeile nur bei Audio/DAW-Projekten + `isLocalProfile()`
- Clone/Tune/Generate-from-description nur als Platzhalter bis MVP 0.4
- UI-Evidence via `#qa-mve-voice` + Playwright (DEV harness)

## Screenshots

| Step | Filename | Status |
|------|----------|--------|
| 1 | `01-character-voice-row.png` | captured |
| 2 | `02-voice-editor-modal.png` | captured |
| 3 | `03-preview-play-row.png` | captured |
| 4 | `04-generate-with-voice.png` | captured (QA page) |

## Implementation Notes

- Phase 1 verify: Unit tests für assign/resolve/preview; Playwright QA harness `#qa-mve-voice`
- Enhance (#7): `apply-enhance-script.test.ts`, sichtbarer Leer-Text-Hinweis im Panel
- Voice preview nutzt ab 0.2 `VoiceEngineAdapter` (Kokoro) statt direktem `synthesizeLocal` im Hook-Pfad
