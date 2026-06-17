# Dead code baseline (T76)

## Method

1. **Fallow** (T70 scope, [`.fallowrc.jsonc`](../.fallowrc.jsonc)): `npx fallow dead-code --format json` → `summary`.
2. **Grep** for extraction orphans not always flagged: `rg "from ['\"].*ModuleName" src/`.
3. Re-run after each sweep; record delta below.

## Baseline (pre-T76 pass 1)

Fallow `summary` (2026-06-15): `total_issues` 108; `unused_files` 4 (local-bridge/scripts, outside core UI sweep).

## T76 pass 1 removals

| Path | Reason | ~LOC |
|------|--------|------|
| `src/components/projects/DraggableScene.tsx` | Extracted in T74, never imported | 779 |
| `structure-timeline-editor-helpers.ts` | Duplicate `calculateWordCountFromContent` | 26 |
| `StructureTimelineEditor.tsx` | Unused import | 1 |
| `BookDropdownView.tsx` | Dead `BookTimelineData` re-export | 1 |

**Total:** ~807 LOC removed.

## Follow-up

- Pass 2: unused exports in `src/lib/` flagged by fallow (target &lt;50 in core per T50 epic).
- Pair with [`docs/CODE_HEALTH_DEDUPE_TOP20.md`](./CODE_HEALTH_DEDUPE_TOP20.md) for clone consolidation.
