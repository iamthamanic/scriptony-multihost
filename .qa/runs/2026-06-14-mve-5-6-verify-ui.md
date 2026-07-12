# Verify-UI Report: MVE #5 + #6 (Dialog-Editor + Characters-Voice)

**Datum:** 2026-06-14  
**Verdict:** **PARTIAL**

## Projekt

| Feld | Wert |
|------|------|
| Workspace | `scriptony-multihost` |
| App root | `.` |
| Stack | Vite + React + **Tauri** (desktop-first) |
| Playwright | **skipped** — nicht im Repo; Browser-E2E deckt LocalBackend/Kokoro nicht ab |
| Dev | `npm run dev:desktop` läuft (Vite :3000 + Tauri WebView) |

## Technische Basis

| Check | Befehl | Ergebnis |
|-------|--------|----------|
| Scoped checks | `CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend" SHIM_CHANGED_FILES="…mve…"` | **PARTIAL** — lint/typecheck/test/build grün; **AI Review REJECT** wegen untracked `AudioLaneDeleteAlertDialog.tsx` (nicht MVE-Scope) |
| MVE Unit tests | `npm run test -- --run src/lib/mve src/components/audio/__tests__/AudioTimelineSegment.test.tsx` | **PASS** (23 tests) |
| E2E | — | **SKIPPED** (kein Playwright) |
| Chrome DevTools MCP | `navigate_page` / `list_pages` | **BLOCKED** — Chrome-Profil bereits in Nutzung |

## Kontext-Quellen

- [x] `.qa/acceptance/mve-characters-voice-panel.md`
- [x] `.qa/acceptance/mve-timeline-dialog-editor.md`
- [x] `.qa/project.yaml`
- [x] `AGENTS.md` / `docs/DESKTOP_FIRST_DEV.md`
- [x] `.qa/edge-cases.md`

## Akzeptanzkriterien — Issue #6 (Characters-Voice)

| # | Kriterium | Auto | Manuell (Tauri) | Evidence |
|---|-----------|------|-----------------|----------|
| 1 | Characters-Panel unter Timeline | — | **pending** | `.qa/evidence/mve-characters-voice-panel/01-characters-panel.png` |
| 2 | Kokoro-Stimme → `mve_voice_profiles` | Unit (assign upsert) | **pending** | `02-voice-assigned.png` |
| 3 | Preview-Satz + Play | Unit (desktop guard) | **pending** | `03-preview-play.png` |
| 4 | Generate mit Charakter-Voice | Code review | **pending** | `04-generate-with-voice.png` |
| 5 | + Neu Charakter + Lane | Hook test | **pending** | — |
| 6 | DE loading/empty/error | — | **pending** | — |

## Akzeptanzkriterien — Issue #5 (Dialog-Editor)

| # | Kriterium | Auto | Manuell (Tauri) | Evidence |
|---|-----------|------|-----------------|----------|
| 1 | Dialogtext am Clip editierbar | Segment tests (mock) | **pending** | `.qa/evidence/mve-timeline-dialog-editor/01-happy-path.png` |
| 2 | LineDirection persistiert | Schema tests | **pending** | — |
| 3 | Dirty-Flag | `ensure-mve-line` tests | **pending** | — |
| 4 | Snippet checks grün | PASS (ohne AI noise) | — | — |
| 5 | Kein Audio-Render in Slice | Code | OK | — |

## Edge Cases

| ID | Case | Ergebnis | Anmerkung |
|----|------|----------|-----------|
| G-01 | Tauri lädt | **pending** | Vite HTTP 200; WebView = manuell |
| G-03 | Kein Projekt | **pending** | Panel zeigt Hinweis statt Crash |
| R-02 | Keine Cloud-Session | **pending** | Kokoro-Hinweis im Panel |
| MVE-01 | Generate ohne Stimme | Code + Unit | Menü disabled + Toast — **manuell bestätigen** |
| A-01 | Dialog vs SFX Lanes | Unit (lane map) | — |

## Manuelle Tauri-Checkliste (autoritativ für PASS)

`npm run dev:desktop` → Workspace wählen → `.scriptony`-Projekt (Audio/Hörspiel) öffnen:

### #6 Characters-Voice

1. [ ] Structure Timeline → unter Audio-Spuren: **„Charaktere (N)"** sichtbar  
2. [ ] **+ Neu** → Charakter anlegen → erscheint in Liste + Dialog-Lane  
3. [ ] **Stimme auswählen** (Kokoro) → Toast „Stimme zugewiesen"  
4. [ ] Standard-Satz editieren → **Vorschau** abspielen (Audio hörbar)  
5. [ ] Dialog-Spur **+** → **Generate Audio** **disabled** ohne Stimme; **aktiv** mit Stimme  
6. [ ] Generate mit Text → TTS startet (Toast „Charakter-Stimme")  
7. [ ] Ohne Cloud-Login: Hinweis „Cloud-TTS … Kokoro lokal nutzbar"

### #5 Dialog-Editor (Regression)

8. [ ] Dialog-Clip: Text inline editieren → speichert  
9. [ ] Regie-Popover (Emotion/Tempo/Pause) → speichert  
10. [ ] Record / Upload Add Audio weiter nutzbar  

Screenshots nach `.qa/evidence/mve-characters-voice-panel/` und `mve-timeline-dialog-editor/` speichern.

## UX-Bewertung (ohne Live-Screenshots)

- Mockup-Platzierung Characters **unter Timeline**: implementiert (Code)  
- Browser `localhost:3000`: **kein** LocalBackend — nicht als PASS zählen  
- Console/Network: nicht automatisiert (MCP blockiert)

## Kritische Probleme

1. **Kein automatisierter UI-Nachweis** — Tauri + Local SQLite + Kokoro erfordern manuelle Session.  
2. **AI Review** schlägt auf unrelated `AudioLaneDeleteAlertDialog.tsx` fehl → scoped gate blockiert bis Datei gefixt/ignoriert.

## Playwright Bootstrap

**Nicht empfohlen** für dieses Ticket: Desktop-first, LocalBackend nur in Tauri-Shell. Playwright gegen Vite-Browser testet MVE-Panel nur als „nur Desktop verfügbar"-Hinweis.

## Empfehlung

- **PARTIAL** bis manuelle Tauri-Checkliste (oben) mit Screenshots erledigt ist.  
- Danach Verdict auf **PASS** heben und `@review-ticket` für #5+#6.  
- Optional: unrelated `AudioLaneDeleteAlertDialog.tsx` aus Worktree entfernen/fixen für grünes AI Review.
