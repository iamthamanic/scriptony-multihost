# Desktop release & auto-update

Scriptony desktop builds use **Tauri 2** with the official updater plugin. Published versions live in **GitHub Releases** — no separate “live version” repository.

## Maintainer: release in 5 minutes

**You (once):**

1. GitHub → **Settings → Secrets → Actions** → `TAURI_SIGNING_PRIVATE_KEY` = full contents of `.tauri/scriptony-updater.key`
2. Generate key locally if missing: `CI=true npx tauri signer generate -w .tauri/scriptony-updater.key -f`
3. **macOS Gatekeeper:** complete [macOS code signing (one-time)](#macos-code-signing-one-time) below

**Every release:**

```bash
# 1. Bump version (same value in all three files)
#    package.json, src-tauri/tauri.conf.json, src-tauri/Cargo.toml

# 2. Pre-flight
npm run release:desktop:check

# 3. Commit & push main, then tag
git tag app-v0.1.3
git push origin app-v0.1.3
```

4. Wait for **Actions → Desktop Release** (green)
5. Open **Releases → latest** — verify installers + `latest.json`
6. Install once yourself; test **Einstellungen → System → Nach Updates suchen**

**User download (first install):**  
https://iamthamanic.github.io/scriptony-multihost/

GitHub Releases (Assets + Changelog):  
https://github.com/iamthamanic/scriptony-multihost/releases/latest

**GitHub Pages (one-time):** Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.  
Workflow: `.github/workflows/pages.yml` deploys `docs/pages/` on push to `main`.

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

### Tauri updater signing keys

```bash
mkdir -p .tauri
CI=true npx tauri signer generate -w .tauri/scriptony-updater.key -f
```

- **Public key** → `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`)
- **Private key** → GitHub secret `TAURI_SIGNING_PRIVATE_KEY` (never commit)

### macOS code signing (one-time)

Required for **normal DMG install** without Terminal (`xattr -cr`). Costs **Apple Developer Program** (99 USD/year).

#### 1. Create certificate (on your Mac)

1. **Keychain Access** → Certificate Assistant → **Request a Certificate From a Certificate Authority** → save `.certSigningRequest`
2. [Apple Developer → Certificates](https://developer.apple.com/account/resources/certificates/list) → **+** → **Developer ID Application** (not App Store / Apple Distribution)
3. Upload CSR → download `.cer` → double-click to install

#### 2. Export `.p12`

1. Keychain → **My Certificates** → expand **Developer ID Application: …**
2. Right-click the **private key** → **Export** → `scriptony-dev-id.p12` + password

#### 3. App-specific password

[appleid.apple.com](https://appleid.apple.com) → Sign-In and Security → **App-Specific Passwords** → create one for “Scriptony CI”

#### 4. Push secrets to GitHub

Helper script (prints values + `gh` commands):

```bash
npm run setup:apple-signing
# or: bash scripts/export-apple-certificate-for-ci.sh ~/path/scriptony-dev-id.p12
```

| GitHub secret | Value |
|---------------|--------|
| `APPLE_CERTIFICATE` | Base64 of `.p12` (written to `.tauri/apple-certificate-base64.txt`) |
| `APPLE_CERTIFICATE_PASSWORD` | Export password |
| `APPLE_SIGNING_IDENTITY` | From `security find-identity -v -p codesigning` — full string |
| `APPLE_TEAM_ID` | 10-char Team ID in parentheses |
| `APPLE_ID` | Apple ID email |
| `APPLE_PASSWORD` | App-specific password (not your login password) |

Upload example:

```bash
gh secret set APPLE_CERTIFICATE < .tauri/apple-certificate-base64.txt
gh secret set APPLE_CERTIFICATE_PASSWORD
gh secret set APPLE_SIGNING_IDENTITY --body "Developer ID Application: Your Name (TEAMID)"
gh secret set APPLE_TEAM_ID --body "TEAMID"
gh secret set APPLE_ID --body "you@example.com"
gh secret set APPLE_PASSWORD
```

CI imports the cert into a temporary keychain (`.github/workflows/desktop-release.yml`) and Tauri **signs + notarizes** the `.dmg`.

#### 5. Verify after next release

```bash
codesign -dv --verbose=4 /Applications/Scriptony.app   # Developer ID Application
spctl -a -vv /Applications/Scriptony.app             # accepted
```

## Local signed build (optional)

```bash
export TAURI_SIGNING_PRIVATE_KEY="$(cat .tauri/scriptony-updater.key)"
# With cert in keychain:
export APPLE_SIGNING_IDENTITY="Developer ID Application: …"
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
| `scripts/export-apple-certificate-for-ci.sh` | Export `.p12` → base64 + secret checklist |
| `.github/workflows/desktop-release.yml` | CI: keychain import + sign + notarize |
| `src/lib/desktop/desktop-release-constants.ts` | GitHub release URLs (DRY) |
| `src/lib/desktop/app-updater.ts` | Check / install / relaunch |
| `src/lib/desktop/desktop-update-preferences.ts` | Startup check toggle |
| `src/hooks/useAppUpdater.ts` | Settings UI state |
| `src/components/settings/AppUpdateCard.tsx` | Settings card |
| `src/lib/desktop/prompt-app-update.ts` | Startup dialog |
| `scripts/check-desktop-release-ready.mjs` | Pre-tag validation |

## macOS / Windows notes

- **macOS:** Without Apple secrets, builds are ad-hoc signed → users see **“App ist beschädigt”** after browser download.
- **Windows:** Installer may quit the running app during update — expected Tauri behavior.

### macOS workaround (unsigned builds only)

```bash
xattr -cr /Applications/Scriptony.app
```

See also [Tauri macOS signing](https://v2.tauri.app/distribute/sign/macos/) and `docs/GETTING_STARTED.md` Option C (desktop dev).
