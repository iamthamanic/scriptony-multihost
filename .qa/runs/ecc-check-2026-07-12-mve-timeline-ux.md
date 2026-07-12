# ECC Check — MVE Timeline UX Polish (2026-07-12)

Branch: `issue/49-timeline-row-shell-structure`
Scope: 3 slices from `.qa/design/mve-timeline-ux-polish.md` (scene-sync 300ms + live width
preview, in-scene DnD reorder, compact empty dialog lane height). See
`.qa/runs/audit-changes-2026-07-12-mve-timeline-ux.md` for the file-level breakdown.

## Deterministic gate — `npm run verify -- --frontend`

| Check | Result |
|---|---|
| Prettier (frontend) | PASS |
| ESLint (frontend) | PASS |
| TypeScript (`tsc --noEmit`) | PASS |
| Vitest (`vitest run`) | PASS — 190 files / 1047 tests |
| Vite build | PASS |

Full run executed twice; first isolated re-run of a single unrelated pre-existing test file
(`MveEmotionChip.test.tsx`) showed flaky `document is not defined` when run in a subset, but
passed cleanly in the full suite both times it was included — not caused by this change set and
not in scope of the 3 slices.

## Acceptance

`.qa/acceptance/mve-timeline-ux-polish.md` — all 3 slice acceptance criteria covered by unit
tests added in this session (`resolve-scene-at-timeline-sec.test.ts`,
`reorder-text-block-in-scene.test.ts`, extended `mve-dialog-clip-layout.test.ts`, extended
`AudioTimelineMveTextBlock.test.tsx`).

## Code review

- No new `appwrite` imports, no frozen cloud paths touched (Cloud-Freeze Policy respected).
- File sizes stay within budget: new files (`reorder-text-block-in-scene.ts`,
  `useMveLineReorder.ts`) are small, single-purpose extractions; no file crossed the 300-line
  soft limit as a result of this work.
- German UI copy: only new user-facing string is the reorder-failure toast
  ("Textblock konnte nicht neu angeordnet werden.") — already German.
- Desktop-first / local runtime: all new logic goes through the existing local MVE
  adapter (`getMveLines`/`updateMveLine` via `@/lib/api-adapter/mve-adapter`), no new
  cloud-only API surface.

## Known limitations

- In-scene reorder target index is derived from pointer X position vs. sibling visual midpoints
  (reusing the existing visual-span resolver); very densely packed/overlapping text blocks at low
  zoom could make the exact drop target slightly ambiguous, same class of limitation as the
  existing cross-scene move.
- Live width preview only activates for content-driven audio project types (as designed); other
  project types keep the debounce-only sync path.
- The flaky `MveEmotionChip.test.tsx` isolation issue (unrelated file) is worth a follow-up ticket
  if it recurs, but did not block this gate since the full suite run is green.

## Verdict: **READY**

All deterministic checks pass on a clean full run. Not committed/pushed per task constraints
(user did not request commit in this message).
