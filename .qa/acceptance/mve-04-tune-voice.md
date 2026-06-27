# Feature: MVE 0.4: Voice Tune (non-destructive Preset)

<!-- seeded by ecc-runner from issue #15 on 2026-06-27 -->

## Intent

Nutzer erzeugt abgeleitete Stimme aus Basis-VoiceProfile ohne Original zu überschreiben (PRD §6.4).

## Happy Path

- [x] Neues Profile `type=tuned` mit `baseVoiceId` (Basis-Profil-ID)
- [x] Original-Profile unverändert (immer `createMveVoiceProfile`, kein PATCH auf Basis)
- [x] Preview nutzt getunte Settings (speed + source Kokoro via chain)
- [x] Unit test merge logic

## Edge Cases

- [x] Tune ohne Basis / ohne Kokoro → DE-Hinweis
- [x] Tune-of-tune → max 1 Ebene blockiert
- [x] Basis `status=blocked` → Tune disabled

## Regression

- [x] Generate-Section unverändert nutzbar

## Assumptions

- Tune erzeugt neues Profil; Charakter behält aktives Profil nach Tune-Erstellung

## Implementation Notes

- `src/lib/mve/tune/create-tuned-voice-profile.ts`
- `VoiceStudioTuneSection` im Charakterstimme-Modal
- `resolveMveTtsVoiceId(profile, sourceProfile)` für tuned Preview
