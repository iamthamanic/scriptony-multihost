#!/usr/bin/env bash
# Export Developer ID .p12 as base64 and print GitHub Actions secret checklist.
# Usage: ./scripts/export-apple-certificate-for-ci.sh [path/to/certificate.p12]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Scriptony — Apple signing secrets for GitHub Actions"
echo "===================================================="
echo ""

echo "Available code-signing identities on this Mac:"
security find-identity -v -p codesigning | grep "Developer ID Application" || {
  echo ""
  echo "No 'Developer ID Application' certificate found."
  echo "Create one at: https://developer.apple.com/account/resources/certificates/list"
  echo "See docs/DESKTOP_RELEASE.md § macOS code signing"
  exit 1
}
echo ""

P12_PATH="${1:-}"
if [ -z "$P12_PATH" ]; then
  read -r -p "Path to exported .p12 file: " P12_PATH
fi

if [ ! -f "$P12_PATH" ]; then
  echo "File not found: $P12_PATH"
  exit 1
fi

OUT="$ROOT/.tauri/apple-certificate-base64.txt"
mkdir -p .tauri
base64 -i "$P12_PATH" | tr -d '\n' > "$OUT"

IDENTITY="$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | sed -E 's/^[[:space:]]*[0-9]+) //; s/"$//')"
TEAM_ID="$(echo "$IDENTITY" | sed -nE 's/.*\(([A-Z0-9]{10})\)$/\1/p')"

echo ""
echo "✓ Base64 written to: $OUT"
echo ""
echo "Set these GitHub secrets (repo → Settings → Secrets → Actions):"
echo ""
echo "  APPLE_CERTIFICATE            ← contents of $OUT"
echo "  APPLE_CERTIFICATE_PASSWORD   ← password used when exporting .p12"
echo "  APPLE_SIGNING_IDENTITY       ← $IDENTITY"
if [ -n "$TEAM_ID" ]; then
  echo "  APPLE_TEAM_ID                ← $TEAM_ID"
fi
echo "  APPLE_ID                     ← your Apple ID email"
echo "  APPLE_PASSWORD               ← app-specific password (appleid.apple.com)"
echo ""
echo "Upload with gh CLI (after filling values):"
echo "  gh secret set APPLE_CERTIFICATE < $OUT"
echo "  gh secret set APPLE_CERTIFICATE_PASSWORD"
echo "  gh secret set APPLE_SIGNING_IDENTITY --body \"$IDENTITY\""
if [ -n "$TEAM_ID" ]; then
  echo "  gh secret set APPLE_TEAM_ID --body \"$TEAM_ID\""
fi
echo "  gh secret set APPLE_ID"
echo "  gh secret set APPLE_PASSWORD"
echo ""
echo "Then tag a release: git tag app-vX.Y.Z && git push origin app-vX.Y.Z"
