#!/usr/bin/env bash
# Deploy scriptony-project-nodes to Appwrite (appwrite-entry.ts).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-project-nodes"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-project-nodes (esbuild)…"
cd "$FUN"
npx --yes esbuild scriptony-project-nodes/appwrite-entry.ts \
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
  --function-id scriptony-project-nodes \
  --code ".deploy-staging/scriptony-project-nodes" \
  --activate true \
  --entrypoint "index.js" \
  --commands ""

echo "Done. scriptony-project-nodes deployed."
