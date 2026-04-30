#!/usr/bin/env bash
# Deploy scriptony-editor-readmodel to Appwrite (new active deployment).
# Prerequisite: `npx appwrite-cli login` + linked project; function id `scriptony-editor-readmodel` exists
# (see scripts/appwrite-create-functions.sh). Run from any cwd.
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUN="$ROOT/functions"
STAGE="$FUN/.deploy-staging/scriptony-editor-readmodel"

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "Bundling scriptony-editor-readmodel (esbuild)…"
cd "$FUN"
npx --yes esbuild scriptony-editor-readmodel/index.ts \
  --bundle \
  --platform=node \
  --target=node16 \
  --format=cjs \
  --outfile="$STAGE/index.js"

echo "Deploying bundle (entrypoint index.js)…"
npx --yes appwrite-cli functions create-deployment \
  --function-id scriptony-editor-readmodel \
  --code ".deploy-staging/scriptony-editor-readmodel" \
  --activate true \
  --entrypoint "index.js" \
  --commands ""

echo "Done."