#!/usr/bin/env bash
# Install Understand Anything skills for Cursor/agents (scriptony-multihost).
# Clones upstream once to ~/.understand-anything/repo, builds core, symlinks skills.

set -euo pipefail

REPO_URL="${UA_REPO_URL:-https://github.com/Egonex-AI/Understand-Anything.git}"
REPO_DIR="${UA_DIR:-$HOME/.understand-anything/repo}"
PLUGIN_ROOT="$REPO_DIR/understand-anything-plugin"
SKILLS_TARGET="$(cd "$(dirname "$0")/.." && pwd)/.agents/skills"
PLUGIN_LINK="$HOME/.understand-anything-plugin"

log() { printf '→ %s\n' "$*"; }

if [[ -d "$REPO_DIR/.git" ]]; then
  log "Updating $REPO_DIR"
  git -C "$REPO_DIR" pull --ff-only
else
  log "Cloning $REPO_URL → $REPO_DIR"
  mkdir -p "$(dirname "$REPO_DIR")"
  git clone --depth 1 "$REPO_URL" "$REPO_DIR"
fi

if [[ ! -f "$PLUGIN_ROOT/packages/core/dist/index.js" ]]; then
  log "Building @understand-anything/core (pnpm)…"
  (cd "$PLUGIN_ROOT" && pnpm install && pnpm --filter @understand-anything/core build)
fi

mkdir -p "$SKILLS_TARGET"
for skill in "$PLUGIN_ROOT/skills"/*/; do
  name="$(basename "$skill")"
  ln -sfn "$skill" "$SKILLS_TARGET/$name"
  log "Linked skill: $name"
done

if [[ -L "$PLUGIN_LINK" || -e "$PLUGIN_LINK" ]]; then
  log "Plugin link exists: $PLUGIN_LINK"
else
  ln -s "$PLUGIN_ROOT" "$PLUGIN_LINK"
  log "Linked $PLUGIN_LINK → $PLUGIN_ROOT"
fi

log "Done. Restart Cursor, then in this repo run:"
log "  /understand src/hooks/timeline --language de"
log "  /understand src/components/structure/timeline --language de"
log "  /understand-dashboard"
