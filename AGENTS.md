# Agent instructions (scriptony-multihost)

This file is used by AI agents (Cursor, Codex, Claude, Gemini, etc.) when working with this repo.
It can be edited via the shimwrappercheck dashboard (Config → AGENTS.md) so agents and humans share one source of truth.

## Agent orientation

Before touching infrastructure, deployment, environment setup, or any task that
involves starting the dev stack, deploying collections, or deploying functions,
read **`docs/GETTING_STARTED.md`**. It contains the canonical commands,
gotchas, and decision tree for this project. Update it when workflows change.

**Default product focus (2026):** Tauri desktop, **local runtime** (`.scriptony` + SQLite). See **`docs/DESKTOP_FIRST_DEV.md`**, **`docs/ARCHITECTURE_LOCAL_CLOUD.md`** (3 Achsen: Shell / Cloud-Session / Daten-Ort), **`docs/DOMAIN_GLOSSAR.md`**, and **`.cursor/rules/scriptony-desktop-dev.mdc`**. Do not suggest Appwrite deploy, Docker `npm run dev`, or `verify:test-env` unless the ticket explicitly targets cloud, web, or hybrid.

## Desktop-first development (default ticket mode)

Use this unless the user or ticket explicitly asks for cloud, web, or Appwrite deploy.

### Start and test

```bash
docker stop scriptony-frontend 2>/dev/null || true
npm run dev:desktop
```

- **One command:** `dev:desktop` runs `tauri dev`, which starts Vite on port **3000** for the Tauri WebView only (HMR). Do not tell the user to open `http://localhost:3000` in a browser unless they are doing **web/cloud** work.
- **Do not use** `npm run dev` (full Docker stack) for routine desktop tickets — it conflicts on port 3000 and pulls Appwrite into the loop.

### Runtime and data

- **Tauri default profile:** `local` (`src/runtime/detect-runtime.ts` — desktop shell without override).
- **`.env.local`:** Prefer `VITE_SCRIPTONY_RUNTIME=local`. Appwrite vars (`VITE_APPWRITE_*`, `VITE_BACKEND_FUNCTION_DOMAIN_MAP`) are optional — only for **hybrid** features (KI/TTS/sync), not for listing projects/worlds from workspace.
- **In-app:** Choose a **workspace folder**, open a **`.scriptony`** project for `LocalBackend` (timeline content, structure, scripts). See `docs/LOCAL_PROJECT_FORMAT.md`.
- **Tauri FS:** Capabilities `workspace-fs` + `local-project-fs` in `src-tauri/tauri.conf.json`; workspace scans call `restoreWorkspaceScope()` before `readDir`.

### Code changes (local features)

- Route through **`src/lib/api-adapter/`** and **`dispatchByRuntime`** (`runtime-dispatch.ts`). Do not add new `apiGet` / `cloudFetch` calls from UI for data that exists locally.
- **Capability gates:** [`src/capabilities/registry.ts`](src/capabilities/registry.ts) — `CLOUD_SESSION` vs `LOCAL_WHEN_PROJECT_OPEN`; cloud session via [`canUseCloudSession()`](src/lib/auth/cloud-session.ts).
- **Legacy** `src/utils/api.tsx`: `projectsApi` / `worldsApi` / `itemsApi` / `categoriesApi` already delegate to adapters; extend adapters, not raw `apiFetch` in pages.
- **Still cloud-only today:** many modules under `src/lib/api/` — see `docs/DESKTOP_FIRST_DEV.md` § Cloud-only APIs. New desktop features need a local branch or LocalBackend repo, not only Function deploy.

### Checks (desktop / frontend tickets)

```bash
@ecc-check
# or manually:
npm run verify -- --frontend
```

Legacy shim (Appwrite deploy / release only): `CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend" SHIM_CHANGED_FILES="src/...,src-tauri/..." npm run checks`

Add `src-tauri/` to changed scope when Rust or `tauri.conf.json` / capabilities change. Skip `--backend` and function deploy unless the ticket edits `functions/`.

### When cloud/Appwrite still applies

- Ticket says: cloud client, browser, function fix, collection deploy, production release.
- Hybrid: user keeps `VITE_APPWRITE_*` and uses KI/TTS/upload — `canUseCloudFeatures()` in local profile.
- Then follow § Appwrite below and `docs/GETTING_STARTED.md` Options A/B and deploy sections.

## Mandatory workflow (do not bypass)

- **Run `@ecc-check` (or `npm run verify`) before commit/push** for normal desktop/frontend tickets. Code review gate: `@review-ticket` ACCEPT — not shim AI review.
- **Run checks until there are no errors and no warnings.** Fix and re-run until green. Do not push or deploy until gates pass.
- **Ship:** `@commit-push-safe` (push only) or `@commit-pr-safe` (push + PR). Never push to main.
- **Legacy shim** (`npm run checks`): Appwrite deploy, release, or when explicitly required — still via `scripts/run-checks.sh` (AI review disabled in `.shimwrappercheckrc`).
- Pre-push hook runs `npm run verify` (see `.husky/pre-push`).

## ECC quality gate (`@ecc-check`)

Global skill: `~/.cursor/skills/ecc-check/SKILL.md`

| Phase | Tool |
|-------|------|
| Deterministic | `npm run verify` (`.qa/project.yaml` → `checksCommand`) |
| Acceptance | `@verify-ticket` |
| Code review | `@review-ticket` (+ Bugbot/Security when needed) |
| Agent config | `npx ecc-agentshield scan --path .cursor` |
| UI | `@verify-ui` when UI changed |
| Ship | `@commit-pr-safe` or `@commit-push-safe` |

**Do not** require Shim `VERDICT: ACCEPT` / Ollama AI review for ticket completion.

## Shim usage (legacy — deploy & optional full gate)

- **Appwrite deploy**: Use `npx shimwrappercheck run --cli appwrite -- functions deploy <name>` or `npm run checks` first, then deploy.
- **Git push**: Use `npx git push` or `npm run git:checked -- push` so checks run before push. The pre-push hook runs `scripts/run-checks.sh` when installed.
- **Setup**: Run `npx shimwrappercheck init` for one-time setup; `npx shimwrappercheck install` for PATH shims.
- **Dashboard**: `npx shimwrappercheck dashboard` to configure checks, presets, and this AGENTS.md via UI.

## Checks (what runs in scripts/run-checks.sh)

Checks are configured in the dashboard or `.shimwrappercheckrc` (toggles and order). Current configured checks:

### Frontend

- **ESLint** (`npm run lint`): Catches code quality issues and React hooks violations.
- **TypeScript Check** (`npm run typecheck`): `tsc --noEmit` — catches type errors before runtime.
- **Prettier** (`npm run format:check`): Enforces consistent code formatting.
- **Vitest** (`npm run test`): Unit tests must pass.
- **Vite Build** (`npm run build`): Production build must succeed.
- **npm audit** (`SHIM_RUN_NPM_AUDIT=1 npm run checks` or `npm audit`): Release/security gate only. It is disabled in the default snippet gate because it is not scoped to the changed files and can block unrelated tickets on pre-existing vulnerabilities.

### Backend (Appwrite Functions / Node.js / Hono)

- **Functions format** (`SHIM_RUN_FUNCTIONS_FORMAT=1`): Prettier checks changed Appwrite Function source files in snippet mode and all Function source files in full/refactor mode. Generated bundles such as `functions/**/index.js` are ignored.
- **Functions lint** (`SHIM_RUN_FUNCTIONS_LINT=1`): ESLint checks changed `functions/**/*.ts` files in snippet mode and all Function TypeScript source files in full/refactor mode.
- **Functions build** (`SHIM_RUN_FUNCTIONS_BUILD=1`): Builds changed Appwrite Functions with esbuild in snippet mode and all known Appwrite Functions in full/refactor mode. This is a build-only check; it must not deploy.
- **No Deno default checks**: `SHIM_RUN_DENO_FMT=0`, `SHIM_RUN_DENO_LINT=0`, and `SHIM_RUN_DENO_AUDIT=0` because this repo's Appwrite Functions are bundled for the Appwrite Node runtime.

### Required commands (ECC default)

- **Desktop / frontend ticket:** `@ecc-check` or `npm run verify -- --frontend`
- **Backend / functions ticket:** `npm run verify -- --backend`
- **Full verify:** `npm run verify`
- **Ship:** `@commit-pr-safe` (PR) or `@commit-push-safe` (push only)

### Legacy shim commands (deploy / release)

- **Normal ticket (legacy):** `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`
- **Dirty worktree ticket scope**: If unrelated user changes exist, set `SHIM_CHANGED_FILES` to the current ticket's files, for example `SHIM_CHANGED_FILES="scripts/run-checks.sh,AGENTS.md" CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`.
- **Backend-only ticket**: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --backend`
- **Frontend-only ticket**: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --frontend`
- **Desktop-first ticket (Tauri + React, no functions/)**: `CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend" SHIM_CHANGED_FILES="<src,src-tauri paths>" npm run checks` — do not require Appwrite deploy or `verify:test-env` unless the ticket is hybrid/cloud.
- **Large refactor checkpoint**: `CHECK_MODE=full SHIM_CHECKS_ARGS="" npm run checks -- --refactor`
- **Release/deploy gate**: Run `SHIM_RUN_NPM_AUDIT=1 CHECK_MODE=full SHIM_CHECKS_ARGS="" npm run checks -- --refactor`, then the relevant Appwrite verify/smoke scripts before any real deploy.
- **Dependency-change gate**: If `package.json`, package lockfiles, or dependency tooling changed, also run `SHIM_RUN_NPM_AUDIT=1 CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` or document why a known pre-existing vulnerability is out of scope.
- **AI review (legacy shim):** Disabled (`SHIM_RUN_AI_REVIEW=0`). Use `@review-ticket` instead. Do not pass `--no-ai-review` to shim unless running legacy full gate; never use Shim AI review as ticket completion gate.
- **AI review diff when changes are already committed**: `scripts/ai-code-review.sh` first reviews unstaged and staged hunks for scoped paths. If that diff is empty (clean tree) but you still need a binding Codex/Ollama review, set a base commit-ish so the review compares **current tree vs base** for those paths: `SHIM_AI_REVIEW_BASE_REF=main` or `HEAD~1`, `origin/main`, etc. Example (snippet scope + committed ticket files):  
  `SHIM_AI_REVIEW_BASE_REF=main CHECK_MODE=snippet SHIM_CHANGED_FILES="src/foo.ts,docs/bar.md" SHIM_CHECKS_ARGS="" npm run checks`  
  Alias: `AI_REVIEW_BASE_REF` (same meaning). Invalid `SHIM_AI_REVIEW_BASE_REF` fails the check (fix the ref and rerun).
- **AI provider failures**: Codex usage limits, CLI failures, or missing `VERDICT: ACCEPT` do not count as a passed gate. Keep the ticket open and rerun the same scoped Shim command when the provider is available.
- **Ollama AI review (`SHIM_AI_REVIEW_PROVIDER=ollama`)**: The key must be available to **bash**, not only to Vite. Use exact name `OLLAMA_API_KEY` (Bearer token for `https://api.ollama.com/api/generate`). Copy `.env.shim.local.example` → `.env.shim.local`, or `export OLLAMA_API_KEY=...` in the same terminal before `npm run checks`. `.env.local` is **not** loaded by `run-checks.sh`. Verify: `bash -c '[[ -n \"$OLLAMA_API_KEY\" ]] && echo ok || echo missing'`.

### Currently disabled or conditional

- Deno checks are disabled for the default gate because Functions are Node/Appwrite bundles.
- npm audit, Full Explanation Check, SAST/Semgrep, Snyk, Complexity, Mutation, i18n, and E2E are conditional checks for release, security, dependency, or UI-specific work.
- Gitleaks, Architecture, Shellcheck, and AI Review are controlled via `.shimwrappercheckrc`; missing local tools may skip with an explicit message, but real findings in the changed scope must be fixed before push/deploy.

## Repository structure

- **Frontend**: `src/` — React + Vite + TypeScript + Tailwind + Radix UI
- **Backend (Appwrite Functions)**: `functions/` — Node/Appwrite Functions bundled with esbuild for `index.js` entrypoints (scriptony-ai, scriptony-assistant, scriptony-audio, scriptony-image, scriptony-style, etc.)
- **Shared types / lib**: `src/lib/`, `src/types/`
- **Infrastructure**: `infra/appwrite/` — Docker Compose for local Appwrite
- **Scripts**: `scripts/` — deploy, verify, smoke-test scripts

## Repository Hygiene (Zwingend)

- **Keine Ticket-, Deploy- oder Snippet-Dokumente in `src/` oder `functions/`**.
  Alle `.md`, `.sql`, `.txt` und `*SNIPPET*`-Dateien gehören nach `docs/` oder `tickets/`.
- **`src/`-Root darf nur Code-Entrypoints und Feature-Ordner enthalten.**
  Temp-Dateien (`temp-*`, `FIXED_*`, `*SNIPPET*`, `PASTE_THIS*`, `VideoEditorTimeline_CLEAN.tsx` etc.) müssen sofort in `docs/archive/` verschoben oder gelöscht werden.
- **Keine Build-Artefakte, Zips oder `node_modules/` commiten.**
  `build/`, `dist/`, `*.zip` (außer Release-Assets in `tools/*/dist/`), `functions/**/node_modules/` sind in `.gitignore` gepflegt und dürfen nicht getrackt werden.
- **Keine temporären `.txt` oder `.sql` Skripte in Komponenten-Ordnern** (`src/components/`). Datenbank-Skripte gehören nach `scripts/sql/` oder `docs/sql/`.
- **Keine Duplikate derselben Datei** (`VideoEditorTimeline.tsx` neben `VideoEditorTimeline_CLEAN.tsx`).
  Eindeutige Quelle: `git mv` verwenden statt Kopien anzulegen.
- **Legacy-Backends und Docker-Templates** (z. B. `backend/auth/`, `docker-compose.legacy.yml`) gehören in `docs/archive/` oder `infra/legacy/`.
- **Blender-Artefakte** leben unter `tools/blender/`; `.zip`-Dateien werden dort gebaut und nicht ins Repo committed.
- **Diagramme und Visualisierungen** (`.png`, `.html`) gehören in `docs/assets/` oder `docs/archive/`.
- **Ticket-Naming-Schema (verbindlich):** Alle Tickets unter `tickets/` folgen dem Format:  
  `{status}-T{NN}-{ziel}-{name}.md`
  - `status`: `todo` | `at-work` | `done`
  - `T{NN}`: Ticket-Nummer (z. B. `T20`, `T21`, `T24`)
  - `ziel`: `plan` (Architektur-Planung) | `implementation` (konkrete Umsetzung) | `bugfix` (Bugfix)
  - `name`: Kurze, beschreibende Bezeichnung
  - **Beispiele:**
    - `done-T20-plan-storage-zielmodell.md` — Planung fertig
    - `todo-T24-implementation-storage-implementieren.md` — Umsetzung offen
    - `at-work-T25-bugfix-auth-timeout.md` — Bugfix in Arbeit
  - Planungs-Tickets (`plan`) enthalten Zielmodell, Datenmodelle und Architektur-Skizzen. Implementation-Tickets (`implementation`) enthalten den eigentlichen Code, Collections und Tests.

## Project rules

### Frontend (React/Vite/TypeScript)

- **Desktop-first:** Prefer `src/lib/api-adapter/` + `dispatchByRuntime` for project/world/timeline data; use `LocalBackend` / `src/local/` for file-based projects. Appwrite SDK paths are for **cloud/hybrid** features unless a local adapter exists.
- **Use Appwrite SDK** (`src/lib/api/`): Cloud/hybrid calls go through the API layer. No raw `fetch` to Appwrite endpoints in components.
- **React Query** for server state: No direct `fetch`/Axios calls in UI components; use `@tanstack/react-query` hooks.
- **No business logic in components**: Logic in hooks (`src/hooks/`) or services; keep pages and components slim.
- **File and component size**: Max 300 lines per file, max 150 lines per component. Split when exceeding.
- **Explicit types**: Strict TypeScript, no `any` (use `unknown` + type guard if needed). Clear interfaces for props and API responses.
- **Tailwind CSS**: Use Tailwind utility classes; custom values via `tailwind.config.js`. No hardcoded colors (`#hex`) in code — use theme variables.
- **Radix UI primitives**: Use Radix for accessible components (dialogs, dropdowns, etc.). Do not rebuild what Radix provides.
- **Accessibility**: Semantic HTML, keyboard navigation, `aria-label` for icon-only buttons.
- **Error handling**: Always handle loading/error states in UI. Use sonner for toasts. Never swallow errors silently.
- **Long-running loads (global, verbindlich):** Any operation that may take **>5 seconds** (Sidecar boot, model download, TTS, large import, cloud sync, etc.) **must** use the global loading progress API — not ad-hoc spinners or local-only panels.
  - **Provider:** `GlobalLoadingProgressProvider` in `src/App.tsx` (wraps `AppContent`).
  - **Hook:** `useGlobalLoadingProgress()` from `src/hooks/useGlobalLoadingProgress.tsx`.
  - **Preferred API:** `runWithProgress({ id, title, initialMessage, initialPercent, run: (report) => … })` — `report({ percent, message, phase? })` updates the overlay.
  - **Manual tracking:** `startTask` / `reportProgress` / `endTask` when `runWithProgress` does not fit (e.g. streaming multi-step jobs).
  - **UI rule:** Under **5 s** → local control spinner only (button/row). **After 5 s** → global panel bottom-right (`GlobalLoadingProgressHost`): **title**, **%**, **status text**, progress bar. Multiple concurrent tasks show the newest visible task + count.
  - **Types/helpers:** `src/lib/loading/global-loading-progress.ts` (`LoadingProgressUpdate`, `GLOBAL_LOADING_DETAIL_DELAY_MS = 5000`).
  - **Do not** duplicate Kokoro-only panels; domain code (e.g. `src/lib/kokoro/kokoro-loading-progress.ts`) reports phases via `report()` into this global system.
  - **New features:** If you add a slow load path, wire progress messages that describe the **current step** (not generic „Loading…“).

### Backend (Appwrite Functions / Node.js / Hono)

- **Hono framework**: All Appwrite functions use Hono for routing. Keep handlers slim; business logic in service files.
- **Module independence**: A function module must not import from other function modules. Shared code lives in `_shared/`.
- **`_shared/` convention**: Shared utilities, types, and services under `functions/_shared/`. Import with relative paths.
- **Environment variables**: All secrets via Appwrite function env vars. Never hardcode API keys or tokens. Use `functions/_shared/env.ts` for env access.
- **Input validation**: Validate all inputs with Zod at the handler level before processing.
- **Error responses**: Use Hono's HTTPException or structured `{ success: false, error: { code, message } }` responses.
- **File size**: Max 300 lines per file (hard limit 500). Split large functions into service modules.
- **Runtime compatibility**: Functions must remain compatible with the Appwrite Node runtime and the esbuild bundling/deploy scripts. Do not introduce Deno-only APIs.
- **Generated bundles**: Treat checked-in `functions/**/index.js` files as generated/deploy artifacts. Do not manually format, lint, or edit them unless the task explicitly updates a legacy bundle workflow.

### Security

- Never expose Appwrite API keys or function secrets in responses or logs.
- Validate and sanitize all user inputs (Zod schemas).
- Do not store tokens in `localStorage` unless required and documented.
- Use Appwrite's built-in auth — do not roll your own auth system.

### Testing

- **Frontend**: `npm run test` (Vitest). Write tests for hooks, utilities, and API layers.
- **Backend**: Use Function service tests where available and the shimmed Appwrite Function build check. Focus on service logic and route contracts, not framework boilerplate.

## Timeouts

If a check runs too long and times out (e.g. AI review or Full Explanation with Codex), increase the timeout as needed:

- AI / Codex checks: Set `SHIM_AI_TIMEOUT_SEC` in `.shimwrappercheckrc` or in the dashboard. Default is often 180 seconds; for large diffs use e.g. `SHIM_AI_TIMEOUT_SEC=300` (5 minutes) or higher. Then re-run the checks.

## README and docs

When you add features, change behavior, or add new options, update the README and relevant docs so they stay in sync.

- **Living sections:** see [`.cursor/readme-contract.md`](.cursor/readme-contract.md) — feature tables, `## Recent changes`, `docs/GETTING_STARTED.md`, `docs/TEST_COVERAGE_REGISTRY.md`.
- **Commit/push:** use the `commit-push-safe` skill (step 5b) — README updates belong in the **same commit** as user-facing code.
- **Gate:** `scripts/check-readme-scope.sh` runs as shim `updateReadme` in `npm run checks`. Bypass only with `SKIP_README_SCOPE_CHECK=1` and a documented reason in the PR.

## Agent harness (ECC-aligned)

| Layer | Tool |
|-------|------|
| Quality gate | `@ecc-check` → `npm run verify` + `@review-ticket` + AgentShield |
| Epic intake | `@feature-intake` → `.qa/design/` + `.qa/intake/` (draft issues) |
| Issue runner | `@ecc-runner` + `.qa/queue/` (global: `~/.cursor/skills/ecc-runner/`) |
| Design (single slice) | `@pingpong-solution` when label `needs-design` |
| Implementation | `@implement` + `.qa/acceptance/` |
| Verify | `@verify-ticket` |
| Ship | `@commit-push-safe` / `@commit-pr-safe` |

**Pipeline (new features):**

```
@feature-intake  →  (review draft)  →  Issues anlegen  →  @ecc-runner
```

- Epic designs: `.qa/design/`
- Issue drafts: `.qa/intake/` (JSON created by `feature-intake create` only after user OK)
- Runner profile: `.qa/runner-profile.yaml`
- Legacy markdown tickets in `tickets/` remain archive; **new work → GitHub Issues**

## Customize below

Add project-specific rules, structure, and conventions so agents follow your repo.
