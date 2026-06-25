# Acceptance: MVE Enhance Script (T64 / GitHub #7)

**Feature:** `mve-enhance-script`  
**Ticket:** `tickets/todo-T64-implementation-mve-enhance-script.md`  
**PRD:** `docs/multi-voice-engine.md` §6.6, §22.2

## Given / When / Then

### G1 — Cloud Enhance API

- **Given** angemeldete Cloud-Session und konfigurierter KI-Text-Provider
- **When** `POST /script/enhance` mit `{ projectId, rawText }` (Rohtext mit Sprecherlabels)
- **Then** Antwort enthält schema-valide `characters[]` und `lines[]` (Zod `MveEnhanceScriptResultSchema`)
- **And** keine erfundenen Sprecher-Namen gegenüber erkannten Labels (Guardrail-Warnung oder Fehler)

### G2 — UI Einstieg (Audio / Timeline)

- **Given** Audio-Projekt mit aktiver Szene in der Structure Timeline
- **When** User Rohtext einfügt und **Enhance** klickt
- **Then** Loading-Zustand (DE), danach Vorschau der erkannten Characters/Lines
- **When** User **Übernehmen** klickt
- **Then** Characters (neu) und MVE-Lines werden lokal persistiert (ohne automatische Clip-Erstellung)

### G3 — Local ohne Cloud

- **Given** Desktop-local ohne Cloud-Session
- **When** User **Enhance** klickt
- **Then** DE-Toast „Cloud erforderlich …“, kein Crash

### G4 — Leerer Rohtext

- **Given** leeres Textfeld
- **Then** Enhance-Button disabled + Hinweis

### G5 — Ungültiges LLM-JSON

- **Given** Provider liefert kein parsebares JSON
- **Then** DE-Fehlermeldung, optional ein Retry serverseitig

## Out of scope (MVP 0.1)

- Automatisches Anlegen aller Audio-Clips
- Render Line / Takes
- OpenVoice / Voice Clone

## Verify commands

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend --backend" SHIM_CHANGED_FILES="functions/scriptony-audio-story/routes/script-enhance.ts,functions/_shared/mve-enhance-script-service.ts,src/lib/multi-voice-engine/schema/enhance-script.ts,src/lib/api-adapter/audio-story-enhance-adapter.ts,src/components/structure/timeline/mve/MveEnhanceScriptPanel.tsx" npm run checks
```
