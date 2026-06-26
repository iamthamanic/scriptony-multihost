# Feature: T28 — Audio Derivation in Text Block (Generate/Upload/Record)

<!-- seeded by ecc-runner from issue #27 on 2026-06-26 — refined by @implement -->

## Intent
Text blocks created in character dialog lanes (T26) can be turned into audio. A small menu inside the inline editor offers **Generate**, **Upload**, and **Record**. Generate reuses the existing MVE render flow and auto-selects the first successful take. Upload and Record create a new audio clip bound to the text block's `MveLine`. If no scene is linked to the lane, a scene picker is shown first.

## Happy Path
- [x] User clicks a text block → inline editor opens with audio menu.
- [x] User clicks **Generate** when a scene is linked → MVE render runs, audio clip is created, text block becomes a waveform clip.
- [x] User clicks **Upload** and picks a file → file is persisted, audio clip created and bound to `MveLine`.
- [x] User clicks **Record** → browser recorder starts; on stop the file is persisted and bound to `MveLine`.
- [x] After binding, the existing clip cache and timeline queries are invalidated so the UI updates.

## Edge Cases
- [x] No `onBindAudioClip` handler → hook is inactive, menu still renders but actions no-op safely.
- [x] No `projectId` → generate/record/upload show toast "only in open local projects" and do not crash.
- [x] No linked scene → scene picker dialog opens for generate/record; upload queues the file until a scene is picked.
- [x] Cancel scene picker → no action, queued file cleared.
- [x] `syncClipWithSelectedTake` fails → warning toast, but binding succeeds.

## Regression
- [x] Existing text-block editor (T27) still saves text and enhances.
- [x] Existing audio lanes still render bound clips correctly.
- [x] Lane link persistence (T25) still used as default scene.

## Assumptions
- T27 inline editor is already merged and functional.
- Local backend (`LocalBackend`) is available when `projectId` is set.
- `useMveLineRender` handles take auto-selection after render.

## Screenshots
| Step | Filename |
|------|----------|
| 1 | `01-happy-path.png` |

## Implementation Notes
<!-- filled after coding -->
- Added `useMveTextBlockAudio` orchestration hook, split into `useMveTextBlockAudioClip` (clip create/bind/sync) and `useMveTextBlockUploadRecord` (upload/record flows) to stay under file-size limits.
- Added `useMveSceneSelection` for the scene-picker state machine, with memoized return object.
- Added UI components: `MveTextBlockAudioMenu`, `MveAudioActionButton`, `MveSceneSelectDialog` using `role="radiogroup"` + arrow-key navigation.
- Wired into `AudioTimelineMveTextBlock`, `MveTextBlockEditor`, `StructureTimelineAudioLanes`, and `AudioClipLaneContent`.
- Added `bindAudioClip` mutation to `useMveLines`.
- Tests: `useMveTextBlockAudio.test.tsx` (7 cases) and updated `AudioTimelineMveTextBlock.test.tsx`.
