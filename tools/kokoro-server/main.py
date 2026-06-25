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
import threading
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
import uvicorn

from espeak_bootstrap import configure_espeak_for_kokoro, homebrew_install_hint

# ── Kokoro import (with graceful fallback) ──────────────────────────────────
try:
    configure_espeak_for_kokoro()
    from kokoro import KPipeline

    _KOKORO_AVAILABLE = True
except ImportError:
    KPipeline = None  # type: ignore[misc, assignment]
    _KOKORO_AVAILABLE = False
    print("WARNING: kokoro package not installed. TTS will return placeholder.")
except Exception as exc:
    KPipeline = None  # type: ignore[misc, assignment]
    _KOKORO_AVAILABLE = False
    hint = homebrew_install_hint()
    print(f"WARNING: Kokoro init failed: {exc}")
    if hint:
        print(f"  Fix (macOS): {hint}")

# ── Configuration ───────────────────────────────────────────────────────────

KOKORO_PORT = int(os.environ.get("KOKORO_PORT", "8080"))
VOICES_DIR = Path(os.environ.get("KOKORO_VOICES_DIR", str(Path(__file__).parent / "voices")))
OUTPUT_DIR = Path(os.environ.get("KOKORO_OUTPUT_DIR", str(Path(__file__).parent / "output")))

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
VOICES_DIR.mkdir(parents=True, exist_ok=True)

# ── Voice Registry ───────────────────────────────────────────────────────────

# Kokoro built-in voice identifiers (ONNX model supports these)
# Ref: https://github.com/remsky/Kokoro-FastAPI
_BUILTIN_VOICES = [
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


VoiceEntry = dict


def _default_name(voice_id: str) -> str:
    return voice_id.replace("_", " ").title()


def _guess_gender(name: str) -> str:
    low = name.lower()
    if "male" in low or any(m in low for m in ["adam", "echo", "eric", "fenrir", "liam", "michael", "onyx", "george", "lewis", "yunjian", "kumo"]):
        return "male"
    if "female" in low or any(f in low for f in ["bella", "nicole", "sky", "isabella", "emma", "xiaobei", "alpha"]):
        return "female"
    return "unknown"


def _load_manifest(onnx_path: Path) -> dict:
    """Load optional voice manifest from .json next to .onnx or voice_id.json."""
    manifest_candidates = [
        onnx_path.with_suffix(".json"),
        onnx_path.parent / f"{onnx_path.stem}.json",
    ]
    for candidate in manifest_candidates:
        if candidate.is_file():
            try:
                return json.loads(candidate.read_text(encoding="utf-8"))
            except Exception:
                return {}
    return {}


def _scan_local_voices(voices_dir: Path) -> list[VoiceEntry]:
    """Discover .onnx (+ optional .bin) voice files in voices_dir."""
    local: list[VoiceEntry] = []
    if not voices_dir.is_dir():
        return local

    for onnx_file in sorted(voices_dir.glob("*.onnx")):
        voice_id = onnx_file.stem
        manifest = _load_manifest(onnx_file)

        # Optional .bin pair (Kokoro model format). Presence not required.
        bin_file = onnx_file.with_suffix(".bin")
        if bin_file.exists():
            pass

        name = manifest.get("name") or _default_name(voice_id)
        lang = manifest.get("lang") or manifest.get("language") or "en"
        gender = manifest.get("gender") or _guess_gender(name)
        local.append({"id": voice_id, "name": name, "lang": lang, "gender": gender})

    return local


def load_voices(voices_dir: Path) -> list[VoiceEntry]:
    """Return local voices + built-ins, with locals taking precedence on ID collision."""
    local = _scan_local_voices(voices_dir)
    local_ids = {v["id"] for v in local}
    voices = list(local)
    for builtin in _BUILTIN_VOICES:
        if builtin["id"] not in local_ids:
            voices.append(builtin)
    return voices


# ── Load progress (reported via /status) ─────────────────────────────────────

_load_state = {
    "phase": "starting",
    "progress": 5,
    "message": "Kokoro-Server startet…",
}
_load_lock = threading.Lock()
_load_done = threading.Event()
_load_error: Optional[str] = None


def _set_load_state(phase: str, progress: int, message: str) -> None:
    with _load_lock:
        _load_state["phase"] = phase
        _load_state["progress"] = max(0, min(100, progress))
        _load_state["message"] = message


def _preload_pipeline() -> None:
    global _pipeline, _load_error
    if not _KOKORO_AVAILABLE:
        py = f"{sys.version_info.major}.{sys.version_info.minor}"
        _load_error = (
            f"Kokoro-Paket fehlt (Python {py}). "
            "Benötigt Python 3.10–3.12 (nicht 3.13/3.14). "
            "start.sh wählt python3.11/3.12 — .venv löschen und Vorschau erneut starten."
        )
        _set_load_state("error", 0, _load_error)
        _load_done.set()
        return

    progress_steps = [
        (58, "Stimmmodelle werden vorbereitet…"),
        (66, "ONNX-Runtime wird initialisiert…"),
        (74, "Kokoro-Modell wird geladen…"),
        (84, "Neural-Voice-Pipeline startet…"),
    ]
    stop_ticker = threading.Event()

    def _progress_ticker() -> None:
        for pct, msg in progress_steps:
            if stop_ticker.wait(2.0):
                return
            if _pipeline is not None:
                return
            _set_load_state("loading_model", pct, msg)

    ticker = threading.Thread(target=_progress_ticker, daemon=True)
    ticker.start()

    try:
        _set_load_state("loading_model", 55, "Kokoro ONNX-Modell wird geladen…")
        _pipeline = KPipeline(lang_code="a")
        stop_ticker.set()
        _set_load_state("ready", 100, "Kokoro bereit")
    except Exception as e:
        stop_ticker.set()
        _load_error = f"Modell-Laden fehlgeschlagen: {e}"
        _set_load_state("error", 0, _load_error)
        print(f"Failed to initialize Kokoro pipeline: {e}")
    finally:
        _load_done.set()


from contextlib import asynccontextmanager


@asynccontextmanager
async def _lifespan(_app: FastAPI):
    _set_load_state("server_up", 22, "HTTP-Server läuft — Modell wird vorbereitet…")
    threading.Thread(target=_preload_pipeline, daemon=True).start()
    yield


# ── FastAPI App ─────────────────────────────────────────────────────────────

app = FastAPI(title="Kokoro Local TTS", version="1.0.0", lifespan=_lifespan)

# Lazy-initialized Kokoro pipeline
_pipeline: Optional['KPipeline'] = None

def get_pipeline() -> Optional['KPipeline']:
    global _pipeline
    if _pipeline is not None:
        return _pipeline
    if not _KOKORO_AVAILABLE:
        return None
    if not _load_done.wait(timeout=180):
        return None
    if _load_error:
        return None
    return _pipeline

# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Health check — HTTP server is up (does not block on model load)."""
    return {
        "status": "ok",
        "kokoro_ready": _KOKORO_AVAILABLE and _pipeline is not None,
    }


@app.get("/status")
def kokoro_status():
    """Detailed boot / model-load progress for desktop UI."""
    with _load_lock:
        phase = _load_state["phase"]
        progress = _load_state["progress"]
        message = _load_state["message"]
    ready = _KOKORO_AVAILABLE and _pipeline is not None
    return {
        "status": "ok",
        "kokoro_ready": ready,
        "phase": phase,
        "progress": progress,
        "message": message,
    }


@app.get("/voices")
def list_voices():
    """Return all available Kokoro voices (local + built-in)."""
    return {"voices": load_voices(VOICES_DIR)}


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
    allowed_voice_ids = {v["id"] for v in load_voices(VOICES_DIR)}
    if voice_id not in allowed_voice_ids:
        raise HTTPException(status_code=400, detail=f"Unknown voice: {voice_id}")
    if fmt not in ("wav", "mp3", "flac"):
        raise HTTPException(status_code=400, detail="format must be wav, mp3, or flac")

    # Generate unique output filename
    out_name = f"kokoro_{voice_id}_{uuid.uuid4().hex[:8]}_{int(time.time())}.{fmt}"
    out_path = OUTPUT_DIR / out_name

    _set_load_state("synthesizing", 92, "Text wird in Sprache umgewandelt…")

    # ── Synthesis ──────────────────────────────────────────────────────────
    if _KOKORO_AVAILABLE:
        pipeline = get_pipeline()
        if pipeline is None:
            raise HTTPException(status_code=503, detail="Kokoro pipeline failed to initialize")

        try:
            import soundfile as sf
            import numpy as np

            sample_rate = 24000
            chunks: list[np.ndarray] = []
            generator = pipeline(text, voice=voice_id, speed=speed)
            for _i, (_gs, _ps, audio) in enumerate(generator):
                chunks.append(np.asarray(audio, dtype=np.float32))

            if not chunks:
                raise HTTPException(status_code=500, detail="Kokoro produced no audio")

            audio_array = np.concatenate(chunks)
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

    _set_load_state("ready", 100, "Kokoro bereit")

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
    global VOICES_DIR, OUTPUT_DIR
    parser = argparse.ArgumentParser(description="Kokoro Local TTS Server")
    parser.add_argument("--port", type=int, default=KOKORO_PORT, help="HTTP port")
    parser.add_argument("--host", default="127.0.0.1", help="Bind address")
    parser.add_argument("--voices-dir", type=Path, default=VOICES_DIR, help="Voice model directory")
    parser.add_argument("--output-dir", type=Path, default=OUTPUT_DIR, help="Output WAV directory")
    args = parser.parse_args()

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
