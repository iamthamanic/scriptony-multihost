# Feature: MVE 0.4: Voice Clone Request

<!-- seeded by ecc-runner from issue #14 on 2026-06-27 -->

## Intent

Voice Clone als Request-Flow nach verified Consent + Referenz-Upload (PRD MVP 0.4).

## Happy Path

- [x] Clone startet nur mit verified Consent (`canStartVoiceClone`)
- [x] VoiceProfile `type=cloned` mit lifecycle `processing` → `ready`
- [x] `mve_voice_requests` Record mit `operationType=clone`
- [x] Cloud-Route `/voices/clone` validiert Input (Zod)

## Edge Cases

- [x] Ohne Consent → DE-Fehler / 403 cloud
- [x] Kein Clone-Provider → local stub ohne Crash
- [x] Re-Clone bump `version` auf Profil

## Regression

- [x] Consent-Upload (#13) unverändert nutzbar

## Implementation Notes

- `src/lib/mve/clone/request-voice-clone.ts`
- `VoiceStudioCloneSection` — **Klonen starten**
- `functions/scriptony-audio-story/routes/voices-clone.ts`
