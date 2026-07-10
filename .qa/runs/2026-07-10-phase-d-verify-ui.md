# verify-ui Report: Phase D (2026-07-10)

**Date:** 2026-07-10  
**Acceptance:** `.qa/acceptance/mve-textblock-order-sync.md`  
**Scope:** uncommitted worktree (MVE timeline + Voicebox TTS + audit fixes)  
**Verdict:** **PARTIAL**

## Technical checks

| Check | Command | Result |
|-------|---------|--------|
| Frontend verify | `npm run verify -- --frontend` | **PASS** |
| Unit tests (full) | `npm run test` | **PASS** (1015 tests incl. voicebox) |
| Playwright MVE harness | `npm run test:e2e -- .qa/runs/2026-07-06-mve-textblock-order-sync.spec.ts` | **PASS** (1/1) |
| npm audit (high+) | `npm audit --audit-level=high` | **WARN** — 18 pre-existing (vitest/vite/undici); not introduced by this diff |

## Audit fixes applied

| Issue | Fix |
|-------|-----|
| Hardcoded `visualEditor.projectRoot` | Removed from `src-tauri/tauri.conf.json`; documented in `.env.local.example` |
| Temp probe file | Deleted `.qa/tmp-scroll-probe.html` |
| Missing Voicebox tests | Added `voicebox-api.test.ts` (7) + `voicebox.adapter.test.ts` (2) |
| MVE mapper engine default | `mapMveVoiceProfileRow` uses `DEFAULT_VOICE_ENGINE` |
| Prettier | Fixed 15 files in changed scope |

## Playwright scenarios

**Harness:** `/#qa-mve-textblock-order-sync`

| Step | Result | Evidence |
|------|--------|----------|
| Two blocks orderIndex 0,1, no overlap | OK | `.qa/evidence/mve-textblock-order-sync/01-two-blocks-stacked.png` |
| Text + empty block stacking | OK | (same spec) |
| Grown scene shell (+5s) | OK | `02-scene-grew-after-second.png` |

## Voicebox (no browser harness)

| Step | Result |
|------|--------|
| API client unit tests | PASS |
| Adapter unit tests | PASS |
| Live Voicebox app E2E | **SKIPPED** — requires running Voicebox on `:17493` + Tauri desktop |

## Acceptance mapping

See `.qa/runs/2026-07-10-verify-ticket-mve-textblock-order-sync.md`.

## Skipped / manual

- Tauri: pink scene track reload after MVE resize
- Tauri: Voicebox character voice + preview with real profiles
- Scene sync failure path
- Film project no-resize (browser)

## Follow-up

1. Tauri smoke: audio project → Plus second block → scene shell grows → save text
2. Tauri smoke: Voicebox running → assign character voice → preview
3. `@ecc-check` before PR/merge
4. Consider splitting mixed diff into separate PRs (Voicebox | MVE/Timeline | Visual Editor)
