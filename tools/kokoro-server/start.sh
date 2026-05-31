#!/usr/bin/env bash
set -e

# Kokoro Local TTS Server Launcher
# Usage: ./start.sh --port 8080 --project-dir /path/to/project

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${KOKORO_PORT:-8080}"
PROJECT_DIR="${SCRIPTONY_PROJECT_DIR:-$SCRIPT_DIR}"
OUTPUT_DIR="${PROJECT_DIR}/.scriptony/kokoro-output"
VOICES_DIR="${SCRIPT_DIR}/voices"

# Optional: Python interpreter override (e.g. for conda/venv)
PYTHON="${PYTHON:-python3}"

cd "$SCRIPT_DIR"

# Ensure output dir exists
mkdir -p "$OUTPUT_DIR"

# Check if virtualenv exists, create if not
if [ ! -d "$SCRIPT_DIR/.venv" ]; then
    echo "Creating Python virtualenv..."
    "$PYTHON" -m venv "$SCRIPT_DIR/.venv"
fi

# Activate venv
source "$SCRIPT_DIR/.venv/bin/activate"

# Install/update dependencies
pip install -q -r "$SCRIPT_DIR/requirements.txt"

# Start server
echo "Starting Kokoro TTS Server on port $PORT..."
export KOKORO_PORT="$PORT"
export KOKORO_OUTPUT_DIR="$OUTPUT_DIR"
export KOKORO_VOICES_DIR="$VOICES_DIR"

exec "$PYTHON" "$SCRIPT_DIR/main.py" --port "$PORT" --output-dir "$OUTPUT_DIR" --voices-dir "$VOICES_DIR"
