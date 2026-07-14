# Feature: Voicebox preset catalog + provider dropdown

## Intent

Scriptony exposes three TTS providers in the character voice UI: **Voicebox** (user profiles + non-Kokoro presets), **Kokoro** (Kokoro presets only via Voicebox), and **ElevenLabs** (always visible, disabled without API key). Preset catalogs load live from Voicebox `GET /profiles/presets/{engine}` for all known engines. TTS, preview, clone, and character assignment work end-to-end for each provider path. Tune and prompt-generate remain out of scope.

## Preconditions

- Desktop shell (`npm run dev:desktop`) with a local `.scriptony` project open
- Voicebox reachable at `VITE_VOICEBOX_BASE_URL` (default `http://127.0.0.1:17493`)
- Optional: `VITE_ELEVENLABS_API_KEY` in `.env.local` for ElevenLabs voice list

## Happy Path

- [x] Provider dropdown shows **Voicebox**, **Kokoro**, and **ElevenLabs**
- [x] ElevenLabs option is always visible; voice select disabled with hint when no API key
- [x] **Voicebox** provider lists user profiles from `GET /profiles` plus non-Kokoro presets (Qwen, LuxTTS, Chatterbox, etc.) with labels like `Qwen — …`
- [x] **Kokoro** provider lists only Kokoro presets from `GET /profiles/presets/kokoro` with labels like `Kokoro — Bella`
- [ ] Selecting a preset and assigning creates/resolves a Voicebox profile and persists `baseVoiceId` + `engine`
- [ ] Preview plays audio for Voicebox, Kokoro, and ElevenLabs selections
- [ ] TTS generation (`useTtsGeneration` / `LocalAiService`) resolves preset/profile ids correctly
- [ ] Voice clone uploads samples to Voicebox for `engine=voicebox` profiles
- [x] Legacy SQLite rows with `engine=kokoro` still route through Voicebox adapter

## Edge Cases

- [x] Voicebox offline → provider shows connection error, no crash
- [x] Empty preset catalog for an engine → provider still usable (profiles or other engines)
- [x] ElevenLabs without key → provider selectable but voice dropdown disabled with env hint
- [x] Kokoro provider: no “create profile” CTA (presets only)
- [x] Preset id `preset:engine:voiceId` deduped against existing profile ids

## Regression

- [x] `npm run verify -- --frontend` passes
- [x] Existing Voicebox profile assignment unchanged
- [ ] ElevenLabs adapter path unchanged
- [x] No new Appwrite/cloud TTS paths

## Assumptions

- Voicebox preset API shape: `{ voices: [{ id|voice_id, name }] }`
- Known preset engines: `qwen_custom_voice`, `kokoro`, `luxtts`, `chatterbox`, `chatterbox_turbo`, `tada`
- Kokoro has no standalone sidecar; all Kokoro TTS goes through Voicebox HTTP API
- Clone applies only to Voicebox user profiles, not Kokoro preset selections

## Screenshots

- `.qa/evidence/voicebox-preset-provider-catalog/01-provider-dropdown.png`
- `.qa/evidence/voicebox-preset-provider-catalog/02-voicebox-voices.png`
- `.qa/evidence/voicebox-preset-provider-catalog/03-kokoro-voices.png`
- `.qa/evidence/voicebox-preset-provider-catalog/04-elevenlabs-disabled.png`
- `.qa/evidence/voicebox-preset-provider-catalog/05-preview-button.png`
- `.qa/evidence/voicebox-preset-provider-catalog/06-voicebox-offline.png`

## Implementation Notes

- Added `kokoro` as third `LocalVoiceEngineId`; `resolveVoiceEngineId("kokoro")` preserves legacy SQLite rows on Kokoro provider.
- `VOICEBOX_PRESET_ENGINES` expanded to `qwen_custom_voice`, `kokoro`, `luxtts`, `chatterbox`, `chatterbox_turbo`, `tada`.
- Split catalog loaders: `listVoiceboxProviderVoiceEntries()` (profiles + non-Kokoro presets), `listKokoroPresetVoiceEntries()` (Kokoro only).
- `useTtsVoiceProfiles` routes by provider; `CharacterVoiceSelector` shows Voicebox / Kokoro / ElevenLabs with preset resolution for both Voicebox sidecar providers.
- Preview/TTS: `usesVoiceboxSidecar()` + registry `kokoro → voicebox` adapter unchanged for render path.
- Clone remains `engine=voicebox` only (Kokoro presets are not clonable).
- Tests: `voice-engine.test.ts`, `voice-providers.test.ts`, extended `voicebox-api.test.ts`.
- Validation: `npm run verify -- --frontend` — PASS (2026-07-13).
- Limitations: Tune/prompt-generate out of scope; live preset availability depends on Voicebox install; ElevenLabs voice select disabled without `VITE_ELEVENLABS_API_KEY` (provider always listed).
- Voicebox offline retry: `CharacterVoiceSelector` shows **Erneut verbinden** when `engineError` is set for Voicebox/Kokoro; `retryVoiceboxConnection()` clears `voicebox-launch-guard` cooldown and refetches `useTtsVoiceProfiles` so stale sidecar errors clear once Voicebox is healthy again.
