#!/usr/bin/env bash
# Spike: Qwen3-TTS VoiceDesign — one DE candidate WAV for issue #54.
# Usage: ./scripts/spike-qwen-voicedesign.sh
# Requires: python3, pip packages qwen-tts torch soundfile (see design doc).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EVIDENCE_DIR="${ROOT}/.qa/evidence/mve-voice-identity-pipeline/qwen-voicedesign-spike"
OUT_WAV="${EVIDENCE_DIR}/de-fairy-voice.wav"
LOG="${EVIDENCE_DIR}/spike-run.log"

mkdir -p "${EVIDENCE_DIR}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "error: python3 required. See .qa/design/mve-voice-identity-pipeline.md § Spike Results" >&2
  exit 1
fi

python3 - "${OUT_WAV}" 2>&1 | tee "${LOG}" <<'PY'
import os
import sys

try:
    import torch
    import soundfile as sf
    from qwen_tts import Qwen3TTSModel
except ImportError as e:
    print(
        "Missing dependency:",
        e,
        "\nInstall: pip install 'qwen-tts' torch soundfile",
        file=sys.stderr,
    )
    sys.exit(2)

MODEL = "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"
TEXT = (
    "Natürlich habe ich recht. Die Wahrscheinlichkeit, "
    "dass du etwas übersehen hast, liegt bei ungefähr neunundneunzig Prozent."
)
INSTRUCT = (
    "Weibliche Stimme, jung, hell und leicht nasal, lispelnd und feenhaft, "
    "trocken und spöttisch, deutsch ausgesprochen."
)

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

print(f"Loading {MODEL} on {device}…")
kwargs = {"device_map": device, "dtype": dtype}
if attn:
    kwargs["attn_implementation"] = attn
model = Qwen3TTSModel.from_pretrained(MODEL, **kwargs)

print("Generating voice design candidate…")
wavs, sr = model.generate_voice_design(
    text=TEXT,
    language="German",
    instruct=INSTRUCT,
    temperature=0.9,
    non_streaming_mode=True,
)

out = sys.argv[1] if len(sys.argv) > 1 else "de-fairy-voice.wav"
os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
sf.write(out, wavs[0], sr)
print(f"Wrote {out} ({sr} Hz)")
PY

echo "Spike complete. Evidence: ${OUT_WAV}"
