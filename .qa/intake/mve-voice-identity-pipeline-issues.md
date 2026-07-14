# Issue draft: MVE Voice Identity Pipeline

**Epic:** `.qa/design/mve-voice-identity-pipeline.md`  
**Status:** CREATED — 2026-07-14  
**Supersedes (Backend):** Voicebox A2-Strategie aus `mve-voice-design-studio` — UI-Slices bleiben wiederverwendbar.

| GH | Title | Prio | dependsOn |
|----|-------|------|-----------|
| #54 | Spike: Qwen3 VoiceDesign runtime and local API contract | P0 | — |
| #55 | MVE schema: voice identity fields and VoiceCreationAdapter | P0 | — |
| #56 | Qwen VoiceDesign provider: generate candidates endpoint | P0 | #54, #55 |
| #57 | Materialize designed voice: save WAV and Qwen Base clone | P0 | #56 |
| #58 | Migrate voice design casting to VoiceCreationAdapter | P1 | #57 |
| #59 | Line render: identity plus LineDirection instruct on TTS | P1 | #55 |
| #60 | ElevenLabs Voice Design adapter (cloud hybrid, deferred) | P2 | #55, #58 |

JSON: `.qa/intake/mve-voice-identity-pipeline-issues.json`

## MVP cut (nicht als Issue)

- Ordner-Move `lib/mve/casting` → `multi-voice-engine/casting`
- Migration alter Voicebox-`designed` Profile
- Timeline LineDirection-Editor UI
- Voicebox-Fork / upstream #703

## Nach Approval

```bash
bash "$HOME/.cursor/skills/feature-intake/scripts/create-github-issues.sh" \
  .qa/intake/mve-voice-identity-pipeline-issues.json
```

Danach separat: **`@ecc-runner`**
