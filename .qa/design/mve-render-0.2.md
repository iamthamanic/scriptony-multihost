# Design: MVE Render Layer 0.2 (Adapter + Takes)

<!-- generated for GitHub intake — source: docs/multi-voice-engine.md MVP 0.2, §12.7, §22.3, §25 -->

## Problem & Intent

MVP 0.1 liefert Editor, VoiceProfile-Zuweisung und Kokoro-Preview — aber **direkt an Kokoro gebunden** (`local-tts-api.ts`, Tauri `kokoro.rs`). PRD MVP 0.2 führt die **modulare Render-Schicht** ein: Jobs mit Snapshots, `VoiceEngineAdapter`, Dummy + echter TTS-Adapter, Takes speichern und auswählen.

**Ziel:** UI und Render-Orchestrierung sprechen **keine Engine mehr direkt** an; Routing über `VoiceProfile.engine` + Adapter-Registry.

## Non-Goals (0.2)

- Scene Mix / Export (MVP 0.3)
- Voice Clone / Tune / Generate (MVP 0.4 — #11–#16)
- Performance Reference (0.5)
- Cloud Render als Pflicht (local-first; Cloud-Adapter optional stub)
- Piper/OpenVoice als zweite Engine (nach KokoroAdapter-Refactor trivial)

## Architecture

```
UI (Timeline Clip)
  → mve-render-adapter / dispatchByRuntime
  → render-line.ts (Snapshot + Job lifecycle)
  → resolveAdapter(profile.engine)
  → KokoroAdapter | DummyAdapter | …
  → Take persist + Line.selectedTakeId
```

## Depends on (repo)

- #3 Schema (closed), #4 SQLite (closed), #5 Dialog-Editor (closed)
- #6 Characters/Voice (open) — Preview bleibt bis KokoroAdapter; Render-UI kann parallel
- #7 Enhance (open) — nicht blockierend für Adapter

## Blocks (downstream)

- MVP 0.3 Scene Mix
- MVP 0.4 Clone (#14) — `VoiceEngineAdapter.cloneVoice?` Interface aus 0.2
- `tickets/todo-T65-plan-mve-openvoice-integration-eval.md`

## Ponytail Rung 1 (MVP cut)

| PRD | In 0.2 Issues | Deferred |
|-----|---------------|----------|
| 1–5 Takes pro Line | Ja (konfigurierbar 1–3 MVP) | Variation seeds UI |
| Dummy Adapter | Ja | — |
| Echter TTS Adapter | KokoroAdapter only | Piper, ElevenLabs render |
| STT text-back | Nein | 0.2+ später |

## Key paths (planned)

```
src/lib/multi-voice-engine/
  schema/audio-job.ts, take.ts, render-line.ts
  adapters/voice-engine-adapter.ts, registry.ts
  adapters/dummy.adapter.ts
  adapters/kokoro.adapter.ts
  render/create-render-job.ts, render-line.ts, select-take.ts
src/lib/api-adapter/mve-render-adapter.ts
src/backend/local/LocalMveRenderRepository.ts
```

## References

- PRD: `docs/multi-voice-engine.md` §12.7, §21 MVP 0.2, §22.3, §25.1–25.5
- Today (refactor source): `src/lib/api/local-tts-api.ts`, `src-tauri/src/commands/kokoro.rs`, `useMveVoicePreview.ts`
