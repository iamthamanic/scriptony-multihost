# todo-T64-implementation-mve-enhance-script

**GitHub:** #7 (MVE Epic)  
**Feature-Slug:** `mve-enhance-script`  
**Priorität:** P1  
**Stufe:** MVP 0.1  
**Depends on:** #3 (Schema), idealerweise #4–#6  
**Design:** `.qa/design/multi-voice-engine.md` · PRD §6.6, §22.2

## Intent

Rohtext mit Sprecherlabels (z. B. `MAX: …`) in strukturierte **Characters + Lines** umwandeln — ElevenLabs-artiges „Enhance Script", eingebettet in **Structure Timeline / Szene-Kontext**, nicht im Assistant.

## User Journey

1. User fügt Rohtext ein (Szene-Inspector, Clip-Kontext oder dedizierter Rohtext-Bereich an der Timeline).
2. Klick **Enhance** (DE).
3. **Mit Cloud-Session + KI-Provider:** valides JSON → Characters/Lines materialisierbar auf Dialog-Spuren.
4. **Ohne Cloud:** DE-Toast, kein Crash (local stub).

## Solution (Scope)

### Backend

- `functions/scriptony-audio-story/routes/script-enhance.ts` — `POST /script/enhance`
- LLM über `_shared/ai-service` (nicht `scriptony-assistant`)
- Output Zod-validiert gegen `src/lib/multi-voice-engine/schema`
- Guardrails PRD: keine erfundenen Inhalte, Namen/Zahlen nicht ändern

### Frontend

- `src/lib/api-adapter/audio-story-*` + `dispatchByRuntime`
- Local: stub (Toast „Cloud erforderlich" oder read-only Preview)
- UI-Einstieg: min. **Rohtext + Enhance-Button** im Timeline/Szene-Kontext (Mockup)

### Nicht in diesem Ticket

- Audio-Render / Takes (MVP 0.2)
- Voice Clone / OpenVoice (MVP 0.4)
- Vollautomatisches Anlegen aller Clips ohne User-Bestätigung (MVP: Vorschau + Apply)

## Runtime

| Achse | Slice |
|-------|--------|
| Local desktop | stub |
| Cloud session | ja |
| Appwrite Functions | ja |

## Edge Cases

- Ungültiges LLM-JSON → Retry / DE-Fehler (`.qa/edge-cases.md` MVE-03)
- Rate limit / Provider down → Toast
- Leerer Rohtext → disabled + Hinweis

## Acceptance

- [ ] `POST /script/enhance` liefert schema-valide Characters/Lines
- [ ] UI: Enhance-Button im Timeline-Kontext
- [ ] Local stub ohne Crash
- [ ] DE loading / error / empty
- [ ] `functions/` build check grün wenn geändert
- [ ] `.qa/acceptance/mve-enhance-script.md` (via `/implement`)

## Verify

- `@verify-ticket` (+ `--backend` wenn `functions/` geändert)
- `@verify-ui` wenn UI-Einstieg neu

## Referenzen

- Intake: `.qa/intake/multi-voice-engine-issues.json` (Issue 5)
- Enhance-Route **nicht** in `scriptony-assistant`
