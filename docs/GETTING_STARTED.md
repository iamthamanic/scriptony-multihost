# Scriptony — Getting Started (Agent Reference)

> **Purpose**: Single source of truth for how to start and run the Scriptony
> dev stack. Every AI agent working on this repo MUST read this file before
> touching infrastructure, deployment, or environment setup.

---

## 1. Environment Secrets

The project uses a remote Appwrite server.

### Where credentials live

| File                     | What it contains                               | Used by              |
| ------------------------ | ---------------------------------------------- | -------------------- |
| `.env.local` (repo root) | `VITE_APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY` | Vite, deploy scripts |

**Rule:** Never commit the API key. The key must have scopes
`databases.read`, `databases.write`, `collections.write`.

---

## 2. Start the Dev Stack

### Option C — Tauri desktop (default for product work)

Native desktop shell around the same React/Vite UI. **Default runtime in Tauri is `local`** (`src/runtime/detect-runtime.ts`) — workspace scan + `.scriptony` folders, not Appwrite, unless you override env or switch profile in Settings.

**Prerequisites:** Rust toolchain (`cargo`, `rustc`). Install via [rustup](https://rustup.rs/) if missing.

```bash
docker stop scriptony-frontend 2>/dev/null || true
npm run dev:desktop
```

What happens:

1. `tauri dev` runs `beforeDevCommand`: `npm run dev:vite` (Vite on **port 3000**).
2. The **Tauri window** loads `http://localhost:3000` — this is **not** “use the web app in Safari/Chrome”; it is the desktop WebView with HMR.
3. Production desktop builds use `dist/` (`npm run build:desktop`) — no dev server.

**First-time in app:** pick a **workspace folder** (First-run gate or Settings → Speicher), then open or create a **`.scriptony`** project for full `LocalBackend` features.

**`.env.local` (recommended for desktop-only work):**

```bash
VITE_SCRIPTONY_RUNTIME=local
# Optional: omit or comment Appwrite vars until you need hybrid KI/TTS/sync.
```

See **[DESKTOP_FIRST_DEV.md](DESKTOP_FIRST_DEV.md)** (agent checklist, cloud-only APIs), **[ARCHITECTURE_LOCAL_CLOUD.md](ARCHITECTURE_LOCAL_CLOUD.md)** (3 Achsen, layer rules), **[DOMAIN_GLOSSAR.md](DOMAIN_GLOSSAR.md)** (domain → SQLite → routes), and **[LOCAL_PROJECT_FORMAT.md](LOCAL_PROJECT_FORMAT.md)**.

### Repo map (local vs cloud code)

```
src/backend/local/          → SQLite source of truth (desktop)
src/backend/appwrite/       → Web cloud backend
src/backend/sync/           → Per-project cloud activation (T40)
src/lib/api/                → Facades (UI imports only this)
src/lib/api-adapter/        → dispatchByRuntime + *-local.ts
src/lib/api/*-cloud-http.ts → Appwrite Functions gateway routes
src/capabilities/         → Feature capability registry
src/lib/auth/cloud-session.ts → JWT session (Axis 2)
```

**Port 3000 conflict:** If `npm run dev` (Docker) already started `scriptony-frontend` on port 3000:

```bash
docker stop scriptony-frontend
```

**Build installer:** `npm run build:desktop` — see **`docs/DESKTOP_RELEASE.md`** for signed releases, GitHub Actions, and in-app auto-update.

**Cloud login on desktop (Axis 2):** Header cloud button → **Scriptony Cloud** dialog with tabs **Managed** (`.env.local` `VITE_APPWRITE_*`) and **Self Host** (save server URL + Project ID to localStorage via T41 store — does not switch runtime profile). Email/password only; enable **Email/Password** in Appwrite Console. OAuth is not used for desktop cloud session.

**Override to cloud on desktop (testing only):** `VITE_SCRIPTONY_RUNTIME=cloud` in `.env.local`.

---

### Option A — Full local Docker (Appwrite + Bridge + Vite)

Use this when you need the **whole** stack locally (Appwrite DB, Redis,
MariaDB, Bridge, ComfyUI, Blender):

```bash
npm run dev
```

What it does:

1. Starts Docker Compose (`infra/appwrite/docker-compose.yml`)
2. Starts `scriptony-bridge` container
3. Waits for health checks
4. Starts Vite on `http://localhost:3000`

**Gotcha**: The `scriptony-frontend` container also binds port `3000`. If
Vite fails with "port 3000 occupied", stop the container:

```bash
docker stop scriptony-frontend
# then run Vite directly
npx vite
```

### Option B — Vite only (connects to remote Appwrite)

Use this for day-to-day frontend work when the remote Appwrite is already
running:

```bash
npm run dev:vite
```

### Local project format (`.scriptony`, T37)

Solo projects are stored as folders: `My_Movie.scriptony/` with `scriptony.json`,
`database.sqlite`, and `assets/`. See **[LOCAL_PROJECT_FORMAT.md](LOCAL_PROJECT_FORMAT.md)**.

TypeScript API: `src/local/` (`createProjectFolder`, `openProjectFolder`). Requires
desktop (`npm run dev:desktop`). **T38** LocalBackend (projects/structure/scripts); **T39** local assets; **T40** per-project Cloud Sync activation.

### Self-hosted Appwrite (T41)

Studios can connect a private Appwrite instance without Docker locally:

1. Open **Settings → System Status**
2. Add endpoint + project ID, **Test connection**, then **Save & activate**
3. Switch runtime to **Self-hosted Appwrite**

The UI stores connections in `localStorage` and overrides `VITE_APPWRITE_*` for the active session. Ensure your Appwrite Console lists the Scriptony web origin in OAuth/Web redirects (CORS).

### Local jobs sidecar (T43)

In **local** runtime, job HTTP calls target `http://127.0.0.1:3765` (override: `VITE_SCRIPTONY_SIDECAR_PORT`).

When a `.scriptony` project opens on desktop, Tauri spawns:

```bash
npm run sidecar:dev
```

(requires `SCRIPTONY_PROJECT_DIR` — set automatically by the desktop shell)

Manual test:

```bash
SCRIPTONY_PROJECT_DIR=/path/to/MyProject.scriptony npm run sidecar:dev
curl http://127.0.0.1:3765/health
```

MVP routes: `GET /health`, `POST /v1/jobs/:functionName`, `GET /v1/jobs/:id/status`, `GET /v1/jobs/:id/result`.

---

## 3. Deploy Database Collections

Collections are defined as JSON specs in `infra/appwrite/collections/*.json`.
The deploy script reads them and creates/updates them on the configured
Appwrite server.

```bash
# Run checks first (mandatory gate — do not skip)
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks

# Then deploy
node scripts/infra/deploy-collections.mjs
```

**Prerequisites**:

- `.env.local` must have `APPWRITE_API_KEY` with scopes
  `databases.read`, `databases.write`, `collections.write`
- The script auto-loads `.env.local` explicitly (not just via
  `loadAppwriteCliEnv()`)

**Supported attribute types** in JSON specs: `string`, `integer`, `double`,
`float`, `boolean`, `bool`, `datetime`

---

## 4. Deploy Appwrite Functions

### Deploy a single function

```bash
./scripts/deploy-appwrite-function.sh scriptony-<name>
# e.g.
./scripts/deploy-appwrite-function.sh scriptony-audio-story
```

### Deploy all functions

```bash
./scripts/deploy-all-appwrite-functions.sh
```

**Prerequisites**:

- `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY` in env
- Appwrite CLI logged in (`npx appwrite-cli login` if using CLI directly)

---

## 5. Run Checks

Always run checks before pushing or deploying.

```bash
# Normal ticket (changed code only)
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks

# Frontend-only ticket
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --frontend

# Backend-only ticket
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --backend

# Full refactor checkpoint
CHECK_MODE=full SHIM_CHECKS_ARGS="" npm run checks -- --refactor
```

---

## 6. Known Fixes & Gotchas

### Bridge container crashes with `Dynamic require of "fs" is not supported`

**Root cause**: `local-bridge/package.json` bundles `dotenv` via esbuild ESM.
**Fix**: The build script must externalise `dotenv`, `node-appwrite`, `zod`:

```json
"build": "esbuild src/index.ts --bundle --platform=node --target=node18 --format=esm --outfile=dist/index.js --external:dotenv --external:node-appwrite --external:zod"
```

After changing `package.json`, rebuild the image:

```bash
docker build -t scriptony-bridge:latest local-bridge/
docker compose --env-file infra/appwrite/.env up -d bridge
```

### Audio crackles at app start

**Root cause**: `AudioFileList.tsx` eagerly creates `new Audio()` for every
file on mount with `preload: "metadata"`.
**Fix**: Create audio elements **lazily** (on first Play click) with
`preload: "none"`. Only clean up (stop + clear refs) in `useEffect`.

### Appwrite 401 "user_unauthorized" during collection deploy

**Root cause**: The API key is correct but the deploy script may not load
`.env.local` before `loadAppwriteCliEnv()`.
**Fix**: `scripts/infra/deploy-collections.mjs` loads `.env.local`
explicitly at the top. If the issue persists, verify the key has scope
`databases.write` in the Appwrite Console.

---

## 7. File Map for Infra Work

| File                                       | Purpose                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| `.env.local`                               | Frontend + deploy env (endpoint, project ID, API key)                        |
| `.env.server.local`                        | Server-side override (backup API key)                                        |
| `infra/appwrite/collections/*.json`        | Collection schemas (attributes, indexes)                                     |
| `scripts/infra/deploy-collections.mjs`     | Deploys all collections from JSON specs                                      |
| `scripts/deploy-appwrite-function.sh`      | Deploys a single function bundle                                             |
| `scripts/deploy-all-appwrite-functions.sh` | Deploys every function in `functions/`                                       |
| `scripts/setup-audio-collections.js`       | Legacy setup script (superseeded by `deploy-collections.mjs` for most cases) |
| `local-bridge/package.json`                | Bridge build config (must extern deps for Docker)                            |
| `docker-compose.yml`                       | Local Docker stack (Appwrite + Bridge + Frontend nginx)                      |
| `scripts/dev-with-bridge.sh`               | Full local dev stack startup script                                          |

---

## 8. Decision Tree

```
Primary work: Tauri local app (default)?
  → docker stop scriptony-frontend (if needed)
  → npm run dev:desktop
  → Workspace folder + open .scriptony project
  → See docs/DESKTOP_FIRST_DEV.md
  → Checks: CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend" (no function deploy)

Need to change DB schema?
  → Edit infra/appwrite/collections/<name>.json
  → Run: node scripts/infra/deploy-collections.mjs

Need to add a new collection?
  → Create JSON spec in infra/appwrite/collections/
  → Add filename to collectionFiles[] in deploy-collections.mjs
  → Run: node scripts/infra/deploy-collections.mjs

Need to change function code?
  → Edit files in functions/<name>/
  → Run checks: CHECK_MODE=snippet npm run checks -- --backend
  → Deploy: ./scripts/deploy-appwrite-function.sh scriptony-<name>

Need to test frontend only?
  → npm run dev:vite

Need full local stack?
  → npm run dev
  → If port 3000 is taken: docker stop scriptony-frontend && npx vite
```

---

**Last updated**: 2026-06-03 — Desktop-first (Option C) as default; runtime docs aligned with `detect-runtime.ts`.
**Maintainers**: Keep this file in sync when adding new collections, scripts,
or environment requirements.
