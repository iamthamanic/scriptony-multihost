# verify-ui Report: MVE Textblock Order + Scene Sync

**Date:** 2026-07-06  
**Acceptance:** `.qa/acceptance/mve-textblock-order-sync.md`  
**Verdict:** **PARTIAL**

## Technical checks

| Check | Result |
|-------|--------|
| Unit tests (`mve-dialog-clip-layout`, `resolve-scene-at-timeline-sec`) | PASS |
| Playwright `.qa/runs/2026-07-06-mve-textblock-order-sync.spec.ts` | PASS (1/1) |
| `npm run verify -- --frontend` | FAIL — Prettier on unrelated dirty files in worktree |

## Playwright scenarios

**Harness:** `/#qa-mve-textblock-order-sync` (DEV + `__TAURI__` init script for local auth)

| Step | Result | Evidence |
|------|--------|----------|
| Two empty blocks (orderIndex 0,1), no overlap | OK | `01-two-blocks-stacked.png` |
| Text block + empty block, no overlap | OK | (same spec) |
| Grown scene shell (+5s) | OK | `02-scene-grew-after-second.png` |

## Acceptance mapping

| Criterion | Status |
|-----------|--------|
| Unique orderIndex on create | OK (unit) |
| Sequential stacking | OK (Playwright) |
| Scene shell grow (contentDriven) | OK (harness visual); Tauri pending |
| Timeline reload after resize | Code only; Tauri pending |
| Film policy unchanged | Not tested |

## Fix discovered during verify-ui

**Min-width overlap:** WPM text (~4s) rendered at 220px min width overlapped the second block (logical start at 14s). Fixed via `resolveMveLineVisualSpanMap()` cumulative visual stacking.

## Skipped / manual

- Full Tauri audio project: Plus → second block → pink scene grows → type text → save
- Scene sync failure path
- Film project no-resize regression

## Follow-up

1. Tauri smoke on user's audio project
2. Optional: `maxContentEndSecInScene` use visual spans for scene resize
3. Clean prettier on unrelated dirty files before `npm run verify`
