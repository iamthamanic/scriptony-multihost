# Issue draft: MVE Prompt-to-Voice (DRAFT)

**Status:** DRAFT — nicht angelegt  
**Epic design:** [`.qa/design/mve-prompt-to-voice.md`](../design/mve-prompt-to-voice.md)  
**Parent:** [`.qa/design/multi-voice-engine.md`](../design/multi-voice-engine.md)  
**JSON:** [`.qa/intake/mve-prompt-to-voice-issues.json`](./mve-prompt-to-voice-issues.json)

---

## Restate (Intake)

**Problem:** „Stimme aus Beschreibung“ macht nur Katalog-Matching — Nutzer erwarten echte Prompt-to-Voice.  
**Ziel:** Voicebox `voice_type=designed` + `design_prompt` → neues Profil → Charakter zuweisen → Vorschau.  
**Non-Goals:** ElevenLabs/Cloud; Katalog-Matching entfernen; Personality-Rewrite.  
**MVP:** Desktop, Eigene Stimmen / Voicebox-Pfad, zwei Buttons (vorschlagen vs. erzeugen).

---

## Slices (Reihenfolge)

| # | Title | P | dependsOn |
|---|-------|---|-----------|
| 1 | Voicebox API: designed profile + designVoiceFromPrompt service | P0 | — |
| 2 | UI: Stimme erzeugen + Global Progress im Voice Studio | P1 | #1 |
| 3 | Acceptance, Unit-Tests, Playwright für Prompt-to-Voice | P1 | #2 |

---

## Slice 1 — Voicebox API: designed profile + designVoiceFromPrompt service

**featureSlug:** `mve-prompt-to-voice-api`

### Intent
Voicebox-Client und MVE-Service für echtes Prompt-to-Voice: `POST /profiles` mit `voice_type=designed`, Zuweisung an Charakter.

### Acceptance
- [ ] `createDesignedVoiceboxProfile` sendet `design_prompt`, `default_engine=qwen_custom_voice`, `language`
- [ ] `designVoiceFromPrompt` erstellt Voicebox-Profil + upsert MVE VoiceProfile mit `baseVoiceId`
- [ ] Fehler von Voicebox werden als DE-Toasts durchgereicht
- [ ] Unit-Tests für API-Body und Service (gemockt)

---

## Slice 2 — UI: Stimme erzeugen + Global Progress

**featureSlug:** `mve-prompt-to-voice-ui`

### Intent
Zweiter Button „Stimme erzeugen“ neben „Stimme vorschlagen“; lange Jobs über Global Loading Progress.

### Acceptance
- [ ] `VoiceStudioGenerateSection` zeigt beide Aktionen mit klarer DE-Copy
- [ ] „Stimme erzeugen“ disabled ohne Beschreibung / während Busy
- [ ] Erfolg: Dropdown/Liste zeigt neues Profil unter Eigene Stimmen
- [ ] Optional: automatische Vorschau-Generate nach Design (wenn im Slice Scope)

---

## Slice 3 — Acceptance, Tests, Playwright

**featureSlug:** `mve-prompt-to-voice-verify`

### Intent
Regression-Sicherheit für P2V-Flow; Acceptance-Datei; E2E mit `/__voicebox` mocks.

### Acceptance
- [ ] `.qa/acceptance/mve-prompt-to-voice.md` vollständig
- [ ] Playwright: Beschreibung → Erzeugen → Profil sichtbar
- [ ] `npm run verify -- --frontend` grün

---

## Review gate

Wenn OK: **„Issues anlegen“** oder `@feature-intake create mve-prompt-to-voice`  
Danach: **`@ecc-runner`**
