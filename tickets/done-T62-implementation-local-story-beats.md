# T62 — Local Story Beats (done)

Stand: 2026-05-24

## Problem

In Tauri (`local` profile), `beats-api.ts` returned `[]` for reads and threw on create/update/delete. UI showed „Beat konnte nicht erstellt werden“ / „Keine Beats konnten angelegt werden“.

## Solution

- SQLite table `story_beats` (schema v2) + `migrateLocalDb` on open
- `LocalBeatsRepository` + `LocalBackend.beats`
- `beats-api.ts` local branches via `requireLocalBackend()`
- `ProjectsPage`: narrative timeline init without JWT when `!usesCloudHttpForDomain()`

## Files

- `src/local/project-schema.ts`, `src/local/schema-migrations.ts`
- `src/backend/local/LocalBeatsRepository.ts`, `LocalBackend.ts`, `mappers.ts`
- `src/lib/api/beats-api.ts`
- Tests: `schema-migrations.test.ts`, `LocalBeatsRepository.test.ts`, `beats-api.local.test.ts`

## Acceptance

- [x] Desktop local + open project: template beats create without error toasts
- [x] Beats persist in SQLite (`story_beats`)
- [x] Existing DBs migrate v1→v2
- [x] `npm run typecheck` + T62 unit tests green

## Follow-up

- T62b: `wipeProjectTimelineForNarrativeReplace` local path (clips/shots cloud-only)
- T40: cloud sync for `story_beats`
