# Epic: Voicebox Sub-Provider Dropdown (Option A)

## Problem & Intent

Users confuse **Kokoro** as a separate TTS backend. All local engines run through Voicebox HTTP (`:17493`). Provider dropdown should list **one entry per engine family** with **"(via Voicebox)"** suffix; **ElevenLabs** stays separate.

## Non-Goals

- Tune / prompt-generate slices
- SQLite migration (`engine=kokoro` legacy rows remain)
- Standalone Kokoro sidecar (removed)

## Decision (Option A)

| Provider ID | Label | Loads |
|-------------|-------|-------|
| `voicebox` | Eigene Stimmen (via Voicebox) | `GET /profiles` only |
| `qwen_custom_voice` | Qwen (via Voicebox) | presets |
| `kokoro` | Kokoro (via Voicebox) | presets |
| `luxtts` | LuxTTS (via Voicebox) | presets |
| `chatterbox` | Chatterbox (via Voicebox) | presets |
| `chatterbox_turbo` | Chatterbox Turbo (via Voicebox) | presets |
| `tada` | TADA (via Voicebox) | presets |
| `elevenlabs` | ElevenLabs | cloud API |

Persist on assign: `kokoro` → `engine=kokoro`; presets + profiles → `engine=voicebox` (except kokoro provider).

## Runtime

| Axis | Scope |
|------|-------|
| Desktop / local | yes |
| Cloud session | no |
| Tauri Voicebox launch | unchanged |

## Paths

- `src/lib/config/voice-providers.ts`
- `src/lib/config/voice-engine.ts`
- `src/hooks/useTtsVoiceProfiles.ts`
- `src/components/audio/CharacterVoiceSelector.tsx`
- `src/lib/api/voicebox-api.ts`
