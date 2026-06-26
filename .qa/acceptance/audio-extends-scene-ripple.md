# Feature: T29 — Ripple: Extend Scene + Parents for Longer Audio

<!-- Issue #28 — local desktop only -->

## Intent

When audio derived from a text block (Generate/Upload/Record, T28) is longer than its scene container, extend the scene and ripple-shift sequences, acts, and following scenes so the timeline stays consistent.

## Happy Path

- [ ] After binding audio, if `clip.endSec` exceeds the scene's structural end, the scene grows by the delta.
- [ ] Following scenes in the same sequence shift right by the delta.
- [ ] Parent sequence/act durations grow accordingly.
- [ ] Clips in shifted scenes get updated `startSec`/`endSec` in local SQLite.

## Edge Cases

- [ ] Delta = 0 when clip fits within scene → no-op.
- [ ] Missing scene in tree → skip with warning, no crash.
- [ ] Structure ripple blocked (locked) → skip structure persist, still attempt clip ripple if applicable.
- [ ] Project grows past base duration when needed.

## Regression

- [ ] T28 audio derivation still works when scene already fits.
- [ ] Manual clip trim ripple unchanged.

## Assumptions

- Local desktop runtime with hierarchical structure ripple enabled.
- Scene timing comes from `buildTimelineTree` (pct metadata), not clip-derived bounds.

## Screenshots

| Step | Filename                            |
| ---- | ----------------------------------- |
| 1    | `01-scene-extended-after-audio.png` |

## Implementation Notes

- `extendSceneForAudio` in `src/lib/structure/extend-scene-for-audio.ts`: structure resize via `resizeStructureItem` + `persistStructureRipplePatchesLocal`, then clip ripple via `calculateRipple` with containers from `buildRippleContainersFromTree`.
- Wired in `useMveTextBlockAudioClip.cacheAndBind` after MVE line bind; invalidates timeline bundle + audio queries on success; toast warning on failure.
- Local-only: uses `localUpdateNode` / `localUpdateClip` — no cloud `rippleClips` adapter.
