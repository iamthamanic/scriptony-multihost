# Local TTS Server for Scriptony using Kokoro

## What is this?

A minimal Python HTTP server that wraps [Kokoro](https://github.com/hexgrad/kokoro) ONNX
text-to-speech model for local voice synthesis.

## Install

```bash
python -m venv venv
source venv/bin/activate  # macOS/Linux
# or: venv\Scripts\activate  # Windows

pip install -r requirements.txt
```

## Download voices

Kokoro voices are downloaded automatically on first use via the Python package.

## Run

```bash
python main.py
# Server starts on http://localhost:8080
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check + voice count |
| GET | `/voices` | List of available voices |
| POST | `/synthesize` | `{ text, voice, speed }` → WAV file |

## CLI usage

```bash
curl "http://localhost:8080/synthesize" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","voice":"af_bella","speed":1.0}' \
  --output output.wav
```
