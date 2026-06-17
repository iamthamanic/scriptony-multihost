# Test Coverage Registry

Tracks features that are **not** fully covered by default `npm run checks`, and what was added instead.

Update this file when a ticket introduces new behavior that needs smoke, unit, or manual verification.

| Feature | Unit test | Smoke / script | Shim gate | Notes |
|--------|-----------|----------------|-----------|-------|
| Style profiles CRUD + analyze | `src/lib/style-profile/__tests__/` | `scripts/smoke-style-profiles.mjs` | functions build | T88/T89 |
| Guide bundle from spec (T96) | — | `scripts/smoke-style-profiles.mjs` POST `/ai/style/guide-bundle` | deploy + smoke | Needs cloud shot or `SCRIPTONY_SMOKE_SHOT_ID` |
| Vision validation (T91) | `functions/scriptony-style/__tests__/style-vision-chat.test.ts` | analyze `mode=vision` (optional) | functions build | Storage refs only; no external URL fetch |
| Project hybrid sync v1 (T93) | `src/lib/sync/__tests__/project-sync-engine.test.ts` | — | frontend tests | v1: style profiles + active profile; timeline/characters skipped |
| Project metadata merge | `src/lib/__tests__/project-metadata-merge.test.ts` | — | frontend tests | Prevents `metadata_json` overwrite |
| Stage render jobs (T98) | — | `scripts/smoke-style-profiles.mjs` GET `/stage/render-jobs` | deploy + smoke | `scriptony-stage` deploy required |
| Fallow dead-code | — | `npx fallow health` | `SHIM_RUN_FALLOW=1` | Optional per ticket; see AGENTS.md |

## Ticket completion checklist

1. Set `SHIM_CHANGED_FILES` to **only** ticket paths (comma-separated).
2. Run scoped checks (see AGENTS.md § Ticket gate).
3. Run `@verify-ticket` — must end with **PASS** (see `.agents/skills/verify-ticket/SKILL.md`).
4. If table above applies: run listed smoke/scripts after cloud deploy.
5. Update this registry when adding new uncovered paths.
