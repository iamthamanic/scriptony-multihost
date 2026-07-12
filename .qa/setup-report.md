# Project setup audit report

**Date:** 2026-06-14  
**Repo:** scriptony-multihost  
**Mode:** audit (gap fill)

## Discovery summary

| Field | Value |
|-------|-------|
| Workspace root | `.` |
| App root | `.` |
| Stack | Vite + React + Tauri + Appwrite Functions |
| Frontend | yes |
| Dev | `npm run dev:desktop` (port 3000 WebView) |
| Checks | `npm run checks` → `scripts/run-checks.sh` |
| Locale | de |

## Created

| Path | Purpose |
|------|---------|
| `.qa/project.yaml` | verify-ui / pipeline config |
| `.qa/runner-profile.yaml` | feature-intake + ecc-runner profile |
| `.qa/edge-cases.md` | Project edge cases |
| `.qa/design/_template.md` | Design stub |
| `.qa/acceptance/_template.md` | Acceptance stub |
| `.qa/queue/state.template.json` | ECC runner state template |
| `.qa/queue/README.md` | Queue docs |
| `.qa/.gitignore` | evidence/test-results |
| `.qa/design/multi-voice-engine.md` | Epic design (Structure Timeline UI) |
| `.qa/intake/multi-voice-engine-issues.md` | Issue draft — 5 issues, timeline-anchored |
| `.qa/intake/multi-voice-engine-issues.json` | Machine-readable draft |

## Skipped (already present)

- `AGENTS.md` — rich; pipeline section appended separately
- `docs/multi-voice-engine.md` — PRD exists
- shimwrappercheck / `scripts/run-checks.sh` — already configured
- `UI_STYLEGUIDE` — referenced path `docs/UI_STYLEGUIDE.md` (verify exists)

## Global skills installed

| Skill | Path |
|-------|------|
| feature-intake | `~/.cursor/skills/feature-intake/` |
| ecc-runner | `~/.cursor/skills/ecc-runner/` (promoted from questolin-app) |

## Next steps

1. Review `.qa/intake/multi-voice-engine-issues.md`
2. Say **„Issues anlegen“** → `create-github-issues.sh`
3. `@ecc-runner` for batch implementation
