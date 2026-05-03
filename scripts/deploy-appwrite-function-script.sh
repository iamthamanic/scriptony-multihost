#!/usr/bin/env bash
# Deploy scriptony-script to Appwrite (new active deployment).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-script"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-script (esbuild)…"
cd "$FUN"
npx --yes esbuild scriptony-script/appwrite-entry.ts \
  --bundle \
  --platform=node \
  --target=node16 \
  --format=cjs \
  --outfile="$STAGE/index.js" \
  --legal-comments=none \
  --external:node:*

if [[ ! -s "$STAGE/index.js" ]]; then
  echo "error: bundle is missing or empty: $STAGE/index.js" >&2
  exit 1
fi

echo "Deploying bundle (entrypoint index.js)…"
npx --yes appwrite-cli functions create-deployment \
  --function-id scriptony-script \
  --code ".deploy-staging/scriptony-script" \
  --activate true \
  --entrypoint "index.js" \
  --commands ""

echo ""
echo "Done."
