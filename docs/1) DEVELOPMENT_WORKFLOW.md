# Scriptony Dev-Workflow — Remote-First Standard

> **Gültig ab:** 2026-05-09  
> **Autor:** AI-Assistant / Development Team  
> **Status:** VERBINDLICH — Abweichungen nur mit dokumentierter Begründung

---

## 1. Architektur-Prinzip: Remote-First

Scriptony arbeitet mit einer **Remote-First** Architektur. Das bedeutet:

| Komponente | Wo läuft sie? | Warum? |
|-----------|--------------|--------|
| **Appwrite Core** (Auth, DB, Storage) | Remote-Server (`72.61.84.64:8080`) | Zentrale Datenbank, läuft 24/7 |
| **HTTP Functions** (`scriptony-*`) | Remote-Server | Echte Daten, echte Auth, keine lokalen Mock-Daten |
| **Frontend** (Vite) | **Lokal** (`localhost:3000`) | Hot-Reload, schnelle Iteration |

### Was wir NICHT verwenden

- ❌ **Kein lokales Docker** für den normalen Dev-Workflow
- ❌ **Kein lokales Appwrite** (außer für spezielle Docker-Tests)
- ❌ **Kein `npm run dev`** (das startet Docker, bricht oft ab)

### Warum Remote-First?

1. **Echte Daten:** Du arbeitest mit der tatsächlichen Datenbank
2. **Echte Auth:** Login/Session-Management funktioniert identisch zu Production
3. **Kein Sync-Problem:** Keine lokalen → remote Daten-Migrationen
4. **Schneller Setup:** Kein Docker-Setup, kein Warten auf Container-Start

---

## 2. Frontend-Entwicklung (Vite)

### Starten

```bash
# Einfacher Vite-Server (KEIN Docker!)
npx vite --port 3000 --strictPort
```

### Was passiert

- Vite läuft auf `http://localhost:3000`
- Dev-Proxy leitet `/__dev-proxy/scriptony-*` an den Remote-Server weiter
- Hot-Reload funktioniert für React/TypeScript-Code
- **Änderungen am Frontend** sind sofort sichtbar

### Wichtig

- **Immer `http://localhost:3000` nutzen, NIEMALS `http://127.0.0.1:3000`!** CORS behandelt `localhost` und `127.0.0.1` als verschiedene Origins. Der Appwrite-Server erlaubt nur `http://localhost:3000`. Wenn du `127.0.0.1` aufrufst, schlägt jeder Request mit CORS-Fehlern fehl.
- Nach **Backend-Deploys** muss der Browser **reloaded** werden (F5)
- Der Vite-Server muss NICHT neugestartet werden

---

## 3. Backend-Entwicklung (Functions)

### Ablauf: Code → Deploy → Test

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. Code     │ ──▶ │  2. Checks   │ ──▶ │  3. Deploy   │ ──▶ │  4. Browser  │
│  ändern      │     │  laufen      │     │  auf Server  │     │  Test        │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### Schritt 1: Code ändern

- Bearbeite `functions/scriptony-*/routes/*.ts`
- Oder `functions/_shared/*` (shared utilities)

### Schritt 2: Checks laufen lassen

```bash
# Normaler Check (Snippet-Mode)
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks

# Backend-Only (schneller)
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --backend

# Full-Check (nach großen Änderungen)
CHECK_MODE=full SHIM_CHECKS_ARGS="" npm run checks -- --refactor
```

**Checks MÜSSEN grün sein bevor deployed wird.**

### Schritt 3: Function deployen

```bash
# Einzelne Function deployen
npm run appwrite:deploy:audio-story
npm run appwrite:deploy:beats
npm run appwrite:deploy:characters
# ... usw.

# Alle Functions deployen (VORSICHT!)
# bash scripts/deploy-appwrite-function.sh --all
```

**Wichtig:** Nach Env-Variablen-Änderungen muss redeployed werden.

### Schritt 4: Im Browser testen

1. Vite-Server läuft bereits (`npx vite --port 3000`)
2. Browser reload (F5)
3. Feature testen

---

## 4. Env-Variablen auf dem Server

Jede Function braucht diese Env-Variablen:

| Variable | Wert | Zweck |
|----------|------|-------|
| `APPWRITE_API_KEY` | `standard_...` | DB-Zugriff innerhalb der Function |
| `SCRIPTONY_APPWRITE_API_ENDPOINT` | `http://appwrite/v1` | Interner Docker-Endpunkt |
| `APPWRITE_ENDPOINT` | `http://72.61.84.64:8080/v1` | Fallback |
| `APPWRITE_PROJECT_ID` | `69c04993003de8ff42aa` | Project-Scope |

### Warum `http://appwrite/v1`?

Functions laufen **innerhalb des Docker-Netzwerks** auf dem Server. `appwrite` ist der Hostname des Appwrite-Containers. Die öffentliche IP (`72.61.84.64`) ist **NICHT** von innerhalb der Function erreichbar (Docker-Netzwerk-Isolation).

### Vergleich: Vor vs. Nach Refactor

| | Vor Refactor | Nach Refactor |
|---|-------------|---------------|
| **Server** | Ein zentraler `make-server` | Viele `scriptony-*` Functions |
| **Env-Vars** | Einmal für `make-server` | Für JEDE Function einzeln |
| **Deploy** | Ein Befehl | Pro Function ein Befehl |
| **Fehler** | Einer zentral | Jede Function isoliert |

**Wichtig:** Bei der Umstellung von Monolith zu Micro-Functions wurden die Env-Variablen **nicht automatisch kopiert**. Das musste manuell nachgeholt werden.

---

## 5. Troubleshooting

### Problem: "Appwrite/proxy returned HTML (404) instead of JSON"

**Ursache:** Function nicht deployed oder Env-Variablen fehlen

**Lösung:**
```bash
# 1. Prüfe ob Function deployed ist
curl http://scriptony-XYZ.appwrite.scriptony.raccoova.com:8080/health

# 2. Env-Variablen prüfen (Appwrite Console → Functions → XYZ → Variables)

# 3. Function neu deployen
npm run appwrite:deploy:XYZ
```

### Problem: "500 Internal Server Error" oder "Transport failure"

**Ursache:** `APPWRITE_API_KEY` ist leer oder `APPWRITE_FUNCTION_API_ENDPOINT` zeigt auf die falsche URL

**Lösung:**
```bash
# 1. Prüfe Env-Variablen der Function
npx appwrite-cli functions list-variables --function-id scriptony-XYZ

# 2. APPWRITE_API_KEY setzen (wenn leer)
npx appwrite-cli functions create-variable \
  --function-id scriptony-XYZ \
  --key APPWRITE_API_KEY \
  --value "standard_..."

# 3. SCRIPTONY_APPWRITE_API_ENDPOINT setzen
npx appwrite-cli functions create-variable \
  --function-id scriptony-XYZ \
  --key SCRIPTONY_APPWRITE_API_ENDPOINT \
  --value "http://appwrite/v1"

# 4. Redeploy
npm run appwrite:deploy:XYZ
```

### Problem: Vite-Server startet nicht (Port 3000 belegt)

**Ursache:** Docker-Container `scriptony-frontend` blockiert den Port

**Lösung:**
```bash
# Docker-Frontend stoppen
docker stop scriptony-frontend

# Oder: Nur Vite starten (kein Docker)
npx vite --port 3000 --strictPort
```

### Problem: Änderungen am Backend sind nicht sichtbar

**Ursache:** Browser hat alten Code gecached / Function hat alten Code

**Lösung:**
1. Function redeployen
2. Browser hard-reload (Cmd+Shift+R / Ctrl+Shift+R)
3. Ggf. Vite-Server neustarten (nicht nötig für Frontend-Änderungen)

---

## 6. Docker — wann und wofür?

Docker wird **nur** für folgende Szenarien verwendet:

| Szenario | Docker-Befehl | Hinweis |
|----------|-------------|---------|
| **Lokales Appwrite-Setup** | `docker compose --env-file infra/appwrite/.env up -d` | Nur für lokale Appwrite-Tests |
| **Bridge für ComfyUI/Blender** | `docker compose up bridge` | Für lokale AI-Pipeline |

**Normaler Dev-Workflow verwendet KEIN Docker.**

---

## 7. Checkliste für Feature-Entwicklung

- [ ] Frontend-Code in `src/` geschrieben
- [ ] Backend-Code in `functions/scriptony-*/` geschrieben
- [ ] Checks laufen lassen (`npm run checks`)
- [ ] Backend-Function deployen (`npm run appwrite:deploy:...`)
- [ ] Im Browser testen (F5)
- [ ] Commit erstellen
- [ ] Push

---

## 8. Änderungen an diesem Dokument

- Änderungen nur nach Absprache mit dem Team
- Datum und Autor aktualisieren
- Änderungsgrund dokumentieren

---

*Letzte Aktualisierung: 2026-05-09*  
*Status: VERBINDLICH*
