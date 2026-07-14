#!/usr/bin/env bash
# Stop orphan Vite/Tauri processes and start Scriptony desktop dev cleanly.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

docker stop scriptony-frontend 2>/dev/null || true
pkill -f "${ROOT}/node_modules/.bin/vite" 2>/dev/null || true
pkill -f "${ROOT}/node_modules/.bin/tauri dev" 2>/dev/null || true
pkill -f "${ROOT}/src-tauri/target/debug/scriptony" 2>/dev/null || true

sleep 1
if lsof -i :3000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[scriptony] Port 3000 still busy:"
  lsof -i :3000 -sTCP:LISTEN
  echo "Kill the PID above, then rerun this script."
  exit 1
fi

echo "[scriptony] Starting npm run dev:desktop …"
exec npm run dev:desktop
