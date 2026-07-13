# Debug Report — voice-design-auto-play-slow

**Date:** 2026-07-13  
**Project:** scriptony-multihost  
**Shell:** tauri (desktop, local runtime)  
**Repro grade:** code-confirmed + unit tests (live Voicebox not re-run for this fix)

---

## Summary

"Stimme erzeugen" was slow and played preview audio without user action because `previewVoiceDesignCandidates()` eagerly ran **3× `generateVoiceboxSpeech`** (TTS `/generate`) sequentially after creating each designed profile. The UI already uses live TTS on explicit "Anhören" via `playVoiceDesignCandidateLive()`; `previewAudioPath` was never consumed in the UI.

**Confidence:** high

---

## Bug description

| | |
|--|--|
| **Expected** | "Stimme erzeugen" creates three voice candidates quickly; audio plays only when user clicks "Anhören" |
| **Actual** | Generation takes very long; preview sentence plays automatically during candidate creation |
| **Steps** | 1. Open Charakterstimme modal 2. Enter description 3. Click "Stimme erzeugen" |

---

## Evidence

### Call chain

```
VoiceProfileEditorModal.handleDesignFromDescription
  → previewVoiceDesignCandidates()
      → ensureVoiceboxSidecar()
      → loop 3×:
          createDesignedVoiceboxProfile()   // POST /profiles (designed)
          generateVoiceboxSpeech()          // POST /generate + poll + WAV save  ← removed
```

### Code (before fix)

`src/lib/mve/casting/preview-voice-design-candidates.ts` lines 79–93: after each profile creation, `generateVoiceboxSpeech` was called with `previewText`, `engine: "qwen_custom_voice"`, and `seed: 1000 + index`.

### Playback path analysis

| Path | Trigger | Used by UI? |
|------|---------|-------------|
| `generateVoiceboxSpeech` during design | "Stimme erzeugen" | No — only sets `previewAudioPath` on candidate |
| `playVoiceDesignCandidateLive` | "Anhören" button | Yes — `VoiceProfileEditorModal.handlePlayDesignCandidate` |
| `playVoiceDesignCandidateAudio` | — | Defined but **never imported** elsewhere |

`generateVoiceboxSpeech` does not call `audio.play()` in Scriptony. Unwanted audio during design is consistent with Voicebox sidecar processing `/generate` (system audio output) while Scriptony awaited each generation sequentially.

### `save-voice-design-candidate.ts`

Does **not** reference `previewAudioPath`. Save flow uses `voiceboxProfileId` + `updateVoiceboxProfile` + MVE assign only.

---

## Root cause

Eager TTS during candidate preview was redundant (UI plays on demand) and expensive: 3 profile designs + 3 full TTS generations in series ≈ 6× Voicebox round-trips. Each `/generate` triggers model inference and may emit audible output from the Voicebox process.

---

## Fix applied

- **`preview-voice-design-candidates.ts`**: Removed `generateVoiceboxSpeech` loop and `previewAudioPath` assignment; candidates now only carry `voiceboxProfileId` + labels. Progress bar span adjusted (10–90% for profile creation).
- **`preview-voice-design-candidates.test.ts`**: Assert `generateVoiceboxSpeech` is **not** called; `previewAudioPath` undefined.
- **`mve-voice-design-preview.spec.ts`**: Track `generatePostCount`; assert `0` after design (profiles still ≥ 3).

No change to `VoiceProfileEditorModal` or `playVoiceDesignCandidateLive` — explicit preview unchanged.

---

## Regression guard

- `src/lib/mve/casting/__tests__/preview-voice-design-candidates.test.ts`
- `.qa/runs/mve-voice-design-preview.spec.ts` (`generatePostCount === 0`)
- `npm run verify -- --frontend`

---

## Residual risk

Low: If Voicebox `POST /profiles` (designed) itself emits audio, auto-play could persist — not observed in code path; would be upstream Voicebox behavior.
