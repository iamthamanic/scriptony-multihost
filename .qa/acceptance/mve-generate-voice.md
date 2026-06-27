# Feature: MVE 0.4 — Stimme aus Beschreibung (Attribute Matching)

## Happy Path
- [x] Beschreibung → valide `MveVoiceAttributes` (rules-based)
- [x] Matcher wählt Kokoro-Voice und persistiert `type=generated`
- [x] Unit tests für Matcher (4 Fixtures)
- [x] Preview nutzt neue Voice via `resolveMveTtsVoiceId`

## Edge Cases
- [x] Kein Katalog-Match → DE-Hinweis + nächstbeste Stimme
- [x] Leere Beschreibung → Button disabled
- [x] Kokoro offline → Toast, kein Crash (Katalog-Fallback)

## Implementation Notes
- `src/lib/mve/casting/` — extract, match, generate
- `VoiceStudioGenerateSection` + Modal wiring
