# Verify UI Report — `voicebox-dev-cors-proxy`

**Date:** 2026-07-13  
**Project:** scriptony-multihost  
**Stack:** Vite + Tauri (Playwright gegen `http://localhost:3000`)  
**Acceptance:** `.qa/acceptance/voicebox-dev-cors-proxy.md`  
**Verdict:** **PASS**

---

## Summary

Der Dev-Proxy `/__voicebox` funktioniert: Stimmen laden über same-origin ohne CORS-Fehler. Preset-Provider (Kokoro) nutzen denselben Pfad. Offline-Fall zeigt weiterhin eine Fehlermeldung.

---

## Technical checks

| Command | Result |
|---------|--------|
| `npm run verify -- --frontend` | PASS |

---

## E2E scenarios

| Spec | Result |
|------|--------|
| `.qa/runs/2026-07-13-voicebox-dev-cors-proxy.spec.ts` (3 tests) | **3/3 PASS** |
| `.qa/runs/2026-07-13-voicebox-preset-provider-catalog.spec.ts` (regression) | run below |
| `.qa/runs/2026-07-13-voicebox-provider.spec.ts` (regression) | run below |

### Feature tests

1. **dev proxy loads voices without CORS errors** — PASS  
   - Keine Console-CORS-Meldungen  
   - Requests an `/__voicebox/health` und `/__voicebox/profiles`  
   - Profil „Proxy Test Stimme“ sichtbar  
   - Screenshot: `.qa/evidence/voicebox-dev-cors-proxy/01-voice-catalog-loaded.png`

2. **preset provider uses dev proxy path** — PASS  
   - Kokoro-Presets laden über Proxy

3. **edge: voicebox offline shows error via proxy** — PASS  
   - Select disabled + destructive error text  
   - Screenshot: `.qa/evidence/voicebox-dev-cors-proxy/03-voicebox-offline.png`

---

## Acceptance mapping

| Criterion | Status |
|-----------|--------|
| Keine CORS-Fehler für `/health` / `/profiles` | OK |
| Eigene Stimmen zeigt Profile | OK |
| Preset-Provider (Kokoro) zeigt Presets | OK |
| Dev nutzt `/__voicebox` (kein direkter `127.0.0.1:17493` fetch) | OK (request interception bestätigt) |
| Production direkte URL | OK (unit test `resolveVoiceboxBaseUrl` isDev:false) |
| Offline sinnvolle Fehlermeldung | OK |
| `useTtsVoiceProfiles` Tests | OK (verify) |

**Nicht im Browser geprüft:** `VITE_VOICEBOX_BASE_URL` Custom-Target für Proxy (nur Code-Review vite.config.ts).

---

## Regression updates

Bestehende Playwright-Mocks von `http://127.0.0.1:17493/*` auf `/__voicebox/*` angepasst:

- `2026-07-13-voicebox-preset-provider-catalog.spec.ts`
- `2026-07-13-voicebox-provider.spec.ts`
- `mve-6b-voice-ui.spec.ts`

---

## Evidence

| File | Description |
|------|-------------|
| `.qa/evidence/voicebox-dev-cors-proxy/01-voice-catalog-loaded.png` | Stimmenliste geladen |
| `.qa/evidence/voicebox-dev-cors-proxy/02-no-cors-console.png` | Dialog nach erfolgreichem Load |
| `.qa/evidence/voicebox-dev-cors-proxy/03-voicebox-offline.png` | Offline-Fehlerzustand |

---

## Follow-up (optional)

- Manuell in Tauri `dev:desktop` mit **echtem** Voicebox (ohne Mock) einmal verifizieren — Playwright nutzt gemockte Proxy-Routes.
- `@review-ticket` als nächster Schritt.
