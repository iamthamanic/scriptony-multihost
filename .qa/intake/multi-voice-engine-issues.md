# Issue draft: multi-voice-engine (MVP 0.1)

<!-- DRAFT — not created on GitHub yet. Updated 2026-06-24 — UI: Structure Timeline -->

**Epic design:** `.qa/design/multi-voice-engine.md`  
**PRD source:** `docs/multi-voice-engine.md`  
**UI anchor:** `StructureTimelineEditor` + Audio Dialog lanes + Characters panel (user mockup 2026-06-24)  
**Status:** CREATED ON GITHUB (2026-06-24)

| GitHub | Title |
|--------|-------|
| #3 | MVE: Schema-Modul und Zod-Typen |
| #4 | MVE: Local SQLite-Persistenz (Line ↔ Clip) — Depends on #3 |
| #5 | MVE: Timeline Dialog-Editor — Depends on #3, #4 |
| #6 | MVE: Characters-Panel und VoiceProfile — Depends on #3, #4 |
| #7 | MVE: Enhance-Script — Depends on #3 |

## Summary (5 Issues)

| # | Priority | Title | Depends on | Labels |
|---|----------|-------|------------|--------|
| 1 | P0 | MVE: Schema-Modul und Zod-Typen | — | P0 |
| 2 | P0 | MVE: Local SQLite-Persistenz (Line ↔ Clip) | 1 | P0 |
| 3 | P1 | MVE: Timeline Dialog-Editor (Text, LineDirection, Dirty) | 1, 2 | P1 |
| 4 | P1 | MVE: Characters-Panel und VoiceProfile-Zuweisung | 1, 2 | P1 |
| 5 | P1 | MVE: Enhance-Script (`POST /script/enhance`) | 1 | P1 |

**Parallel möglich nach #2:** Issue 3 und 4 können parallel; Issue 5 ab #1.

**MVP 0.2 (Adapter + Takes):** GitHub [#17](https://github.com/iamthamanic/scriptony-multihost/issues/17)–[#23](https://github.com/iamthamanic/scriptony-multihost/issues/23) — siehe `.qa/intake/mve-render-0.2-issues.md`

**Deferred (MVP 0.3+):** STT text-back, Scene Mix, Performance Reference, Sounddesign layers. Voice Clone Modal → 0.4 (#11–#16).

---

## Issue 1 — MVE: Schema-Modul und Zod-Typen

### Intent
Zentrales Domänenmodell ohne UI/TTS-Kopplung.

### Solution
- `src/lib/multi-voice-engine/schema/` — Scene, Character, Line, LineDirection, VoiceProfile (MVP-Felder)
- Optional: `lineId` / `audioClipId` Verknüpfung für Timeline-Binding
- Vitest + PRD §8 Beispielpayload

### Acceptance
- [ ] Zod-Schemas exportiert
- [ ] Kein React/TTS in schema/
- [ ] Unit tests grün

---

## Issue 2 — MVE: Local SQLite-Persistenz (Line ↔ Clip)

### Intent
Lines, LineDirection, VoiceProfile lokal persistieren; Bindung an Timeline-Clips.

### User Journey
1. User erstellt Dialog-Clip auf Audio-Dialog-Spur (`AddAudioTimelineMenu`).
2. System speichert zugehörige Line (Text, characterId, sceneId).
3. Nach Neustart: Clip + Line konsistent.

### Solution
- SQLite-Migration im `.scriptony`-Projekt
- Repository: `src/backend/local/` + `api-adapter` + `dispatchByRuntime`
- Mapping Line ↔ `AudioClip` (Feld auf Line oder erweitertes Clip-Metadatum)

### Acceptance
- [ ] CRUD Line + VoiceProfile lokal
- [ ] Line an Clip/Szene referenzierbar
- [ ] Repository mapper test

### Blockers
Depends on: Issue 1

---

## Issue 3 — MVE: Timeline Dialog-Editor (Text, LineDirection, Dirty)

### Intent
PRD Core Editor **in der Structure Timeline** — Dialogtext und Regie am Clip, nicht in separater Ansicht.

### User Journey
1. User öffnet Projekt → **Timeline-Ansicht** (`timelineview`).
2. Auf Audio-Dialog-Spur: Clip zeigt **Dialogtext** (wie Mockup).
3. User editiert Text; Popover/Inspector: Emotion, Pace, Pause (`LineDirection`).
4. Änderung setzt `dirty: true` (für Re-Render in 0.2).
5. `AddAudioTimelineMenu` bleibt: Record / Upload / Generate (Generate-Verdrahtung Voice → Issue 4).

### Solution (bestehende Dateien erweitern)
- `AudioTimelineSegment.tsx` — Text-Anzeige/-Edit am Clip
- `ClipLanePopover.tsx` oder neues `MveLineInspector.tsx` — LineDirection
- `StructureTimelineAudioLanes.tsx` / `useTimelineAddAudio` — Line beim Clip-Anlegen
- **Kein** neues Panel in `AudioDropdownView` oder `NativeAudiobookView`

### Edge Cases
- Clip ohne Line → Empty/„Text hinzufügen“
- Lane ohne Charakter → Hinweis vor Generate
- Lange Dialoge → Scroll im Clip/Popover

### Acceptance
- [ ] Dialogtext am Timeline-Clip editierbar (local)
- [ ] LineDirection (Emotion/Pace/Pause) editierbar + persistiert
- [ ] Dirty-Flag bei Text/Direction-Änderung
- [ ] DE UI; loading/empty/error
- [ ] Snippet frontend checks grün
- [ ] Kein Audio-Render in diesem Slice

### Blockers
Depends on: Issue 1, Issue 2

---

## Issue 4 — MVE: Characters-Panel und VoiceProfile-Zuweisung

### Intent
Charakter-Stimmen im **Characters-Bereich unter der Timeline** (Mockup): Zuweisung, Preview mit Standard-Satz.

### User Journey
1. User sieht Characters-Panel unter der Structure Timeline.
2. Pro Charakter: Stimme zuweisen (erweitert `CharacterVoiceSelector`).
3. Play-Button spielt **Standard-Preview-Satz** mit zugewiesener Stimme.
4. `Generate Audio` auf Dialog-Spur nutzt diese VoiceProfile (Verdrahtung mit `useTimelineAddAudio`).

### Solution
- Neues/erweitertes `MveCharactersPanel.tsx` unter Timeline-Shell (in `StructureTimelineEditor` oder Parent)
- VoiceProfile CRUD lokal; `localAssignVoice` echte Persistenz
- `canUseCloudSession()` für Cloud-TTS-Liste; Kokoro/local sonst
- **MVP 0.1:** kein volles Voice-Studio-Modal (Clone/global library → 0.4)

### Edge Cases
- Charakter ohne Stimme → Generate disabled + DE-Hinweis
- Keine Cloud-Session → Cloud-TTS-Liste ausgegraut

### Acceptance
- [ ] Characters-Panel sichtbar in Timeline-Kontext
- [ ] VoiceProfile pro Charakter persistiert
- [ ] Preview-Satz abspielbar (local Kokoro oder stub)
- [ ] Generate Audio liest Charakter-Voice der Lane

### Blockers
Depends on: Issue 1, Issue 2

---

## Issue 5 — MVE: Enhance-Script (`POST /script/enhance`)

### Intent
Rohtext → strukturierte Characters/Lines (PRD §6.6); UI-Kontext Timeline/Szene.

### User Journey
1. User fügt Rohtext ein (Szene-Inspector oder Clip-Kontext).
2. Klick **Enhance** → mit Cloud: valides JSON → Lines auf Timeline-Spuren.
3. Ohne Cloud: DE-Toast, kein Crash.

### Solution
- `functions/scriptony-audio-story/routes/script-enhance.ts` — `POST /script/enhance`
- LLM via `_shared/ai-service`; Output Zod-validiert gegen Issue-1-Schema
- Frontend: `audio-story-adapter` + `dispatchByRuntime`; local stub
- Guardrails: keine erfundenen Inhalte/Namen/Zahlen (PRD)

### Acceptance
- [ ] Enhance API liefert valides Schema-JSON
- [ ] UI-Einstieg in Timeline-Kontext (min. Szene-Rohtext + Enhance-Button)
- [ ] Local stub ohne Crash
- [ ] Functions build check wenn `functions/` geändert

### Blockers
Depends on: Issue 1

---

## Next steps

1. Review OK → **„Issues anlegen“** oder `@feature-intake create multi-voice-engine`
2. `@ecc-runner` (empfohlene Reihenfolge: 1 → 2 → 3 ∥ 4 → 5; Runner sortiert nach `Depends on`)
