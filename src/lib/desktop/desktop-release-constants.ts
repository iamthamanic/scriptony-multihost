/**
 * Canonical GitHub release URLs for the Scriptony desktop app.
 * Keep in sync with `plugins.updater.endpoints` in src-tauri/tauri.conf.json.
 *
 * Location: src/lib/desktop/desktop-release-constants.ts
 */
export const DESKTOP_GITHUB_REPO = "iamthamanic/scriptony-appwrite";

export const DESKTOP_RELEASES_URL = `https://github.com/${DESKTOP_GITHUB_REPO}/releases`;

export const DESKTOP_LATEST_RELEASE_URL = `${DESKTOP_RELEASES_URL}/latest`;

export const DESKTOP_UPDATE_MANIFEST_URL = `${DESKTOP_LATEST_RELEASE_URL}/download/latest.json`;
