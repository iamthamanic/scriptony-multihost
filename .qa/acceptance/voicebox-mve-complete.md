# Feature: Voicebox MVE completeness + boot reliability

## Intent

Close MVE Voice Studio gaps: clone/tune/generate wired for Voicebox, boot timeout + session cache, model download status from `/health`, and clearer empty preset states — desktop-first, minimal diff.

## Preconditions

- Desktop (`npm run dev:desktop`) + `.scriptony` project open
- Voicebox at `http://127.0.0.1:17493` (may cold-start on first use)

## Happy Path

- [ ] Boot wait up to 180s on first connect; subsequent loads within 5 min skip full boot poll when `/health` is healthy
- [ ] Voice list query auto-retries once (~3s) after boot timeout; „Erneut verbinden“ still works
- [ ] `refetchOnWindowFocus` refreshes Voicebox voice queries
- [ ] **Eigene Stimmen**: Clone section visible — consent upload → `requestVoiceClone` → Voicebox `POST /profiles/{id}/samples`
- [ ] **Preset providers** (Kokoro, LuxTTS, Chatterbox, …): Clone section hidden
- [ ] Tune creates non-destructive tuned profile when base has Voicebox voice mapping
- [ ] Generate from description uses current provider catalog + improved German copy/hints
- [ ] Footer shows model status when connected but `model_loaded: false` (German)
- [ ] Empty preset catalog when `engineReady`: „Keine {Engine}-Presets — in Voicebox ggf. Engine installieren“

## Edge Cases

- [ ] `model_downloaded: false` → download hint; `null` → generic first-generate hint
- [ ] Tune blocked on tuned-of-tuned / no base voice — clear German reason
- [ ] Clone hidden on ElevenLabs provider

## Regression

- [ ] `npm run verify -- --frontend` passes

## Implementation Notes

- Boot: `VOICEBOX_BOOT_TIMEOUT_MS` → 180s; `voicebox-ready-cache.ts` (5 min TTL) skips `open -a Voicebox` on warm session; `loadVoiceboxProviderVoicesWithRetry` auto-retries once after 3s on timeout; `retryVoiceboxConnection` clears session cache; `refetchOnWindowFocus` for Voicebox providers.
- Model status: `voicebox-model-status.ts` + `voiceboxModelDownloaded` in `useTtsVoiceProfiles`; hints in `CharacterVoiceSelector` footer and `VoiceProfileEditorModal`.
- Clone: `showClone` gated by `isProfileVoiceProvider` — only **Eigene Stimmen**; existing `requestVoiceClone` → `uploadVoiceboxProfileSample` unchanged.
- Tune: wired via modal; guards unchanged (`resolveMveTtsVoiceId` on base profile).
- Generate: provider-synced catalog via `voiceProvider` state; improved German copy in `VoiceStudioGenerateSection` + `generate-voice-from-description`.
- Empty presets: `Keine {Engine}-Presets — in Voicebox ggf. Engine installieren` in `CharacterVoiceSelector`.
- Tests: boot timeout 180s, model-status, ready-cache.
