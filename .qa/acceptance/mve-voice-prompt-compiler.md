# Feature: MVE Voice Prompt Compiler (Provider + Render Params)

<!-- design: .qa/design/mve-voice-design-studio.md — Slice D (deferred P2) -->

## Intent

Provider-spezifische Kompilierung aus `MveVoiceDesignSpec` + technische Render-Parameter; Voicebox Adapter markiert `supportsVoiceGenerationFromPrompt`.

## Happy Path

- [x] `compileForProvider("voicebox")` → `designPrompt` + render settings
- [x] Qwen → `instruct` string
- [x] ElevenLabs frozen stub hint
- [x] `voicebox.adapter.ts` — `supportsVoiceGenerationFromPrompt: true`

## Non-Goals

- Kein ElevenLabs Voice Design Pfad
- Keine neuen Cloud Functions

## Tests

- `voice-prompt-compiler.test.ts` (unit)
