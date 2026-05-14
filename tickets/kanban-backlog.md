# Scriptony Kanban Board — Audio/Hörspiel & Film Ripple Epic

## Legend

| Status      | Icon | Bedeutung                         |
| ----------- | ---- | --------------------------------- |
| Backlog     | 📋   | Noch nicht gestartet, priorisiert |
| In Progress | 🚧   | Aktiv in Arbeit                   |
| Blocked     | ⛔️   | Wartet auf Abhängigkeit           |
| Review      | 🔍   | Code-Review / QA                  |
| Done        | ✅   | Abgeschlossen mit Done-Report     |

---

## Backlog

### 🎯 Epic: Vereinheitlichtes Clip-System mit Ripple für alle Projekttypen

- [x] **T27** — `plan` — [AudioClip-Zielmodell und Ripple-Architektur](done-T27-plan-audioclip-ripple-architektur.md) _(präzisiert: Feature-Flags, DB-Schema, API-Verträge, Migrationsplan, T26-Kompatibilität)_
  - Abhängigkeiten: Keine
  - Schätzung: 2–3 Tage
  - Assignee: TBD
  - Review: ✅ Präzisiert 2026-05-13
  - **Done:** 2026-05-13

- [x] **T28** — `implementation` — [AudioClip Fundament](done-T28-implementation-audioclip-fundament.md) _(Phase A: Shadow Clips, Feature-Flag aus)_
  - Abhängigkeiten: T27 ✅
  - Schätzung: 3–4 Tage
  - Assignee: TBD
  - **Done:** 2026-05-13

- [ ] **T29** — `implementation` — [WPM-Schätzung und Clip-Initialisierung](todo-T29-implementation-wpm-schaetzung-clip-init.md) _(Phase B: Dual-Write)_
  - Abhängigkeiten: T28 ✅
  - Schätzung: 2–3 Tage
  - Assignee: TBD

- [ ] **T30** — `implementation` — [Ripple und Synchronisation](todo-T30-implementation-ripple-synchronisation.md) _(Phase C: Ripple aktiv)_
  - Abhängigkeiten: T28 ✅, T29 ✅
  - Schätzung: 4–5 Tage
  - Assignee: TBD

- [ ] **T31** — `implementation` — [TTS-Pipeline und Audio-Generierung](todo-T31-implementation-tts-pipeline.md)
  - Abhängigkeiten: T30 ✅
  - Schätzung: 4–5 Tage
  - Assignee: TBD

- [ ] **T32** — `implementation` — [DAW-Features: Multi-Lanes, Track-Header, FX-Chain](todo-T32-implementation-daw-features.md)
  - Abhängigkeiten: T31 ✅
  - Schätzung: 5–7 Tage
  - Assignee: TBD

- [ ] **T33** — `implementation` — [Film-Refactoring: Vereinheitlichtes Clip-Ripple](todo-T33-implementation-film-refactoring.md)
  - Abhängigkeiten: T30 ✅
  - Schätzung: 5–7 Tage
  - Assignee: TBD

---

## In Progress

_(Keine aktuell — T26 ist done)_

---

## Blocked

_(Keine aktuell — T27 hat keine Blocker)_

---

## Done

- [x] **T26** — Audio Dropdown CRUD (Hierarchie: Akt/Sequenz/Szene hinzufügen, bearbeiten, löschen) ✅ **Done**
  - Status: Abgeschlossen
  - Smoke-Test: `tickets/T26-audio-dropdown-crud/SMOKE_TEST.md`

- [x] **T20** — Plan Storage Zielmodell
- [x] **T21** — Plan Collaboration Zielmodell
- [x] **T22** — AGENTS.md Audit (todo, aber referenziert)
- [x] **T23** — Components Reorganisation
- [x] **T24** — Implementation Storage Implementieren
- [x] **T25** — Implementation Collaboration Implementieren

---

## Roadmap / Phasen

```
Woche 1–2:  [T27] Plan ────────────> [T28] Fundament
Woche 2–3:              [T29] WPM ─────> [T30] Ripple
Woche 3–4:                           [T31] TTS
Woche 4–5:                                    [T32] DAW
Woche 5–7:                                             [T33] Film
```

---

## Schnelle Navigation

| Ticket | Datei                                                         |
| ------ | ------------------------------------------------------------- |
| T27    | `tickets/todo-T27-plan-audioclip-ripple-architektur.md`       |
| T28    | `tickets/todo-T28-implementation-audioclip-fundament.md`      |
| T29    | `tickets/todo-T29-implementation-wpm-schaetzung-clip-init.md` |
| T30    | `tickets/todo-T30-implementation-ripple-synchronisation.md`   |
| T31    | `tickets/todo-T31-implementation-tts-pipeline.md`             |
| T32    | `tickets/todo-T32-implementation-daw-features.md`             |
| T33    | `tickets/todo-T33-implementation-film-refactoring.md`         |

---

_Letzte Aktualisierung: 2026-05-13_
