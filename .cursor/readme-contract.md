# README contract — Scriptony (scriptony-multihost)

Overrides the global default in `commit-push-safe/readme-contract.md`.

## Living sections (update when user-facing behavior changes)

| File | What to update |
|------|----------------|
| `README.md` | `## Was Scriptony kann` tables (Jetzt nutzbar / In Entwicklung) |
| `README.md` | `## Für Entwickler` — new npm scripts, checks, env vars |
| `README.md` | `## Recent changes` — one line per shipped change (max 10) |
| `docs/GETTING_STARTED.md` | Cloud deploy, Appwrite, smoke |
| `docs/DESKTOP_FIRST_DEV.md` | Desktop checks, `SHIM_CHANGED_FILES`, ticket gate |
| `docs/TEST_COVERAGE_REGISTRY.md` | Features not covered by default shim |
| `AGENTS.md` | Only when agent/check workflow changes in this commit |

## Deep docs (link from README, do not inline)

- `docs/multi-voice-engine.md`, `docs/STYLEGUIDE_SYSTEM_CONCEPT.md`, architecture plans under `docs/`
- Tickets under `tickets/` — never copy into README

## Skip README

- Tests only (`**/__tests__/**`, `*.test.ts`, `*.test.tsx`)
- `tickets/`, `docs/archive/`
- Pure refactor with zero user-visible change (document skip in commit-push report)

## Recent changes format

```markdown
- **2026-06-16** — Hybrid project sync v1 (style profiles only) (`feature/T93-sync`)
```

## Shim gate

`scripts/check-readme-scope.sh` runs via `npm run checks` (`updateReadme`). Bypass only with `SKIP_README_SCOPE_CHECK=1` and documented reason in PR.
