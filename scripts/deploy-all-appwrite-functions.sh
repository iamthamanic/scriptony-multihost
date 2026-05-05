#!/usr/bin/env bash
# Roll out alle Scriptony-Functions — gleiches Muster wie die einzelnen
# scripts/deploy-appwrite-function-*.sh (esbuild + appwrite-cli create-deployment).
#
# Vorbedingung: npx appwrite-cli login, Projekt gelinkt, Function-IDs angelegt
# (scripts/appwrite-create-functions.sh).
#
# Reihenfolge: Basis (Auth/Projekt/Timeline) → KI → Stage/Media → Rest.
# Bei Fehler: mit CONTINUE_ON_DEPLOY_ERROR=1 nächste Function versuchen.

set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

CONTINUE_ON_DEPLOY_ERROR="${CONTINUE_ON_DEPLOY_ERROR:-0}"
FAILED=()

run_one() {
  local name=$1
  local fn_name="scriptony-${name}"
  echo ""
  echo "============ deploy: $fn_name ============"
  bash "$ROOT/scripts/deploy-appwrite-function.sh" "$fn_name" || return 1
  return 0
}

# Stammname = deploy-appwrite-function-<Stammname>.sh (bash 3–kompatibel, kein mapfile)
ORDER=(
  auth
  projects
  project-nodes
  characters
  ai
  assistant
  script
  shots
  style
  stage
  audio
  image
  mcp-appwrite
  clips
  gym
  worldbuilding
  stage2d
  stage3d
  sync
  jobs
  editor-readmodel
  media-worker
  beats
  assets
  audio-story
  style-guide
  video
)

for name in "${ORDER[@]}"; do
  if ! run_one "$name"; then
    FAILED+=("$name")
    if [[ "$CONTINUE_ON_DEPLOY_ERROR" != "1" ]]; then
      echo "Deploy fehlgeschlagen: $name" >&2
      exit 1
    fi
    echo "warn: $name fehlgeschlagen, weiter (CONTINUE_ON_DEPLOY_ERROR=1)…" >&2
  fi
done

if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo "Fertig mit Fehlern: ${FAILED[*]}" >&2
  exit 1
fi

echo ""
echo "Alle geplanten Function-Deploys in dieser Runde abgeschlossen."
echo "Optional: npm run appwrite:sync:function-domains && npm run verify:parity -- --require-auth"
