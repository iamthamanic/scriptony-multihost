# Debug Report — voicebox-integration-broken

**Date:** 2026-07-13  
**Project:** scriptony-multihost  
**Shell:** tauri  
**Repro grade:** full (live Voicebox HTTP on :17493)

---

## Summary

Voicebox API v2 returns **JSON + async generation**; Scriptony still expected **raw WAV** from `POST /generate` with default engine `qwen` — preset profiles require `qwen_custom_voice`.  
**Confidence:** high

---

## Bug description

| | |
|--|--|
| **Expected** | Character voice preview/TTS works with local Voicebox |
| **Actual** | Stuck on „wird verbunden…“, generate fails silently or with engine mismatch |
| **Steps** | 1. Open character voice modal 2. Select Voicebox profile 3. Play preview |

---

## Evidence

### Live API

```
POST /generate { profile_id, text, language: "de" }
→ 400: Preset profile only supports engine 'qwen_custom_voice', not 'qwen'

POST /generate { ..., engine: "qwen_custom_voice" }
→ 200 JSON { status: "generating", id: "..." }
GET /history/{id} → { status: "completed", audio_path: "..." }
GET /audio/{id} → WAV bytes
```

### Code (before fix)

`generateVoiceboxSpeech` used `resp.arrayBuffer()` on `/generate` — invalid for JSON API.

`engineReady: profiles.length > 0` blocked „Stimme anlegen“ when service was up but profile list empty.

---

## Root cause

Voicebox upstream API changed; Scriptony client was written for an older binary `/generate` contract.

---

## Fix applied

- `voicebox-api.ts`: health, async poll, `/audio/{id}` download, engine from profile
- Provider picker + ElevenLabs direct adapter
- Clone wired to `POST /profiles/{id}/samples`
- `engineReady` = service healthy, not profile count

---

## Regression guard

- `src/lib/api/__tests__/voicebox-api.test.ts` async flow
- `.qa/runs/2026-07-13-voicebox-provider.spec.ts` Playwright mock
