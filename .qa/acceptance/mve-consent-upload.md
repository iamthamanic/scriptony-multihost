# Feature: MVE 0.4: Consent-Flow + Referenz-Audio-Upload

<!-- seeded by ecc-runner from issue #13 on 2026-06-27 — @implement may refine -->

## Intent

Pflicht-Consent und sicherer Referenz-Audio-Upload für Voice Cloning (PRD §6.3, §20).

## Happy Path

- [x] Consent-Record mit version + hash persistiert
- [x] Upload validiert Format/Größe
- [x] Ohne verified Consent kein Clone-Start
- [x] Unit test hash + consent state machine

## Edge Cases

- [x] Widerruf setzt consentStatus auf revoked und sperrt Clone
- [x] Ungültiges Format / zu kurze Datei → DE-Fehlermeldung

## Regression

- [x] Feed and topic routes still load

## Assumptions

- none

## Screenshots

| Step | Filename            |
| ---- | ------------------- |
| 1    | `01-happy-path.png` |

## Implementation Notes

- `src/lib/mve/safety/*` — consent hash, upload validation, persist to `assets/voice-refs/`
- `VoiceStudioCloneSection` + `VoiceStudioConsentForm` in Charakterstimme-Modal
- `canStartVoiceClone` guard for downstream clone slice (#14)
