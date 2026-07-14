# Acceptance: mve-voice-identity-schema

**Issue:** #55  
**Epic:** `.qa/design/mve-voice-identity-pipeline.md`  
**Feature slug:** `mve-voice-identity-schema`

## Intent

Voice Identity (Creation/Clone) von Performance trennen — `MveVoiceProfile` um Identity-Felder erweitern, `VoiceCreationAdapter` + Registry.

## Happy Path

1. `MveVoiceProfile` hat `creationMode`, `provider`, `model`, `identityPrompt`, Referenz-/Clone-Asset-Felder
2. SQLite v8 Migration legt Spalten an
3. `VoiceCreationAdapter` exportiert `generateCandidates` + `materialize`
4. `resolveVoiceCreationAdapter('qwen-voice-design')` wirft bis Slice #56 (noch kein Adapter)
5. Voicebox: `supportsVoiceGenerationFromPrompt: false`

## Acceptance

- [x] Zod-Schema + Migration v8
- [x] VoiceCreationAdapter Interface + Registry
- [x] Voicebox-Capabilities korrigiert
- [x] `npm run verify -- --frontend` grün

## Implementation Notes

- Schema v8 columns on `mve_voice_profiles`; mapper infers `creationMode` from legacy `profile_type`
- `VoiceCreationAdapter` + `resolveVoiceCreationAdapter()` — providers register in slice #56
- Voicebox: `supportsVoiceGenerationFromPrompt: false`
