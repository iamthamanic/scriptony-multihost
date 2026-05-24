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

### Option C — Tauri desktop (Cloud client, Phase 1)

Native desktop shell around the same React/Vite UI. Uses **cloud** runtime by
default (not local mode until T38).

**Prerequisites:** Rust toolchain (`cargo`, `rustc`). Install via
[rustup](https://rustup.rs/) if missing.

```bash
npm run dev:desktop
```

This runs `tauri dev`, which starts Vite on port **3000** and opens the
desktop window.

`tauri.conf.json` uses `beforeDevCommand: npm run dev:vite` (not `dev:web`) so
`dev:desktop` does not loop through `dev:web` → `tauri dev` again.

**Build installer:**

```bash
npm run build:desktop
```

**Port 3000 conflict:** If `npm run dev` (Docker) already started
`scriptony-frontend` on port 3000, stop it before desktop dev:

```bash
docker stop scriptony-frontend
```

Or use `npm run dev:desktop` without running full `npm run dev` first.

**OAuth / deep links (T36b):** Desktop OAuth uses custom scheme
`scriptony://auth-callback`. Register these URLs in the **Appwrite Console**
(Auth → redirect URLs):

- `http://localhost:3000`
- `http://localhost:3000/reset-password`
- `scriptony://auth-callback`
- `scriptony://auth-callback/reset-password`
- Your production web URL (`VITE_AUTH_REDIRECT_URL`)

Optional env (defaults match Capacitor):

```bash
VITE_CAPACITOR_URL_SCHEME=scriptony
VITE_CAPACITOR_CALLBACK_HOST=auth-callback
```

**Runtime override for desktop cloud testing:**

```bash
VITE_SCRIPTONY_RUNTIME=cloud
```

Local mode on desktop requires `VITE_SCRIPTONY_RUNTIME=local` explicitly
(after T38).

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

**Last updated**: 2026-05-14 — Added after Audio-Fix + Bridge-Fix session.
**Maintainers**: Keep this file in sync when adding new collections, scripts,
or environment requirements.
