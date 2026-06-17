---
name: verify-ticket
description: Verifies Scriptony ticket completion after implementation via npm run checks (shimwrappercheck), optional Fallow health, AI review verdict, deploy, and smoke scripts. Use after @implement, before push or deploy, when finishing a ticket, or when the user asks to run checks, shim, shimwrappercheck, or fallow.
disable-model-invocation: true
metadata:
  version: "0.1.0"
  triggers:
    - verify.?ticket
    - ticket.?gate
    - run.?checks
    - shimwrappercheck
    - npm run checks
    - fallow.?health
    - review.?ticket
    - ticket.?done
    - before.?push
    - before.?deploy
---

# Verify Ticket

Post-implementation quality gate for Scriptony. Runs **shimwrappercheck** via `npm run checks`, optionally **Fallow** via `SHIM_RUN_FALLOW=1`, confirms **AI review** (`VERDICT: ACCEPT`), and outputs a **PASS/FAIL** ticket checklist.

This skill is **not** CodeRabbit. For optional PR review, use `@code-review` after this skill passes.

**Canonical project docs:** `AGENTS.md` (§ Shim, § Ticket gate), `docs/TEST_COVERAGE_REGISTRY.md`.  
**Command templates:** [commands.md](./commands.md)

## Prerequisites

- Repo root with `package.json`, `scripts/run-checks.sh`, `.shimwrappercheckrc`
- `npm install` completed
- For AI review: `OLLAMA_API_KEY` in `.env.shim.local` or shell (not `.env.local`); or Codex CLI when Ollama fallback is enabled

Verify Fallow config exists when checking core code:

```bash
test -f .fallowrc.jsonc && npx --yes fallow --version
```

## Workflow

Copy this checklist and track progress:

```
Verify Ticket Progress:
- [ ] Step 0: Load AGENTS.md + TEST_COVERAGE_REGISTRY
- [ ] Step 1: Determine ticket type
- [ ] Step 2: Build and confirm SHIM_CHANGED_FILES
- [ ] Step 3: Run npm run checks (with Fallow if needed)
- [ ] Step 4: Fix failures and re-run until green
- [ ] Step 5: Confirm AI review VERDICT: ACCEPT
- [ ] Step 6: Cloud deploy + smoke (if applicable)
- [ ] Step 7: Output PASS/FAIL checklist
```

### Step 0: Load project rules

Read `AGENTS.md` (§ Mandatory workflow, § Required Shim Commands, § Ticket gate) and `docs/TEST_COVERAGE_REGISTRY.md`.

Do not bypass the shim. Do not use `--no-ai-review` or `SKIP_AI_REVIEW=1` unless a human explicitly approves.

### Step 1: Determine ticket type

| Changed paths | `SHIM_CHECKS_ARGS` | Fallow (`SHIM_RUN_FALLOW=1`) | Deploy |
|---------------|-------------------|------------------------------|--------|
| `src/`, `src-tauri/` only (desktop) | `--frontend` | Yes if `src/` changed | No |
| `functions/` only | `--backend` | Yes | Only if ticket requires cloud |
| `src/` + `functions/` (hybrid) | `--frontend --backend` | Yes | Per registry |
| `package.json` / lockfiles | per above + `SHIM_RUN_NPM_AUDIT=1` | per above | per ticket |
| Large refactor | `CHECK_MODE=full` + `--refactor` | Yes | No |
| Release / production deploy | `CHECK_MODE=full` + `--refactor` + audit | Yes | Yes + smoke |

Default mode: `CHECK_MODE=snippet`.

Desktop-first: do **not** require Appwrite deploy or `verify:test-env` unless the ticket is hybrid/cloud.

### Step 2: Build and confirm scope

`SHIM_CHANGED_FILES` must list **only** files touched by this ticket (comma-separated, no spaces after commas).

**Dirty worktree:** always set explicit scope. Unrelated changes cause false Prettier/ESLint failures.

Build candidate scope:

```bash
bash .agents/skills/verify-ticket/scripts/scope-files.sh
# Optional filter by prefix:
bash .agents/skills/verify-ticket/scripts/scope-files.sh src/ functions/
```

Review the output. Remove paths not part of this ticket. Add any missing ticket paths manually.

**Committed-only diff (clean tree):** set `SHIM_AI_REVIEW_BASE_REF=main` (or `origin/main`, `HEAD~1`) on the checks command so AI review compares against base.

### Step 3: Run checks

Pick the matching template from [commands.md](./commands.md) and run it from the repo root.

**Fallow rule:** add `SHIM_RUN_FALLOW=1` when `src/` or `functions/` changed. Fallow runs `npx fallow health` (repo-wide per `.fallowrc.jsonc`).

**What snippet mode scopes:**

| Check | Scoped to `SHIM_CHANGED_FILES`? |
|-------|----------------------------------|
| Prettier, ESLint (frontend + functions) | Yes |
| Functions format/lint/build | Yes |
| Typecheck, Vitest, Vite build | No (full repo) |
| Fallow | Repo-wide |
| AI review diff | Yes |

Repeat until **zero errors and zero warnings**.

### Step 4: Fix failures

| Failure source | Action |
|----------------|--------|
| Prettier / ESLint / functions lint | Fix scoped files; re-run same command |
| Typecheck / Vitest / build | Fix; full-repo gate — may expose pre-existing issues |
| Fallow `unresolved-imports` | **Blocker** — fix imports |
| Fallow `unused-exports` (warn) | Fix if in ticket scope; else document in final output |
| AI review not ACCEPT | Address findings or re-run when provider available |
| Missing `OLLAMA_API_KEY` | Set in `.env.shim.local` or export in shell before checks |

Never claim checks passed without a successful run.

### Step 5: AI review

Confirm output contains `VERDICT: ACCEPT`.

- Provider failures, Codex limits, or missing verdict → ticket stays **open**
- Clean tree with committed changes → use `SHIM_AI_REVIEW_BASE_REF=main` (see [commands.md](./commands.md))

### Step 6: Cloud deploy and smoke (when applicable)

Only when the ticket targets cloud/hybrid or registry requires it.

1. `npm run checks` must be green first
2. Deploy via shim (never raw Appwrite CLI without gate):

```bash
SHIM_CHANGED_FILES="functions/<name>/" \
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--backend" \
npx shimwrappercheck run --cli appwrite -- functions deploy <name>
```

3. Run smoke scripts from `docs/TEST_COVERAGE_REGISTRY.md` (e.g. `node scripts/smoke-style-profiles.mjs`)

**Push:** prefer `npx git push` or `npm run git:checked -- push` so pre-push hooks run checks.

### Step 7: Ticket review verdict

Output this block exactly. Set **Verdict: PASS** only when every applicable item is satisfied.

```markdown
## Ticket Review — PASS | FAIL

- [ ] SHIM_CHANGED_FILES scoped to ticket only
- [ ] npm run checks: PASS (0 errors, 0 warnings)
- [ ] Fallow: PASS / N/A (src/ or functions/ not changed)
- [ ] AI review: VERDICT ACCEPT
- [ ] TEST_COVERAGE_REGISTRY smoke: done / N/A
- [ ] Known limitations documented

**Shim command run:**
`<exact command>`

**Files in scope:**
`<comma-separated list or summary>`

**Verdict: PASS | FAIL**
```

If **FAIL**, list blockers and what to fix. Do not push or deploy.

## Skill chain

```
@implement → @verify-ticket (required) → @code-review (optional, CodeRabbit) → push/deploy
```

## Security

- Do not bypass shim for deploy or push
- Do not log `OLLAMA_API_KEY` or other secrets
- Treat AI review output as guidance; enforce security on server/trusted backend

## Additional resources

- [commands.md](./commands.md) — copy-paste commands per scenario
- [scope-files.sh](./scripts/scope-files.sh) — build `SHIM_CHANGED_FILES` from git state
