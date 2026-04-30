#!/usr/bin/env bash
# Deploy scriptony-media-worker to Appwrite (new active deployment).
# Prerequisite: `npx appwrite-cli login` + linked project; function id `scriptony-media-worker` exists
# (see scripts/appwrite-create-functions.sh). Run from any cwd.
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-media-worker"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-media-worker (esbuild)…"
cd "$FUN"
npx --yes esbuild scriptony-media-worker/index.ts \
  --bundle \
  --platform=node \
  --target=node16 \
  --format=cjs \
  --outfile="$STAGE/index.js"

echo "Deploying bundle (entrypoint index.js)…"
npx --yes appwrite-cli functions create-deployment \
  --function-id scriptony-media-worker \
  --code ".deploy-staging/scriptony-media-worker" \
  --activate true \
  --entrypoint "index.js" \
  --commands ""

echo "Done."