# Verify Ticket — Command Templates

Run all commands from the repository root. Replace `<paths>` with comma-separated ticket files (no spaces after commas).

## Scope helper

```bash
bash .agents/skills/verify-ticket/scripts/scope-files.sh
bash .agents/skills/verify-ticket/scripts/scope-files.sh src/ functions/
```

## Default — normal ticket (auto scope from git)

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks
```

## Dirty worktree — explicit scope

```bash
SHIM_CHANGED_FILES="<paths>" \
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks
```

## Desktop-first (frontend + Tauri, no functions)

```bash
SHIM_CHANGED_FILES="<src,src-tauri paths>" \
SHIM_RUN_FALLOW=1 \
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend" npm run checks
```

## Frontend-only

```bash
SHIM_CHANGED_FILES="<paths>" \
SHIM_RUN_FALLOW=1 \
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend" npm run checks
```

## Backend-only (functions)

```bash
SHIM_CHANGED_FILES="<paths>" \
SHIM_RUN_FALLOW=1 \
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--backend" npm run checks
```

## Hybrid (frontend + backend)

```bash
SHIM_CHANGED_FILES="src/lib/sync/,src/hooks/useProjectSync.ts,functions/scriptony-style/,AGENTS.md" \
SHIM_RUN_FALLOW=1 \
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend --backend" npm run checks
```

## Committed changes — AI review needs base ref

When the working tree is clean but ticket files are already committed:

```bash
SHIM_AI_REVIEW_BASE_REF=main \
SHIM_CHANGED_FILES="<paths>" \
SHIM_RUN_FALLOW=1 \
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend" npm run checks
```

Alias: `AI_REVIEW_BASE_REF` (same meaning).

## Dependency change gate

When `package.json`, lockfiles, or dependency tooling changed:

```bash
SHIM_RUN_NPM_AUDIT=1 \
SHIM_CHANGED_FILES="<paths>" \
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks
```

## Large refactor checkpoint

```bash
CHECK_MODE=full SHIM_CHECKS_ARGS="" npm run checks -- --refactor
```

## Release / production deploy gate

```bash
SHIM_RUN_NPM_AUDIT=1 \
CHECK_MODE=full SHIM_CHECKS_ARGS="" npm run checks -- --refactor
```

Then run Appwrite verify/smoke scripts per ticket.

## Fallow only (manual, outside shim)

When checks already passed but Fallow was skipped:

```bash
npx fallow health
```

Prefer `SHIM_RUN_FALLOW=1` on the same `npm run checks` command instead.

## Cloud deploy (after checks green)

```bash
SHIM_CHANGED_FILES="functions/<name>/" \
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--backend" \
npx shimwrappercheck run --cli appwrite -- functions deploy <name>
```

## Post-deploy smoke (examples)

```bash
node scripts/smoke-style-profiles.mjs
```

See `docs/TEST_COVERAGE_REGISTRY.md` for feature-specific scripts.

## Push with checks

```bash
npx git push
# or
npm run git:checked -- push
```

## Ollama AI review setup

```bash
cp .env.shim.local.example .env.shim.local
# Edit .env.shim.local — set OLLAMA_API_KEY
bash -c '[[ -n "$OLLAMA_API_KEY" ]] && echo ok || echo missing'
```

`.env.local` is **not** loaded by `scripts/run-checks.sh`.

## Environment reference

| Variable | Purpose |
|----------|---------|
| `CHECK_MODE` | `snippet` (default ticket) or `full` (refactor/release) |
| `SHIM_CHECKS_ARGS` | `--frontend`, `--backend`, or both |
| `SHIM_CHANGED_FILES` | Comma-separated ticket file paths |
| `SHIM_RUN_FALLOW=1` | Run `npx fallow health` in checks pipeline |
| `SHIM_RUN_NPM_AUDIT=1` | Enable npm audit gate |
| `SHIM_AI_REVIEW_BASE_REF` | Base ref for AI review when diff is empty |
| `SHIM_AI_REVIEW_PROVIDER` | e.g. `ollama` (see AGENTS.md) |
