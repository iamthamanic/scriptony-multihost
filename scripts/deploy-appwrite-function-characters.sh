#!/usr/bin/env bash
# Deploy scriptony-characters to Appwrite (appwrite-entry.ts).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-characters"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-characters (esbuild)…"
cd "$FUN"
npx --yes esbuild scriptony-characters/appwrite-entry.ts \
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
  --function-id scriptony-characters \
  --code ".deploy-staging/scriptony-characters" \
  --activate true \
  --entrypoint "index.js" \
  --commands ""

echo "Done. scriptony-characters deployed."
