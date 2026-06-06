# Desktop release & auto-update

Scriptony desktop builds use **Tauri 2** with the official updater plugin. Published versions live in **GitHub Releases** — no separate “live version” repository.

## Maintainer: release in 5 minutes

**You (once):**

1. GitHub → **Settings → Secrets → Actions** → `TAURI_SIGNING_PRIVATE_KEY` = full contents of `.tauri/scriptony-updater.key`
2. Generate key locally if missing: `CI=true npx tauri signer generate -w .tauri/scriptony-updater.key -f`

**Every release:**

```bash
# 1. Bump version (same value in all three files)
#    package.json, src-tauri/tauri.conf.json, src-tauri/Cargo.toml

# 2. Pre-flight
npm run release:desktop:check

# 3. Commit & push main, then tag
git tag app-v0.1.0
git push origin app-v0.1.0
```

4. Wait for **Actions → Desktop Release** (green)
5. Open **Releases → latest** — verify installers + `latest.json`
6. Install once yourself; test **Einstellungen → System → Nach Updates suchen**

**User download (first install):**  
https://github.com/iamthamanic/scriptony-multihost/releases/latest

---

## Architecture

```
Tag app-v1.0.1  →  GitHub Action builds installers + .sig + latest.json
Installed app   →  checks latest.json (see tauri.conf.json endpoint)
Settings → System → manual check + startup toggle
```

Update endpoint (`src-tauri/tauri.conf.json`):

`https://github.com/iamthamanic/scriptony-multihost/releases/latest/download/latest.json`

Canonical URL constants for UI: `src/lib/desktop/desktop-release-constants.ts`

## One-time setup

### Signing keys

```bash
mkdir -p .tauri
CI=true npx tauri signer generate -w .tauri/scriptony-updater.key -f
```

- **Public key** → `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`)
- **Private key** → GitHub secret `TAURI_SIGNING_PRIVATE_KEY` (never commit)

## Local signed build (optional)

```bash
export TAURI_SIGNING_PRIVATE_KEY="$(cat .tauri/scriptony-updater.key)"
npm run build:desktop
```

## In-app UX

| Location | Behavior |
|----------|----------|
| **Einstellungen → System** | Version, startup toggle, check/install, link to Releases |
| **App start (Tauri)** | Optional update dialog (toggle in settings) |

Web builds and `tauri dev` hide the updater UI.

## Code map

| File | Role |
|------|------|
| `src/lib/desktop/desktop-release-constants.ts` | GitHub release URLs (DRY) |
| `src/lib/desktop/app-updater.ts` | Check / install / relaunch |
| `src/lib/desktop/desktop-update-preferences.ts` | Startup check toggle |
| `src/hooks/useAppUpdater.ts` | Settings UI state |
| `src/components/settings/AppUpdateCard.tsx` | Settings card |
| `src/lib/desktop/prompt-app-update.ts` | Startup dialog |
| `scripts/check-desktop-release-ready.mjs` | Pre-tag validation |

## macOS / Windows notes

- **macOS:** Production updates expect signing + notarization for smooth Gatekeeper behavior.
- **Windows:** Installer may quit the running app during update — expected Tauri behavior.

See also `docs/GETTING_STARTED.md` Option C (desktop dev).
