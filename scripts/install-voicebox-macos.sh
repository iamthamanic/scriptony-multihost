#!/usr/bin/env bash
# Install Voicebox.app to /Applications (macOS). Apple Silicon or Intel.
# Usage: ./scripts/install-voicebox-macos.sh
set -euo pipefail

TARGET="/Applications/Voicebox.app"
ARCH="$(uname -m)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

case "$ARCH" in
  arm64)
    URL="https://github.com/jamiepine/voicebox/releases/latest/download/voicebox_aarch64.app.tar.gz"
    ARCHIVE="voicebox_aarch64.app.tar.gz"
    ;;
  x86_64)
    URL="https://github.com/jamiepine/voicebox/releases/latest/download/voicebox_x64.app.tar.gz"
    ARCHIVE="voicebox_x64.app.tar.gz"
    ;;
  *)
    echo "Unsupported architecture: $ARCH" >&2
    exit 1
    ;;
esac

echo "→ Downloading Voicebox ($ARCH)…"
curl -fsSL "$URL" -o "$TMP_DIR/$ARCHIVE"

echo "→ Extracting…"
tar -xzf "$TMP_DIR/$ARCHIVE" -C "$TMP_DIR"

APP_SRC="$TMP_DIR/Voicebox.app"
if [[ ! -d "$APP_SRC" ]]; then
  APP_SRC="$(find "$TMP_DIR" -maxdepth 2 -name 'Voicebox.app' -type d | head -1)"
fi
if [[ ! -d "$APP_SRC" ]]; then
  echo "Voicebox.app not found in archive" >&2
  exit 1
fi

if [[ -d "$TARGET" ]]; then
  echo "→ Removing existing $TARGET"
  rm -rf "$TARGET"
fi

echo "→ Installing to $TARGET"
mv "$APP_SRC" "$TARGET"

echo "→ Clearing quarantine (Gatekeeper)"
xattr -cr "$TARGET" 2>/dev/null || true

echo "✓ Voicebox installed: $TARGET"
echo "  Start once manually, then Scriptony can auto-launch on port 17493."
echo "  Add to .env.local:"
echo "    VITE_VOICEBOX_APP_PATH=/Applications/Voicebox.app"
echo "    VITE_VOICEBOX_APP_NAME=Voicebox"
