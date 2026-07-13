# Voicebox / Character Voice Modal — Diagnose (macOS)

**Datum:** 2026-07-13  
**Repo:** scriptony-multihost  
**Symptom:** Toast/Zeile im Character-Voice-Modal:  
`TTS-Dienst antwortet nicht. Scriptony startet ihn automatisch im Hintergrund — bitte erneut versuchen.`

---

## 1. Voicebox installiert?

```text
$ ls -la /Applications/Voicebox.app 2>&1
total 0
drwxr-xr-x@  3 halteverbotsocialmacpro  staff    96 Apr 26 00:21 .
drwxrwxr-x  50 root                     admin  1600 Jul 12 20:05 ..
drwxr-xr-x   7 halteverbotsocialmacpro  staff   224 Apr 26 00:23 Contents
```

**Ergebnis:** Ja, `/Applications/Voicebox.app` vorhanden.

---

## 2. Voicebox HTTP erreichbar?

```text
$ curl -sS -m 5 http://127.0.0.1:17493/health 2>&1
{"status":"healthy","model_loaded":false,"model_downloaded":null,"model_size":null,"gpu_available":true,"gpu_type":"MPS (Apple Silicon)","vram_used_mb":null,"backend_type":"mlx","backend_variant":"cpu","gpu_compatibility_warning":null}

$ curl -sS -m 5 http://127.0.0.1:17493/profiles 2>&1 | head -c 500
[{"id":"3b58d657-09a9-47cd-9fa0-1ac134c5e272","name":"Ccc","description":"Ccc","language":"zh",...}]
```

**Ergebnis:** `/health` → `status: healthy`; `/profiles` → HTTP 200 mit mindestens einem Profil.  
**Hinweis:** `model_loaded: false` — Modell noch nicht im RAM; blockiert **nicht** `engineReady` (nur `health.status === "healthy"`).

---

## 3. Prozess / Port 17493

```text
$ pgrep -l -i voicebox 2>&1
633 voicebox
1407 voicebox-server
2301 voicebox-server
3084 voicebox-server

$ lsof -i :17493 2>&1 | head -5
COMMAND    PID                    USER   FD   TYPE  ...  NAME
voicebox   633 halteverbotsocialmacpro   13u  IPv4 ...  TCP localhost:49670->localhost:17493 (ESTABLISHED)
voicebox- 2301 halteverbotsocialmacpro   21u  IPv4 ...  TCP localhost:17493 (LISTEN)
voicebox- 2301 halteverbotsocialmacpro   23u  IPv4 ...  TCP localhost:17493 (ESTABLISHED)
```

**Ergebnis:** Voicebox-GUI + mehrere `voicebox-server`-Prozesse; Port **17493** wird von PID 2301 gebunden (LISTEN).

---

## 4. Env-Konfiguration

### `.env.local` (nur Voicebox-relevante Keys, keine Secrets)

| Variable | Wert |
|----------|------|
| `VITE_DEFAULT_VOICE_ENGINE` | `voicebox` |
| `VITE_VOICEBOX_BASE_URL` | `http://127.0.0.1:17493` |
| `VITE_VOICEBOX_APP_NAME` | `Voicebox` |
| `VITE_VOICEBOX_APP_PATH` | `/Applications/Voicebox.app` |

### `.env.local.example` (Voicebox-Abschnitt)

Kommentierte Defaults identisch: `voicebox`, `http://127.0.0.1:17493`, App-Name/Pfad, Install-Hinweis `./scripts/install-voicebox-macos.sh`.

**Ergebnis:** Konfiguration stimmt mit Standard-Port und installiertem App-Pfad überein.

---

## 5. Manueller Start (Test)

Voicebox lief bereits; `open -g -j /Applications/Voicebox.app` ohne Fehler.

```text
$ curl -sS -m 5 http://127.0.0.1:17493/health  (nach ~3 s)
{"status":"healthy",...,"model_loaded":false,...}
```

---

## 6. Code-Pfad (readonly)

| Stelle | Verhalten |
|--------|-----------|
| `src/lib/voicebox/voicebox-loading-progress.ts` | `waitForVoiceboxReadyWithProgress`: pollt `isVoiceboxHealthy()` alle 500 ms, max **90 s** (`VOICEBOX_BOOT_TIMEOUT_MS`). Bei Timeout → exakt die User-Meldung. Startet via Tauri `start_voicebox_app` (`open -g -j`). |
| `src/lib/api/voicebox-api.ts` → `isVoiceboxHealthy()` | `true` wenn `/health` → `status === "healthy"` **oder** (Fallback) `GET /profiles` → `ok`. |
| `src/hooks/useTtsVoiceProfiles.ts` | `ensureVoiceboxSidecar` → obiger Wait; danach `engineReady: health?.status === "healthy"`. Fehler aus `catch` → `engineError` (gleiche Timeout-Message). **`retry: 0`** für Voicebox/Kokoro — ein Fehlschlag bleibt bis Query invalidation/staleTime. |
| `src/components/characters/CharacterVoiceRow.tsx` | Bei zugewiesener Stimme + `!engineReady` + `engineError` → Label „TTS-Dienst nicht erreichbar“; `engineError` als Tooltip-Text in der Zeile sichtbar. |
| `src/components/characters/VoiceProfileEditorModal.tsx` | `toast.error(engineError)` u. a. bei „Stimme vorschlagen“, wenn `!engineReady`. |
| `src-tauri/.../voicebox.rs` | Rust prüft nur `/profiles` (2 s Timeout) für Launch-Entscheidung; CSP erlaubt `http://127.0.0.1:*`. |

**Wichtig:** Die gemeldete Zeichenkette kommt **nur** aus dem **90-Sekunden-Boot-Timeout** in `voicebox-loading-progress.ts`, nicht aus „falschem Port“ oder `engineReady`-Strenge allein (bei laufendem `/health` healthy wäre `engineReady` true).

---

## Root Cause (wahrscheinlichste)

**Zum Diagnosezeitpunkt ist Voicebox voll funktionsfähig** — der Fehler entstand daher sehr wahrscheinlich **zeitlich / transient**:

1. **Kaltstart-Fenster:** Beim Öffnen des Modals war `http://127.0.0.1:17493` für Scriptony (WebView-`fetch`) **länger als 90 s** nicht als „healthy“ oder `/profiles`-ok erkennbar — z. B. Voicebox noch nicht gestartet, App gerade erst per `open` angestoßen, oder Server noch nicht auf 17493 gebunden.
2. **Kein automatischer Retry:** `useTtsVoiceProfiles` setzt `retry: 0` für Voicebox — nach dem Timeout bleibt `engineError` gesetzt, bis die Query neu läuft (Modal schließen/öffnen, Cache ablaufen, oder App neu laden), **obwohl Voicebox danach healthy ist** (wie jetzt per `curl`).
3. **Nebenbefund:** Mehrere `voicebox-server`-PIDs können auf wiederholte Auto-Starts hindeuten; aktuell lauscht nur einer auf 17493 — kein Port-Konflikt sichtbar.

**Unwahrscheinlich bei aktueller Maschine:** Fehlende Installation, falscher `VITE_VOICEBOX_BASE_URL`, CSP-Blockade, `engineReady` wegen `status !== "healthy"` (Health ist `healthy`).

---

## Empfehlung für den User

1. **Erneut versuchen:** Modal schließen, 10–30 s warten, erneut öffnen — oder Scriptony einmal neu starten (`npm run dev:desktop`), während Voicebox im Hintergrund läuft.
2. **Voicebox manuell sicherstellen:** Einmal `/Applications/Voicebox.app` öffnen (oder Menüleisten-Icon), dann in Scriptony die Charakterstimme erneut bearbeiten.
3. **Erster Start nach Install:** Bis zu **1–2 Minuten** warten (HTTP-Server + ggf. Modell-Download); bei sehr langsamem Start ggf. Voicebox vor Scriptony starten.
4. **Env:** Bereits korrekt — keine Änderung nötig, sofern Desktop mit dieser `.env.local` gebaut wird.
5. **Install-Fallback:** Nur wenn `open` fehlschlägt: `./scripts/install-voicebox-macos.sh`

---

## Code-Fix-Empfehlung (optional, nicht umgesetzt)

Diagnose zeigt **keinen harten Bug** im laufenden Zustand. Sinnvolle kleine Verbesserungen (falls der Fehler wiederholt auftritt):

| Maßnahme | Nutzen |
|----------|--------|
| `VOICEBOX_BOOT_TIMEOUT_MS` z. B. 90 → **120–180 s** | Erster Voicebox-Start nach Reboot/Update |
| `retry: 1` (oder manueller „Erneut verbinden“-Button) nach Timeout | Verhindert „hängenden“ `engineError`, wenn Dienst kurz danach healthy ist |
| Timeout-Meldung differenzieren: „90 s überschritten — Voicebox manuell öffnen“ vs. „nicht installiert“ | Klarere UX (Install-Fehler kommt bereits aus `start_voicebox_app` / launch-guard) |

**Nicht empfohlen:** `engineReady` nur über `/profiles` setzen — aktuell deckt `isVoiceboxHealthy()` das bereits ab; Problem ist das **Warten vor** erfolgreichem Health/Profiles, nicht die Ready-Logik danach.

---

## Aktion in diesem Lauf

- Nur Diagnose + Report.
- **Kein** Code-Change, **kein** Commit.
- `npm run verify` nicht ausgeführt (keine Änderungen).

