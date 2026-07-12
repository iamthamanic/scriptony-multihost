# Scriptony Ticket T52 — Implementation: lib/types Index Split

Stand: 2026-05-24

**Status:** done

## Ziel

`src/lib/types/index.ts` (705 Zeilen, Hard Violation) in fokussierte Domain-Module unter **500** (Ziel **≤300** pro Datei) aufteilen — **ohne** Typ- oder Verhaltensänderungen.

Parent: `tickets/todo-T50-plan-codebase-file-size-refactor.md` (Welle A)

## Ist

- Eine Datei: alle Shared-Types (Auth, Project, Audio, Film, World, …).
- Viele Imports im Frontend; Public API muss stabil bleiben.

## Soll-Struktur

```text
src/lib/types/
├── index.ts              # Re-exports (backward compatible)
├── auth.ts
├── organization.ts
├── project.ts              # Project, Episode, Character, Scene, Act, Sequence
├── audio.ts                # AudioTrack, AudioClip, LANE_SCHEMA, WPM_DEFAULTS, …
├── film.ts                 # Clip, Shot
├── render.ts               # RenderJob + freshness re-export
├── world.ts
├── creative-gym.ts
├── script.ts
├── api-responses.ts
├── stats.ts
└── audio-timeline.ts       # (bestehend)
```

## Arbeitsregeln

- Keine Logik-Änderung; nur Verschiebung.
- `index.ts` bleibt dünner Barrel — bestehende Imports `from "@/lib/types"` / `from "./types"` weiter gültig.

## Akzeptanzkriterien

- [x] Keine Datei im Split >500 Zeilen (Ziel ≤300).
- [x] `grep -r "lib/types"` — Imports funktionieren (Barrel).
- [x] `npm run typecheck` → 0 Fehler.
- [x] `SHIM_CHANGED_FILES="src/lib/types/..." CHECK_MODE=snippet npm run checks -- --frontend`
- [x] Done Report in `docs/scriptony-architecture-refactor 25.04.26.md`

## Checks

```bash
CHECK_MODE=full bash scripts/checks/project-rules.sh  # types/index.ts nicht mehr FAIL
SHIM_CHANGED_FILES="src/lib/types/index.ts,src/lib/types/auth.ts,..." CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --frontend
```
