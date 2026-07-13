# Debug Report — `voicebox-cors-localhost-3000`

**Date:** 2026-07-13  
**Project:** scriptony-multihost  
**Shell:** tauri  
**Repro grade:** full  

---

## Summary

Voicebox-API-Aufrufe aus dem Tauri-Dev-WebView (`http://localhost:3000`) werden vom **Browser-CORS** blockiert, weil Voicebox nur `http://tauri.localhost` / `tauri://localhost` als Origin erlaubt — nicht `http://localhost:3000`. Der Server antwortet mit HTTP 200, aber ohne passenden `Access-Control-Allow-Origin` → keine Stimmen in keinem Provider.

**Confidence:** high

---

## Bug description

| | |
|--|--|
| **Expected** | Stimmen-Kataloge laden (Eigene Stimmen, Kokoro, Qwen, …) nach Voicebox-Verbindung |
| **Actual** | Leere Listen; Konsole: `Origin http://localhost:3000 is not allowed by Access-Control-Allow-Origin` auf `/health` und `/profiles` |
| **Steps** | 1. `npm run dev:desktop` 2. Projekt öffnen 3. Charakterstimme / Voice-Modal öffnen 4. Provider wählen → keine Stimmen, CORS-Fehler in DevTools |

---

## Reproduction

- **Command / URL:** Tauri dev (`devUrl: http://localhost:3000` in `tauri.conf.json`) + Voicebox auf `http://127.0.0.1:17493`
- **Playwright spec:** nicht benötigt — Shell + curl reproduziert CORS-Mismatch
- **Result:** reproduced

### CORS-Beweis (Shell)

```bash
# Origin localhost:3000 → kein Allow-Origin Header
curl -s -i -H "Origin: http://localhost:3000" http://127.0.0.1:17493/health
# → HTTP 200, aber KEIN access-control-allow-origin

# Preflight → explizit abgelehnt
curl -s -i -X OPTIONS -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" http://127.0.0.1:17493/health
# → HTTP 400 "Disallowed CORS origin"

# Tauri-Production-Origins → erlaubt
curl -s -i -H "Origin: http://tauri.localhost" http://127.0.0.1:17493/health
# → access-control-allow-origin: http://tauri.localhost

curl -s -i -H "Origin: tauri://localhost" http://127.0.0.1:17493/health
# → access-control-allow-origin: tauri://localhost
```

---

## Evidence

### Console (User)

```
Origin http://localhost:3000 is not allowed by Access-Control-Allow-Origin. Status code: 200
Fetch API cannot load http://127.0.0.1:17493/health due to access control checks.
Fetch API cannot load http://127.0.0.1:17493/profiles due to access control checks.
```

### Network

| Method | URL | Status | Note |
|--------|-----|--------|------|
| GET | `http://127.0.0.1:17493/health` | 200 | Blockiert im Browser — fehlendes/falsches CORS |
| GET | `http://127.0.0.1:17493/profiles` | 200 | Gleicher CORS-Block |
| OPTIONS | `http://127.0.0.1:17493/health` | 400 | `Disallowed CORS origin` |

### Tauri native

- `src-tauri/src/commands/voicebox.rs` nutzt **reqwest** (kein CORS) → Rust-Health-Check kann erfolgreich sein, während JS-`fetch` scheitert.
- CSP (`devCsp`) erlaubt `connect-src … http://127.0.0.1:*` — **CSP ist nicht das Problem**.

---

## Prior art

- [x] Repo: `src/lib/api/voicebox-api.ts` — direkte `fetch(\`${VOICEBOX_BASE_URL}/…\`)` ohne Proxy
- [x] Repo: `src/lib/config/voice-engine.ts` — Default `VOICEBOX_BASE_URL = http://127.0.0.1:17493`
- [x] Repo: `src-tauri/tauri.conf.json` — `devUrl: http://localhost:3000`
- [x] Repo: `vite.config.ts` — Proxy für Appwrite (`/__dev-proxy/…`) und Bridge (`/bridge/*`), **kein Voicebox-Proxy**
- [x] Diagnose: `.qa/runs/2026-07-13-voicebox-diagnosis.md` — curl healthy, aber **CORS nicht geprüft**; Timeout-Hypothese trifft auf diesen Fall nicht zu

---

## Root cause

**Schicht:** Frontend-Adapter + Dev-Runtime-Mismatch (nicht Voicebox-Installation, nicht Provider-Logik).

1. Im Desktop-Dev lädt Tauri die UI von **`http://localhost:3000`** (Vite HMR).
2. `voicebox-api.ts` ruft Voicebox per **`fetch` cross-origin** auf `http://127.0.0.1:17493` auf.
3. Voicebox (uvicorn/FastAPI CORS) whitelistet **`tauri.localhost` / `tauri://localhost`**, aber **nicht `http://localhost:3000`**.
4. WebView wendet CORS an → Response wird verworfen → `getVoiceboxHealth()` / `listVoiceboxProfiles()` liefern leer/Fehler → **keine Stimmen für alle Provider**.
5. Production-Build (Origin `tauri://localhost` oder `https://tauri.localhost`) wäre CORS-seitig OK — Bug betrifft primär **`dev:desktop`**.

**Warum es „jedes Mal neu lädt“:** Zusätzlich lädt jeder Provider separat; ohne erfolgreichen ersten Fetch bleibt der Cache leer und jeder Wechsel scheitert erneut am gleichen CORS-Problem.

---

## Suggested fix (minimal)

### Option A (empfohlen): Vite same-origin Proxy im Dev

Analog zu `/bridge/health` in `vite.config.ts`:

1. **`vite.config.ts`:** Proxy `'/__voicebox'` → `http://127.0.0.1:17493` (rewrite Pfad-Prefix)
2. **`src/lib/config/voice-engine.ts`:** In `import.meta.env.DEV` → `VOICEBOX_BASE_URL = '/__voicebox'` (same-origin, kein CORS)
3. Production unverändert: direkte URL `http://127.0.0.1:17493` (Tauri-Origin erlaubt)

### Option B: Tauri `devUrl` auf erlaubte Origin

`tauri.conf.json` `devUrl` → `https://tauri.localhost` (nur wenn Vite dort zuverlässig läuft — mehr Moving Parts).

### Option C: Tauri HTTP-Bridge

Generisches `invoke('voicebox_http', { path, method, body })` — mehr Aufwand, aber dev+prod einheitlich ohne Proxy.

**Regression test:** Playwright-Route-Mock auf relative URL `/__voicebox/health` ergänzen oder Integration-Test, der in DEV-Mode `VOICEBOX_BASE_URL` auf Proxy zeigt.

**Next step:** `@implement` (User hat in dieser Runde nur `@debug` angefordert)

---

## Notes

- `curl` ohne Origin-Header funktioniert — erklärt warum frühere Diagnose „Voicebox healthy“ meldete.
- E2E-Tests mocken `http://127.0.0.1:17493/*` direkt (`.qa/runs/mve-6b-voice-ui.spec.ts`) und umgehen damit CORS — Tests grün, Desktop-Dev rot.
- Assumption: User läuft `npm run dev:desktop`, nicht Browser-only — Origin `localhost:3000` passt zu beiden, CORS-Problem identisch.
