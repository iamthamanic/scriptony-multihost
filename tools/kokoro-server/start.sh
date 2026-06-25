#!/usr/bin/env bash
set -e

# Kokoro Local TTS Server Launcher
# Usage: ./start.sh --port 8080 --project-dir /path/to/project

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${KOKORO_PORT:-8080}"
PROJECT_DIR="${SCRIPTONY_PROJECT_DIR:-$SCRIPT_DIR}"
OUTPUT_DIR="${PROJECT_DIR}/.scriptony/kokoro-output"
VOICES_DIR="${SCRIPT_DIR}/voices"

# Homebrew / pipx / local user installs (Tauri shell PATH is minimal)
export PATH="${HOME}/.local/bin:/opt/homebrew/bin:/usr/local/bin:${PATH}"

ensure_system_espeak() {
  if command -v brew >/dev/null 2>&1; then
    if ! brew --prefix espeak-ng >/dev/null 2>&1; then
      echo "Installing espeak-ng via Homebrew (required for Kokoro phonemization)..."
      brew install espeak-ng && true
    fi
    ESPEAK_PREFIX="$(brew --prefix espeak-ng)"
    export KOKORO_ESPEAK_LIBRARY="${ESPEAK_PREFIX}/lib/libespeak-ng.dylib"
    export KOKORO_ESPEAK_DATA="${ESPEAK_PREFIX}/share/espeak-ng-data"
  elif [ "$(uname -s)" = "Darwin" ]; then
    echo "WARN: Homebrew not found — Kokoro may fail without espeak-ng."
    echo "      Install Homebrew, then: brew install espeak-ng"
  fi
}

ensure_system_espeak

pick_python() {
  if [ -n "${PYTHON:-}" ]; then
    echo "$PYTHON"
    return
  fi
  for cmd in python3.12 python3.11 python3.10 python3; do
    if command -v "$cmd" >/dev/null 2>&1; then
      if "$cmd" -c 'import sys; v=sys.version_info; raise SystemExit(0 if (3,10)<=(v.major,v.minor)<=(3,12) else 1)' 2>/dev/null; then
        echo "$cmd"
        return
      fi
    fi
  done
  echo "python3"
}

PYTHON="$(pick_python)"
echo "Kokoro sidecar Python: $($PYTHON --version 2>&1)"

cd "$SCRIPT_DIR"

mkdir -p "$OUTPUT_DIR"

# Recreate venv when Python major/minor is unsupported (3.14+ or 3.13 without kokoro wheels)
if [ -d "$SCRIPT_DIR/.venv" ]; then
  if ! "$SCRIPT_DIR/.venv/bin/python" -c 'import sys; v=sys.version_info; raise SystemExit(0 if (3,10)<=(v.major,v.minor)<=(3,12) else 1)' 2>/dev/null; then
    echo "Recreating Kokoro .venv (Python 3.10–3.12 required)..."
    rm -rf "$SCRIPT_DIR/.venv"
  fi
fi

if [ ! -d "$SCRIPT_DIR/.venv" ]; then
  echo "Creating Python virtualenv with $PYTHON..."
  "$PYTHON" -m venv "$SCRIPT_DIR/.venv"
fi

source "$SCRIPT_DIR/.venv/bin/activate"

echo "Installing Kokoro dependencies (first run may take a few minutes)..."
pip install -q -r "$SCRIPT_DIR/requirements.txt"

echo "Starting Kokoro TTS Server on port $PORT..."
export KOKORO_PORT="$PORT"
export KOKORO_OUTPUT_DIR="$OUTPUT_DIR"
export KOKORO_VOICES_DIR="$VOICES_DIR"

exec python "$SCRIPT_DIR/main.py" --port "$PORT" --output-dir "$OUTPUT_DIR" --voices-dir "$VOICES_DIR"
