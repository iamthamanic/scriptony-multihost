# Feature: MVE Voice Design Preview (3 Candidates)

<!-- design: .qa/design/mve-voice-design-studio.md — Slice A -->

## Intent

„Stimme erzeugen“ erzeugt **3 ephemere Kandidaten** (A/B/C) statt sofortiger Zuweisung. Nutzer hört Preview ab und speichert einen Kandidaten mit Namen.

## Preconditions

- Desktop-App, lokales `.scriptony`-Projekt
- Voicebox erreichbar
- Stimmbeschreibung (Basic oder Advanced-compiled) ausgefüllt

## Happy Path

- [x] „Stimme erzeugen“ erzeugt 3 Kandidaten-Zeilen
- [x] Jede Zeile: Label A/B/C, Anhören, Speichern
- [x] Speichern öffnet Namens-Dialog → Assign + MVE-Persist
- [x] Modal schließen ohne Speichern → Temp-Profile cleanup (DELETE)
- [x] Global Loading Progress bei >5s mit Phasen „Kandidat n/3“

## Edge Cases

- [x] Leere Beschreibung → Erzeugen disabled
- [x] Preview-Audio optional wenn Generate fehlschlägt (Kandidat trotzdem wählbar)

## Regression

- [x] „Stimme vorschlagen“ (Katalog) unverändert
- [x] `design-voice-from-prompt` Legacy-Wrapper nutzt preview(1)+save

## Tests

- Unit: `preview-voice-design-candidates.test.ts`, `save-voice-design-candidate.test.ts`
- Playwright: `.qa/runs/mve-voice-design-preview.spec.ts`
