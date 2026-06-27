# Feature: MVE 0.4: Schema VoiceConsent + Voice-Operation-Typen

<!-- seeded by ecc-runner from issue #11 on 2026-06-27 — @implement may refine -->

## Intent
Zod-Schemas und lokale Persistenz für VoiceConsent sowie strukturierte Inputs für Generate, Clone und Tune — Grundlage für Voice Studio 0.4.

## Happy Path
- [x] Zod-Schemas exportiert und getestet
- [x] SQLite CRUD VoiceConsent lokal
- [x] Kein React/TTS in schema/
- [x] api-adapter dispatchByRuntime für Consent-Reads

## Edge Cases
- [x] Mehrfach-Consent pro Voice → neueste verified gewinnt (`getLatestVerifiedVoiceConsent`)
- [x] Consent rejected/blocked → Status auf Record speicherbar

## Implementation Notes
- `voice-consent.ts`, `voice-operations.ts` under `src/lib/multi-voice-engine/schema/`
- SQLite v6: `mve_voice_consents`, `mve_voice_requests`
- `LocalMveVoiceConsentRepository` + adapter read/create via `mve-adapter.ts`
