# Feature: Voicebox sub-provider dropdown (Option A)

## Intent

Provider dropdown lists **Eigene Stimmen (via Voicebox)** plus each Voicebox preset engine **(via Voicebox)** and **ElevenLabs**. No misleading standalone Kokoro backend. One preset API call per provider selection.

## Preconditions

- Desktop + `.scriptony` project open
- Voicebox at `http://127.0.0.1:17493`

## Happy Path

- [ ] Provider dropdown: Eigene Stimmen (via Voicebox), Qwen/Kokoro/LuxTTS/Chatterbox/TADA (via Voicebox), ElevenLabs
- [ ] Eigene Stimmen loads only user profiles; Clone/Anlegen CTA visible when empty
- [ ] Each preset provider loads only its preset catalog
- [ ] Assign persists correct `engine` (kokoro vs voicebox)
- [ ] Erneut verbinden still works for Voicebox providers
- [ ] Legacy `engine=kokoro` opens Kokoro (via Voicebox) provider

## Edge Cases

- [ ] Empty preset list → hint, no crash
- [ ] ElevenLabs without key → disabled voices + hint

## Regression

- [ ] `npm run verify -- --frontend` passes

## Implementation Notes

- Option A: provider dropdown = Eigene Stimmen + each `VOICEBOX_PRESET_ENGINES` entry with `(via Voicebox)` suffix + ElevenLabs.
- `VoiceProviderId` in `voice-providers.ts`; `useTtsVoiceProfiles({ provider })` loads one catalog per selection.
- Clone/Anlegen CTA only when `provider === "voicebox"`.
- `persistedEngineForProvider`: kokoro → `engine=kokoro`, presets → `engine=voicebox`.
- Retry „Erneut verbinden“ unchanged.
