# Acceptance: mve-qwen-voicedesign-spike

**Issue:** #54  
**Epic:** `.qa/design/mve-voice-identity-pipeline.md`  
**Feature slug:** `mve-qwen-voicedesign-spike`

## Intent

Qwen3 VoiceDesign lokal verifizieren und einen festen HTTP-API-Vertrag für Scriptony festlegen — unabhängig von Voicebox CustomVoice-Workarounds.

## Preconditions

- Desktop-Entwicklungsumgebung (macOS Apple Silicon oder CUDA)
- Optional: Python 3.10+, `pip install qwen-tts torch soundfile`
- Hugging Face Modell-Download (~3–4 GB für 1.7B VoiceDesign + Tokenizer)

## Happy Path

1. Spike-Dokumentation in `.qa/design/mve-voice-identity-pipeline.md` § Spike Results ist vollständig
2. Request/Response-Schemas für `POST /voice-design/generate` und `POST /voice-design/materialize` sind final
3. Sidecar-Architektur-Entscheidung (Python Sidecar Port 3767) ist dokumentiert mit Pros/Cons
4. `scripts/spike-qwen-voicedesign.sh` erzeugt oder beschreibt manuellen PoC-Pfad
5. Evidence-Verzeichnis `.qa/evidence/mve-voice-identity-pipeline/` existiert mit README

## Edge Cases

- Kein GPU → CPU-Fallback dokumentiert (höhere Latenz)
- Modell nicht installiert → Spike-Script gibt klare Install-Anweisung
- Voicebox parallel → kein Port-Konflikt (3767 vs. 3765 vs. Voicebox)

## Acceptance

- [x] Spike Results in Epic-Design
- [x] API-Vertrag final (generate + materialize)
- [x] Sidecar-Entscheidung dokumentiert
- [x] Evidence-Pfad + Spike-Script vorhanden

## Implementation Notes

- Epic § Spike Results, API-Vertrag, Sidecar Port 3767
- `scripts/spike-qwen-voicedesign.sh` — manueller PoC (qwen-tts nicht im CI)
- Evidence: `.qa/evidence/mve-voice-identity-pipeline/qwen-voicedesign-spike/`
