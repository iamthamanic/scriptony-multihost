# verify-ticket: MVE Textblock Order + Scene Sync

**Date:** 2026-07-10  
**Acceptance:** `.qa/acceptance/mve-textblock-order-sync.md`  
**Verdict:** **PARTIAL PASS**

## Happy Path

| Criterion | Evidence | Status |
|-----------|----------|--------|
| Second block gets unique `orderIndex` | `nextLineOrderIndexForScene` unit tests | **PASS** |
| Scene shell grows after second empty block | Playwright harness `scene-grown-shell` | **PASS** |
| Blocks stack without horizontal overlap | Playwright `stack-two-correct-order` | **PASS** |
| Pink scene track width after MVE resize | Code: `reloadTimelineDataFromSource` wired; no Tauri E2E | **PENDING** |

## Edge Cases

| Criterion | Status |
|-----------|--------|
| Same character sequential placement | **PASS** (Playwright) |
| Scene sync failure graceful | **NOT TESTED** |

## Regression

| Criterion | Status |
|-----------|--------|
| Sole empty block spans full scene | **PASS** (Playwright) |
| WPM width after save | **PASS** (existing unit tests) |
| Film project no contentDriven resize | **PASS** (unit policy only) |

## Voicebox (parallel work — not in acceptance file)

| Criterion | Status |
|-----------|--------|
| Default engine voicebox | **PASS** (unit + verify frontend) |
| Live Voicebox TTS | **MANUAL** (requires Voicebox app) |

## Blockers for full PASS

1. Tauri manual: timeline pink shell refresh after content-driven resize
2. Optional: scene sync failure path test

## Recommendation

Safe to continue development. Run Tauri smoke before closing issue. Use `@ecc-check` for ship gate.
