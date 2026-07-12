# todo-T65-plan-mve-openvoice-integration-eval

**Epic:** Multi-Voice-Engine  
**Feature-Slug:** `mve-openvoice-eval`  
**Priorität:** P2 (vor Implementation 0.4)  
**Stufe:** Plan / Spike  
**Depends on:** MVP 0.1 abgeschlossen; Render-Line-Adapter (0.2) hilfreich  
**PRD:** §17.1, §21 MVP 0.4, Ziel `openvoice.adapter.ts`

## Intent

Technische und produktseitige **Evaluierung**, ob [OpenVoice](https://github.com/myshell-ai/openvoice) (MIT, Instant Voice Cloning) als **lokaler Sidecar-Adapter** für Scriptony Voice Studio (Clone/Tune) geeignet ist — **bevor** Implementation startet.

**Nicht Ziel:** OpenVoice als Ersatz für Kokoro-Dialog-TTS in 0.1.

## Fragen (beantworten im Plan-Doc)

| # | Frage |
|---|--------|
| 1 | Deutsch / Hörspiel-Dialog-Qualität ausreichend? |
| 2 | GPU/RAM-Anforderungen auf Ziel-Macs (Apple Silicon)? |
| 3 | Sidecar-Betrieb analog Kokoro (`127.0.0.1`, Tauri start/stop)? |
| 4 | Latenz für Preview vs. Batch-Clone? |
| 5 | Consent/Compliance PRD §20 — UI-Flow skizierbar? |
| 6 | Lizenz: Code MIT — Modell-Weights separat geklärt? |
| 7 | Alternativen (F5-TTS, CosyVoice) — Kurzvergleich |

## Deliverables (Plan-Ticket)

- [ ] `docs/MVE_OPENVOICE_EVAL.md` (oder Abschnitt in `docs/multi-voice-engine.md`) mit **Go / No-Go / Defer**
- [ ] Architektur-Skizze: UI → MVE API → `openvoice.adapter.ts` → Sidecar
- [ ] Aufwandsschätzung für Implementation-Ticket (0.4)
- [ ] Risiken: Modellgröße, Updates, Wartung

## Abgrenzung zu bestehendem Code

| Heute | OpenVoice (0.4) |
|-------|------------------|
| Kokoro = Standard-TTS, Preset-Stimmen | Clone aus Referenz-Audio |
| `VoiceProfileEditorModal` Platzhalter „Stimme klonen" | Aktivierung + Upload + Consent |
| Kein `openvoice.adapter.ts` | Neuer Adapter + Worker |

## Folge-Ticket (nach Go)

`todo-T66-implementation-mve-voice-studio-openvoice.md` (noch nicht anlegen bis Eval **Go**):

- Sidecar/Worker packaging (`tools/openvoice-server/` o. ä.)
- `VoiceEngineAdapter` Interface
- Consent-Flow + `referenceAudioUrl`
- UI: MVP-0.4-Block im Modal aktivieren

## Acceptance (nur Plan)

- [ ] Eval-Doc mit klarer Empfehlung
- [ ] Team kann Implementation 0.4 schätzen
- [ ] Kein Produktionscode in diesem Ticket (optional: Spike-Branch, nicht mergen)

## Referenzen

- OpenVoice: https://github.com/myshell-ai/openvoice  
- Kokoro-Sidecar-Muster: `tools/kokoro-server/`, `src/lib/api/local-tts-api.ts`  
- PRD Adapter-Pfad: `src/lib/multi-voice-engine/adapters/openvoice.adapter.ts` (geplant)
