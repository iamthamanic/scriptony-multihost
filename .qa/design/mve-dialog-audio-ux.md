# Epic: MVE Dialog Audio UX (Duration, Scene Sync, Waveform)

## Problem & Intent

MVE dialog clips show **WPM in header and audio duration in footer** even when audio is bound; users expect **one duration chip in the header** (audio replaces WPM). Footer should show **real waveform peaks**, not placeholder bars. Text blocks can render **wider than the pink scene shell** when audio duration exceeds synced scene length or peaks are missing.

## Non-Goals

- Full thestuu-style polygon playlist overview in this slice
- WaveSurfer in inline footer (defer)
- Cloud TTS waveform paths

## Decision

1. **Header chip:** When `line.audioClipId` + `audioDurationSec > 0` → show `variant="audio"` in header; hide WPM chip. Footer shows waveform only (no duplicate duration chip).
2. **Peaks:** Persist `waveformData` from `persistClipAudioFile().peaks` on MVE upload/record/updateClip path.
3. **Scene sync:** After bind, `requiredEndSec = max(visual WPM end, clip.endSec)` (already partially via `resizeSceneForContent`; ensure clip width uses synced scene bounds).

## Runtime matrix

| Area | Local desktop | Cloud |
|------|---------------|-------|
| Duration chip UX | yes | n/a |
| Peaks on upload | yes | defer |
| Scene grow | yes (content-driven) | n/a |

## Implementation sketch

- `MveDialogClipCard.tsx` — header chip logic
- `MveDialogClipWaveformFooter.tsx` — remove footer duration overlay when header shows audio
- `useMveTextBlockAudioClip.ts` — `waveformData: peaks` on updateClip
- Tests: card header, footer, audio clip hook
- Update `.qa/acceptance/mve-dialog-duration-chips.md`
