# MVE #6b — Tauri Verify-Checkliste (Copy-Paste)

**Ziel:** Verify-UI von **PARTIAL** → **PASS**  
**Dauer:** ~5–10 Min.  
**Voraussetzung:** `npm run dev:desktop` (Tauri + Vite :3000)

Screenshots nach: `.qa/evidence/mve-characters-voice-panel/`

---

## Setup (einmal)

```bash
docker stop scriptony-frontend 2>/dev/null || true
npm run dev:desktop
```

- [ ] Workspace-Ordner wählen  
- [ ] **Audio/Hörspiel**-`.scriptony`-Projekt öffnen (DAW-Lanes sichtbar)  
- [ ] Mindestens **1 Charakter** im Projekt (sonst anlegen)

---

## A — Charakter-Stimme (Zeile + Modal)

1. [ ] Zu **Charaktere** scrollen (unter Structure & Beats, **nicht** unter Timeline)  
2. [ ] Charakter-Karte **aufklappen**  
3. [ ] Zeile sichtbar: **`Charakterstimme`** | Status | **▶** | **✎**  
4. [ ] **Kein** inline Dropdown / kein Standard-Satz-Input in der Karte  
5. [ ] Screenshot: `01-character-voice-row.png`  
6. [ ] **✎ Edit** klicken → Modal **„Charakterstimme — {Name}"**  
7. [ ] Modal enthält: Stimme (Kokoro), Standard-Satz, Geschwindigkeit, Beschreibung  
8. [ ] Block **„Voice Studio (MVP 0.4)"** sichtbar (disabled)  
9. [ ] Screenshot: `02-voice-editor-modal.png`  

---

## B — Stimme zuweisen + Play

10. [ ] Im Modal: **Kokoro-Stimme** wählen → Toast **„Stimme zugewiesen"**  
11. [ ] Optional: Standard-Satz anpassen → **Speichern** → Modal schließt  
12. [ ] Zeile zeigt **Stimmenname** (nicht „nicht zugewiesen")  
13. [ ] **▶ Play** in der Zeile → **Audio hörbar** (Kokoro)  
14. [ ] Screenshot: `03-preview-play-row.png`  

**Falls kein Ton:** Kokoro-Sidecar prüfen (Toast „Kokoro-Server…"); Projekt erneut öffnen.

---

## C — Generate Audio (Timeline)

15. [ ] Structure Timeline → **Audio Dialog**-Spur des Charakters  
16. [ ] **Ohne Stimme** (anderer Charakter): **Generate Audio** disabled oder Hinweis  
17. [ ] **Mit Stimme:** **+** → **Generate Audio** → Text eingeben → Generierung startet  
18. [ ] Toast/Feedback (z. B. lokale TTS / Charakter-Stimme)  
19. [ ] Screenshot: `04-generate-with-voice.png`  

---

## D — Edge / Regression (kurz)

20. [ ] **Ohne Cloud-Login:** Hinweis „Cloud-TTS … Kokoro lokal nutzbar" im Charaktere-Bereich  
21. [ ] Charakter **Bearbeiten** / **Löschen** Buttons weiter nutzbar  
22. [ ] Dialog-Clip: Text editierbar (#5)  
23. [ ] Lane-Header: Vol/Solo/Mute/FX unverändert (kein Voice-UI dort)  

---

## Abschluss

Wenn **A–C** grün:

- [x] Screenshots im Evidence-Ordner (automatisiert via Playwright — siehe unten)
- [x] Verify-Report: `.qa/runs/2026-06-14-mve-6b-verify-ui.md` → **PASS**
- [ ] `@review-ticket` für GitHub **#6** / #6b

### Automatisiert (2026-06-14)

```bash
# dev:desktop muss laufen
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test .qa/runs/mve-6b-voice-ui.spec.ts
```

Harness: `http://localhost:3000/#qa-mve-voice` (nur `import.meta.env.DEV`)

**Hörbarer Play + echtes Generate** auf Timeline weiterhin optional per Tauri (Punkte 13–18).  

**Hinweis Kokoro:** Kein API-Key in Einstellungen — Sidecar startet über Tauri automatisch. Cloud-TTS (ElevenLabs etc.) ist **nicht** Teil von #6b; Keys nur unter **Einstellungen → KI & LLM → Audio → Text-to-Speech**.
