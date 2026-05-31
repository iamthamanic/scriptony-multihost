#!/usr/bin/env python3
"""
Kokoro Local TTS Sidecar Server

Minimal HTTP server that wraps the Kokoro ONNX TTS engine.
Provides endpoints for voice listing and text-to-speech synthesis.

Usage:
    python main.py --port 8080 --voices-dir ./voices

Environment:
    KOKORO_PORT        Override default port (8080)
    KOKORO_VOICES_DIR  Directory containing .onnx voice files (*.bin optional)  
    KOKORO_OUTPUT_DIR  Where generated WAV files are written
"""

import argparse
import json
import os
import sys
import time
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
import uvicorn

# ── Kokoro import (with graceful fallback) ──────────────────────────────────
try:
    from kokoro import KPipeline
    _KOKORO_AVAILABLE = True
except ImportError:
    _KOKORO_AVAILABLE = False
    print("WARNING: kokoro package not installed. TTS will return placeholder.")

# ── Configuration ───────────────────────────────────────────────────────────

KOKORO_PORT = int(os.environ.get("KOKORO_PORT", "8080"))
VOICES_DIR = Path(os.environ.get("KOKORO_VOICES_DIR", str(Path(__file__).parent / "voices")))
OUTPUT_DIR = Path(os.environ.get("KOKORO_OUTPUT_DIR", str(Path(__file__).parent / "output")))

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
VOICES_DIR.mkdir(parents=True, exist_ok=True)

# ── FastAPI App ─────────────────────────────────────────────────────────────

app = FastAPI(title="Kokoro Local TTS", version="1.0.0")

# ── Voice Registry ───────────────────────────────────────────────────────────

# Kokoro built-in voice identifiers (ONNX model supports these)
# Ref: https://github.com/remsky/Kokoro-FastAPI
KOKORO_VOICES = [
    {"id": "af_bella",     "name": "Bella (US Female)",      "lang": "en", "gender": "female"},
    {"id": "af_nicole",    "name": "Nicole (US Female)",     "lang": "en", "gender": "female"},
    {"id": "af_sky",       "name": "Sky (US Female)",        "lang": "en", "gender": "female"},
    {"id": "am_adam",      "name": "Adam (US Male)",         "lang": "en", "gender": "male"},
    {"id": "am_echo",      "name": "Echo (US Male)",         "lang": "en", "gender": "male"},
    {"id": "am_eric",      "name": "Eric (US Male)",         "lang": "en", "gender": "male"},
    {"id": "am_fenrir",    "name": "Fenrir (US Male)",       "lang": "en", "gender": "male"},
    {"id": "am_liam",      "name": "Liam (US Male)",         "lang": "en", "gender": "male"},
    {"id": "am_michael",   "name": "Michael (US Male)",      "lang": "en", "gender": "male"},
    {"id": "am_onyx",      "name": "Onyx (US Male)",         "lang": "en", "gender": "male"},
    {"id": "bf_isabella",  "name": "Isabella (UK Female)",   "lang": "en-gb", "gender": "female"},
    {"id": "bm_george",    "name": "George (UK Male)",       "lang": "en-gb", "gender": "male"},
    {"id": "bf_emma",      "name": "Emma (UK Female)",       "lang": "en-gb", "gender": "female"},
    {"id": "bm_lewis",     "name": "Lewis (UK Male)",        "lang": "en-gb", "gender": "male"},
    {"id": "jf_alpha",     "name": "Alpha (JP Female)",      "lang": "ja", "gender": "female"},
    {"id": "jm_kumo",      "name": "Kumo (JP Male)",         "lang": "ja", "gender": "male"},
    {"id": "zf_xiaobei",   "name": "Xiaobei (ZH Female)",    "lang": "zh", "gender": "female"},
    {"id": "zm_yunjian",   "name": "Yunjian (ZH Male)",      "lang": "zh", "gender": "male"},
]

# Lazy-initialized Kokoro pipeline
_pipeline: Optional['KPipeline'] = None

def get_pipeline() -> Optional['KPipeline']:
    global _pipeline
    if _pipeline is None and _KOKORO_AVAILABLE:
        try:
            _pipeline = KPipeline(lang_code="a")  # American English default
        except Exception as e:
            print(f"Failed to initialize Kokoro pipeline: {e}")
    return _pipeline

# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Health check — returns whether Kokoro engine is ready."""
    return {
        "status": "ok",
        "kokoro_ready": _KOKORO_AVAILABLE and get_pipeline() is not None,
    }


@app.get("/voices")
def list_voices():
    """Return all available Kokoro voices."""
    return {"voices": KOKORO_VOICES}


@app.post("/synthesize")
async def synthesize(request: Request):
    """
    Synthesize text to speech.
    
    Body JSON:
        {
            "text": "Hello world",
            "voice": "af_bella",
            "speed": 1.0,        // optional
            "format": "wav"      // optional (wav, mp3, flac)
        }
    
    Returns:
        {
            "audioPath": "/absolute/path/to/output.wav",
            "duration": 1.23,
            "format": "wav"
        }
    """
    body = await request.json()
    text = body.get("text", "").strip()
    voice_id = body.get("voice", "af_bella")
    speed = float(body.get("speed", 1.0))
    fmt = body.get("format", "wav").lower()

    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    if voice_id not in {v["id"] for v in KOKORO_VOICES}:
        raise HTTPException(status_code=400, detail=f"Unknown voice: {voice_id}")
    if fmt not in ("wav", "mp3", "flac"):
        raise HTTPException(status_code=400, detail="format must be wav, mp3, or flac")

    # Generate unique output filename
    out_name = f"kokoro_{voice_id}_{uuid.uuid4().hex[:8]}_{int(time.time())}.{fmt}"
    out_path = OUTPUT_DIR / out_name

    # ── Synthesis ──────────────────────────────────────────────────────────
    if _KOKORO_AVAILABLE:
        pipeline = get_pipeline()
        if pipeline is None:
            raise HTTPException(status_code=503, detail="Kokoro pipeline failed to initialize")

        try:
            import soundfile as sf
            import numpy as np

            # Kokoro pipeline generates audio
            audio_result = pipeline(
                text,
                voice=voice_id,
                speed=speed,
            )
            # audio_result is typically a tuple (audio_array, sample_rate)
            if isinstance(audio_result, tuple):
                audio_array, sample_rate = audio_result
            else:
                audio_array = audio_result
                sample_rate = 24000  # Kokoro default

            # Normalize to float32
            if audio_array.dtype != np.float32:
                audio_array = audio_array.astype(np.float32)

            # Write audio file
            sf.write(str(out_path), audio_array, sample_rate, format=fmt.upper())
            duration = len(audio_array) / sample_rate

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {e}")
    else:
        # Fallback: generate silent placeholder for development
        import numpy as np
        import soundfile as sf
        sample_rate = 24000
        duration = max(len(text.split()) * 0.4, 1.0)  # rough estimate
        silent = np.zeros(int(sample_rate * duration), dtype=np.float32)
        sf.write(str(out_path), silent, sample_rate, format=fmt.upper())

    return {
        "audioPath": str(out_path.resolve()),
        "duration": round(duration, 3),
        "format": fmt,
    }


@app.get("/audio/{filename}")
def serve_audio(filename: str):
    """Serve generated audio file by filename."""
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(file_path)


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Kokoro Local TTS Server")
    parser.add_argument("--port", type=int, default=KOKORO_PORT, help="HTTP port")
    parser.add_argument("--host", default="127.0.0.1", help="Bind address")
    parser.add_argument("--voices-dir", type=Path, default=VOICES_DIR, help="Voice model directory")
    parser.add_argument("--output-dir", type=Path, default=OUTPUT_DIR, help="Output WAV directory")
    args = parser.parse_args()

    global VOICES_DIR, OUTPUT_DIR
    VOICES_DIR = args.voices_dir
    OUTPUT_DIR = args.output_dir
    VOICES_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Kokoro TTS Server starting on http://{args.host}:{args.port}")
    print(f"  Voices dir: {VOICES_DIR}")
    print(f"  Output dir: {OUTPUT_DIR}")
    print(f"  Kokoro available: {_KOKORO_AVAILABLE}")

    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
