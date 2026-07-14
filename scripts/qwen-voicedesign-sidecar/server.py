#!/usr/bin/env python3
"""
Qwen VoiceDesign local sidecar — POST /voice-design/generate on 127.0.0.1:3767.
Set QWEN_VOICEDESIGN_STUB=1 for dev/CI without GPU or qwen-tts.
"""

from __future__ import annotations

import json
import os
import re
import secrets
import struct
import uuid
import wave
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import uvicorn

MODEL = "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"
PORT = int(os.environ.get("SCRIPTONY_VOICE_DESIGN_SIDECAR_PORT", "3767"))
TOKEN = os.environ.get("SCRIPTONY_VOICE_DESIGN_SIDECAR_TOKEN", "")
STUB = os.environ.get("QWEN_VOICEDESIGN_STUB", "0") == "1"
SESSIONS_DIR = Path(
    os.environ.get(
        "SCRIPTONY_VOICE_DESIGN_SESSIONS_DIR",
        "/tmp/scriptony-voice-design-sessions",
    )
)

DEFAULT_CANDIDATE_COUNT = 3
MAX_CANDIDATE_COUNT = 4
DEFAULT_TEMPS = [0.85, 0.9, 0.95, 0.92]
CANDIDATE_LABELS = ["A", "B", "C", "D"]
SAMPLE_RATE = 24_000
DEFAULT_DURATION_MS = 4200

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "tauri://localhost",
]

_model = None
_model_ready = False


class GenerateRequest(BaseModel):
    description: str = Field(..., min_length=1, max_length=2000)
    previewText: str = Field(..., min_length=1, max_length=500)
    language: str = Field(..., min_length=1, max_length=64)
    candidateCount: int = Field(default=DEFAULT_CANDIDATE_COUNT)
    temperatures: list[float] | None = None

    @field_validator("candidateCount")
    @classmethod
    def validate_candidate_count(cls, value: int) -> int:
        if value < 1 or value > MAX_CANDIDATE_COUNT:
            raise ValueError(
                f"candidateCount must be between 1 and {MAX_CANDIDATE_COUNT}"
            )
        return value

    @field_validator("temperatures")
    @classmethod
    def validate_temperatures(
        cls, value: list[float] | None, info
    ) -> list[float] | None:
        if value is None:
            return None
        count = info.data.get("candidateCount", DEFAULT_CANDIDATE_COUNT)
        if len(value) != count:
            raise ValueError("temperatures length must equal candidateCount")
        for temp in value:
            if temp < 0.5 or temp > 1.2:
                raise ValueError("temperature must be between 0.5 and 1.2")
        return value


class CandidateResponse(BaseModel):
    id: str
    label: str
    audioUrl: str
    description: str
    durationMs: int
    sampleRate: int


class GenerateResponse(BaseModel):
    sessionId: str
    candidates: list[CandidateResponse]
    warnings: list[str] = []


class MaterializeRequest(BaseModel):
    sessionId: str = Field(..., min_length=1, max_length=128)
    candidateId: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=200)
    previewText: str = Field(..., min_length=1, max_length=500)
    projectId: str = Field(..., min_length=1, max_length=128)
    projectDir: str = Field(..., min_length=1, max_length=4096)


class VoiceProfileDraft(BaseModel):
    creationMode: str = "designed"
    provider: str = "qwen"
    model: str = MODEL


class MaterializeResponse(BaseModel):
    referenceAudioAssetId: str
    referenceAudioUrl: str
    referenceText: str
    identityPrompt: str
    voiceProfileDraft: VoiceProfileDraft


app = FastAPI(title="scriptony-qwen-voicedesign")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Scriptony-Sidecar-Token"],
)


def require_auth(
    authorization: str | None = Header(default=None),
    x_scriptony_sidecar_token: str | None = Header(default=None),
) -> None:
    if not TOKEN:
        raise HTTPException(status_code=503, detail="Sidecar token not configured")
    bearer = ""
    if authorization and authorization.startswith("Bearer "):
        bearer = authorization[7:]
    header = x_scriptony_sidecar_token or ""
    if bearer != TOKEN and header != TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _ensure_model() -> None:
    global _model, _model_ready
    if STUB:
        _model_ready = True
        return
    if _model is not None:
        return
    try:
        import torch
        from qwen_tts import Qwen3TTSModel
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"qwen-tts not installed: {exc}. Set QWEN_VOICEDESIGN_STUB=1 for stub mode.",
        ) from exc

    if torch.cuda.is_available():
        device = "cuda:0"
        dtype = torch.bfloat16
        attn = "flash_attention_2"
    elif torch.backends.mps.is_available():
        device = "mps"
        dtype = torch.float32
        attn = None
    else:
        device = "cpu"
        dtype = torch.float32
        attn = None

    kwargs: dict[str, Any] = {"device_map": device, "dtype": dtype}
    if attn:
        kwargs["attn_implementation"] = attn
    _model = Qwen3TTSModel.from_pretrained(MODEL, **kwargs)
    _model_ready = True


def _write_stub_wav(path: Path, duration_ms: int = DEFAULT_DURATION_MS) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    num_samples = int(SAMPLE_RATE * duration_ms / 1000)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        # Quiet sine tone so playback is audible in stub mode.
        import math

        frames = bytearray()
        for i in range(num_samples):
            sample = int(800 * math.sin(2 * math.pi * 440 * i / SAMPLE_RATE))
            frames.extend(struct.pack("<h", sample))
        wf.writeframes(bytes(frames))


def _generate_real_wav(
    path: Path,
    description: str,
    preview_text: str,
    language: str,
    temperature: float,
) -> int:
    global _model
    _ensure_model()
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    import soundfile as sf

    wavs, sr = _model.generate_voice_design(
        text=preview_text,
        language=language,
        instruct=description,
        temperature=temperature,
        non_streaming_mode=True,
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(path), wavs[0], sr)
    duration_ms = int(len(wavs[0]) / sr * 1000)
    return duration_ms


@app.get("/health")
def health() -> dict[str, Any]:
    ready = STUB or _model_ready
    return {"ok": True, "model": MODEL, "ready": ready, "stub": STUB}


@app.post("/voice-design/generate", dependencies=[Depends(require_auth)])
def generate_voice_design(body: GenerateRequest) -> GenerateResponse:
    if not body.description.strip():
        raise HTTPException(status_code=400, detail="description must not be empty")
    if not body.previewText.strip():
        raise HTTPException(status_code=400, detail="previewText must not be empty")

    count = body.candidateCount
    temps = body.temperatures or DEFAULT_TEMPS[:count]
    session_id = f"vd_sess_{secrets.token_hex(6)}"
    session_dir = SESSIONS_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    session_meta = {
        "description": body.description,
        "previewText": body.previewText,
        "language": body.language,
    }
    (session_dir / "session.json").write_text(
        json.dumps(session_meta, ensure_ascii=False),
        encoding="utf-8",
    )

    warnings: list[str] = []
    candidates: list[CandidateResponse] = []

    for index in range(count):
        candidate_id = f"candidate-{index + 1}"
        label = CANDIDATE_LABELS[index]
        wav_path = session_dir / f"{candidate_id}.wav"
        audio_url = f"local://voice-design/sessions/{session_id}/{candidate_id}.wav"
        temperature = temps[index] if index < len(temps) else DEFAULT_TEMPS[index]

        try:
            if STUB:
                _write_stub_wav(wav_path)
                duration_ms = DEFAULT_DURATION_MS
            else:
                duration_ms = _generate_real_wav(
                    wav_path,
                    body.description,
                    body.previewText,
                    body.language,
                    temperature,
                )
            candidates.append(
                CandidateResponse(
                    id=candidate_id,
                    label=label,
                    audioUrl=audio_url,
                    description=body.description,
                    durationMs=duration_ms,
                    sampleRate=SAMPLE_RATE,
                )
            )
        except HTTPException:
            raise
        except Exception as exc:
            warnings.append(f"{candidate_id}: {exc}")

    if not candidates:
        raise HTTPException(status_code=500, detail="All candidates failed to generate")

    return GenerateResponse(
        sessionId=session_id,
        candidates=candidates,
        warnings=warnings,
    )


def _sanitize_voice_filename(name: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9._-]+", "_", name.strip()).strip("._")
    return safe if safe else "voice-ref"


def _resolve_session_dir(session_id: str) -> Path:
    if not re.fullmatch(r"vd_sess_[a-f0-9]+", session_id):
        raise HTTPException(status_code=400, detail="Invalid sessionId format")
    session_dir = SESSIONS_DIR / session_id
    if not session_dir.is_dir():
        raise HTTPException(status_code=404, detail="Voice design session not found")
    return session_dir


@app.post("/voice-design/materialize", dependencies=[Depends(require_auth)])
def materialize_voice_design(body: MaterializeRequest) -> MaterializeResponse:
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="name must not be empty")
    if not body.previewText.strip():
        raise HTTPException(status_code=400, detail="previewText must not be empty")

    session_dir = _resolve_session_dir(body.sessionId)
    candidate_id = body.candidateId.strip()
    if not re.fullmatch(r"candidate-[1-4]", candidate_id):
        raise HTTPException(status_code=400, detail="Invalid candidateId format")

    wav_path = session_dir / f"{candidate_id}.wav"
    if not wav_path.is_file():
        raise HTTPException(status_code=404, detail="Candidate audio not found")

    meta_path = session_dir / "session.json"
    identity_prompt = body.name
    if meta_path.is_file():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            identity_prompt = str(meta.get("description") or identity_prompt).strip()
        except json.JSONDecodeError:
            pass

    project_dir = Path(body.projectDir).expanduser().resolve()
    if not project_dir.is_dir():
        raise HTTPException(status_code=400, detail="projectDir does not exist")

    voice_refs_dir = project_dir / "assets" / "voice-refs"
    voice_refs_dir.mkdir(parents=True, exist_ok=True)

    base_name = _sanitize_voice_filename(body.name)
    dest_name = f"{base_name}.wav"
    dest_path = voice_refs_dir / dest_name
    attempt = 0
    while dest_path.exists():
        attempt += 1
        dest_name = f"{base_name}_{attempt + 1}.wav"
        dest_path = voice_refs_dir / dest_name

    dest_path.write_bytes(wav_path.read_bytes())
    relative_path = f"assets/voice-refs/{dest_name}"
    reference_text = body.previewText.strip()

    return MaterializeResponse(
        referenceAudioAssetId=str(uuid.uuid4()),
        referenceAudioUrl=relative_path,
        referenceText=reference_text,
        identityPrompt=identity_prompt,
        voiceProfileDraft=VoiceProfileDraft(),
    )


def main() -> None:
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="info")


if __name__ == "__main__":
    main()
