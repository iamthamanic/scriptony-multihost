---
id: "scriptony-architecture-refactor-tickets-2026-05-13"
status: "todo"
priority: "high"
assignee: null
epic: null
dueDate: null
created: "2026-05-13T11:24:03.039Z"
modified: "2026-05-22T07:36:48.102Z"
completedAt: null
labels: []
order: "a0"
---
# # Scriptony Architecture Refactor Tickets

```markdown
# Scriptony Architecture Refactor Tickets

Stand: 2026-05-13

## Ziel

Diese Tickets etablieren eine vereinheitlichte Clip-basierte Zeitarchitektur für alle Projekttypen (Film, Serie, Audio, Buch). Das Ziel ist die Trennung von Plan (narrative Struktur) und Ist (temporale Realisierung) mit Bottom-Up-Ripple-Propagation.

## Zielarchitektur

| Gruppe    | Functions                                                                                                                                                                                |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core      | `scriptony-auth`, `scriptony-projects`, `scriptony-structure`, `scriptony-script`, `scriptony-characters`, `scriptony-worldbuilding`, `scriptony-timeline`, `scriptony-editor-readmodel` |
| Media     | `scriptony-assets`, `scriptony-audio`, `scriptony-image`, `scriptony-video`, `scriptony-media-worker`                                                                                    |
| Workflows | `scriptony-audio-production`, `scriptony-stage`, `scriptony-stage2d`, `scriptony-stage3d`, `scriptony-style`, `scriptony-style-guide`, `scriptony-sync`, `scriptony-gym`                 |
| Platform  | `scriptony-ai`, `scriptony-assistant`, `scriptony-jobs`, `scriptony-observability`, `scriptony-admin`, `scriptony-mcp-appwrite`, `scriptony-storage`, `scriptony-collaboration`          |
| Legacy    | `jobs-handler`, `make-server-3b52693b`                                                                                                                                                   |

## Arbeitsregeln

- Neue Features muessen vor Codeaenderung in der Domain Map einer Ziel-Function zugeordnet sein.
- Jede Code-Phase beginnt mit Analyse der betroffenen Dateien, Routen, Collections, Buckets, Env Vars und Frontend-Aufrufer.
- Keine Breaking Changes ohne Compatibility Wrapper oder dokumentierte Migration.
- Keine technische Provider-Logik in Produkt-Orchestration.
- Keine Produktlogik in technischen Media APIs.
- Keine Upload-Duplikation ausserhalb von `scriptony-assets`.
- Keine Job-Status-Duplikation ausserhalb von `scriptony-jobs`.
- Kein Script-/Dialogtext in `scriptony-audio-production` als Source of Truth.
- Keine Editor-Aggregation in `scriptony-structure`.
- `_shared` enthaelt primitive Infrastruktur, Typen, Permission-Primitives und kleine Adapter, aber keine Workflow-Orchestration.
- `scriptony-storage` besitzt Storage Provider, Storage-OAuth, Storage Connections, Storage Targets, Storage Objects, Sync, Import und Export.
- `scriptony-assets` besitzt fachliche Asset-Metadaten, nicht Provider-OAuth oder physische Storage-Strategie.
- Asset-Uploads muessen ueber eine Storage-Abstraktion laufen. Initial darf diese Appwrite Storage verwenden.
- `scriptony-collaboration` besitzt Projektfreigaben, Mitglieder, Rollen, Einladungen, Organisationen/Workspaces und Access Checks.
- Direkte Projektfreigabe ohne Organisation muss moeglich bleiben.
- Neue Domain-Functions duerfen Projektzugriff nicht direkt ueber `project.created_by` pruefen.
- Neue Domain-Functions muessen Access-Helper wie `canReadProject`, `canEditProject`, `canManageProject` verwenden.
- Initiale Access-Helper-Implementierung darf intern noch `created_by` pruefen, muss aber spaeter `project_members` und `organization_members` beruecksichtigen koennen.
- UI-Aenderungen muessen zum bestehenden UI/UX-System passen: keine neuen Marketing-Layouts, keine unpassenden Komponenten, keine ungeprueften Responsiveness- oder Accessibility-Regressions.

## Done-Report-Vertrag

Beim Abschluss jedes Tickets muss ein Done Report in `docs/scriptony-architecture-refactor 25.04.26.md` geschrieben werden.

Format:

```md
## Phase X - <Bereich>

### Done Report: TXX - <Ticket-Titel>

- Date: YYYY-MM-DD HH:mm CEST
- Verification Marker: ARCH-REF-TXX-DONE
- Changed files:
- Appwrite collections:
- Appwrite buckets:
- Env vars:
- Routes:
- UI/UX checks:
- Tests run:
- Shimwrappercheck command:
- Shimwrappercheck result:
- AI Review result:
- Known risks:
- Rollback plan:
- Notes:
```

Wenn die passende Phase im Done-Report-Dokument noch fehlt, wird sie beim Abschluss des Tickets angelegt.

## Pflicht-Checks

Alle Implementierungstickets muessen ueber den Shim laufen. AI Review darf nicht deaktiviert werden. Die genaue Check-Matrix steht zusaetzlich in `docs/scriptony-architecture-refactor 25.04.26.md`.

Standard-Gate fuer normale Tickets:

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks
```

Wenn unrelated User-Aenderungen im Worktree liegen, muss der Ticket-Scope explizit gesetzt werden:

```bash
SHIM_CHANGED_FILES="path/a.ts,path/b.md" CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks
```

Alternativ kann `SHIM_CHANGED_FILES_FILE` auf eine Datei mit einem Pfad pro Zeile zeigen. Der Scope gilt fuer Format/Lint/Function-Build und wird an den AI Review als Diff-Datei durchgereicht.

Backend-only Gate, wenn sicher kein Frontend/UI betroffen ist:

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --backend
```

Frontend-only Gate, wenn sicher keine Functions/Appwrite-Konfiguration betroffen sind:

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --frontend
```

---

# T27 — AudioClip-Zielmodell und Ripple-Architektur für alle Projekttypen

## Kontext

Scriptony unterstützt vier Projekttypen (Film, Serie, Audio/Hörspiel, Buch), die jeweils über einen hierarchischen Strukturbaum (Akt → Sequence → Szene → Shot/Track) und eine Timeline-Ansicht verfügen. Aktuell gibt es zwei inkompatible Zeitmodelle:

- **Film/Serie**: PCT-basierte Hierarchie (`metadata.pct_from`/`pct_to`). `Clip` existiert als separates NLE-Objekt, ist aber sekundär zur Struktur. Kein Ripple-Effekt — wenn ein Shot länger wird, muss manuell getrimmt werden.
- **Audio/Hörspiel**: `AudioTrack` enthält `startTime`/`duration` direkt auf dem Plan-Objekt. Plan und Ist sind vermischt. Es gibt keine separate Clip-Ebene.

Beide Modelle haben das gleiche Problem: **Plan (Struktur) und Ist (Zeit) sind nicht sauber getrennt**, und es gibt keine automatische Propagation von Zeitänderungen durch die Hierarchie.

## Problem

1. **AudioTrack ist Plan+Ist in einem Objekt**: `startTime`/`duration` sitzen auf dem Track. Änderungen im Text (Plan) beeinflussen direkt die Timeline (Ist) ohne explizite Generierung.
2. **Kein Clip-System für Audio**: Es gibt keine `AudioClip`-Entität. Die Timeline rendert direkt `AudioTrack`. TTS-Generierung hat keine Zielstruktur für das Ergebnis.
3. **Kein Ripple bei Film**: Wenn ein Shot länger wird, rutscht nichts automatisch nach. Die PCT-Prozente müssen manuell angepasst werden.
4. **Keine Bottom-Up-Dauerberechnung**: Bei Audio sollte sich die Szene-Dauer aus den Clips ergeben. Bei Film ergibt sich die Shot-Dauer aus PCT-Prozenten. Beides ist unintuitiv.
5. **Strukturänderungen im Dropdown synchronisieren sich nicht automatisch mit der Timeline**: Verschieben einer Sequence im Dropdown erfordert manuelle Neuberechnung in der Timeline.

## Lösung

Einführung eines **vereinheitlichten Clip-Systems** für alle Projekttypen mit **Bottom-Up-Ripple-Propagation**:

### Zielmodell

```
Film:       Akt → Sequence → Szene → Shot  → [Clip]
Audio:      Akt → Sequence → Szene → Track → [AudioClip]
Buch:       Akt → Sequence → Szene → Section → [optional]
```

| Konzept                               | Beschreibung                                                                                                                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Plan-Element** (Shot/Track/Section) | Narrativer Inhalt: Text, Bilder, Emotion, Charakter. **Keine Zeit.**                                                                                                                                 |
| **Clip**                              | Temporale Realisierung: `startSec`, `endSec`, `laneIndex`, `audioFileId`, `waveformData`.                                                                                                            |
| **Container-Dauer**                   | Bottom-Up: `scene.endSec = max(clip.endSec in scene)`, `sequence.endSec = sum(scene.durations)`, `act.endSec = sum(sequence.durations)`                                                              |
| **Ripple**                            | Wenn ein Clip länger wird (`endSec += delta`) → nachfolgende Clips in derselben Szene rutschen → nachfolgende Szenen in derselben Sequence rutschen → nachfolgende Sequences im selben Akt rutschen. |

### Für Audio spezifisch

- `AudioTrack` verliert `startTime`/`duration` (Migration auf `audio_clips`)
- `AudioClip` wird als neue Collection eingeführt
- `laneIndex` bestimmt die Spur: `0` = Dialog Spur 1, `1` = Dialog Spur 2, `10` = SFX Spur 1, `11` = SFX Spur 2, `20` = Musik, `30` = Atmo
- **WPM-Schätzung** für Tracks ohne generiertes Audio: `duration = (wordCount / 150) * 60`
- **TTS-Generierung** erzeugt `AudioClip` mit echter Dauer und `waveformData`

### Für Film spezifisch

- `Clip` existiert bereits — wird erweitert um `laneIndex` (für zukünftige Multi-Lane-Film-Timeline)
- **Optional**: PCT-basiertes System bleibt als Fallback, Ripple wird als zusätzlicher Modus eingeführt

### Cross-Scene-Elemente (Musik, Atmo)

- Beliebige Clips können `crossScene: true` + `absoluteStartSec`/`absoluteEndSec` haben
- Werden in einem **Global Lane Pool** (Lane 90+) angezeigt
- Ripple ignoriert absolute Clips (sie verschieben sich nicht mit Szenen)

## User Journey

### Szenario 1: Autor plant Hörspiel

1. Autor öffnet Audio-Projekt, geht in Dropdown-Ansicht
2. Fügt Szene 1 → Track "Dialog Pazuzu" mit Text hinzu
3. Setzt Emotion auf "amüsiert", ordnet Charakter zu
4. Wechselt zu Timeline-Ansicht
5. Track erscheint als Clip mit WPM-Schätzung (3.5s) auf Pazuzu-Lane
6. Autor kann Clip verschieben/trimmen. Änderung erzeugt Ripple.

### Szenario 2: TTS-Generierung verlängert Szene

1. Autor klickt "TTS Generieren" auf Track
2. TTS liefert Audio-File mit 8.2s statt geschätzter 3.5s
3. Clip.endSec aktualisiert sich auf 8.2s
4. Ripple: Szene 1.endSec += 4.7s → Sequence 1.endSec += 4.7s → Akt 1.endSec += 4.7s → Szene 2 startet um 4.7s später
5. Autor sieht in Timeline: alles ab Szene 2 hat sich nach rechts verschoben

### Szenario 3: Film-Autor verschiebt Sequence

1. Autor zieht Sequence 3 vor Sequence 1 im Dropdown
2. Timeline aktualisiert: Sequence 3 jetzt bei t=0, Sequence 1 folgt danach
3. Alle Shots/Clips in Sequence 3 haben neue absolute Zeiten (kaskadiert)

## Akzeptanzkriterien

- [ ] `AudioTrack` enthält keine Zeit-Felder mehr (Plan-rein)
- [ ] `AudioClip` Type ist in `src/lib/types/index.ts` definiert mit allen Feldern
- [ ] `audio_clips` Collection ist in Appwrite/Hasura angelegt
- [ ] Ripple-Algorithmus ist als Pseudocode/Flowchart dokumentiert
- [ ] Lane-Index-Schema ist dokumentiert (Dialog 0-9, SFX 10-19, Musik 20-29, Atmo 30-39, Global 90+)
- [ ] WPM-Schätzungsformel ist dokumentiert
- [ ] Migrationspfad für bestehende `scene_audio_tracks` (Entfernung von `startTime`/`duration`) ist beschrieben
- [ ] Film-Clip-System ist auf Ripple-Erweiterung geprüft
- [ ] Keine Breaking Changes ohne dokumentierte Migration

## Architekturskizze

```
┌─────────────────────────────────────────────────────────────┐
│                    DROPDOWN (Plan)                             │
│  Akt → Sequence → Szene → Track (Text, Emotion, Charakter)  │
│                              ↓                                │
│                    ┌──────────────┐                           │
│                    │   WPM-Sch.   │  duration = words/150*60  │
│                    └──────────────┘                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ create/update/delete Track
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    AUDIO CLIP (Ist)                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ id, trackId, sceneId, projectId                        │ │
│  │ startSec, endSec, laneIndex                            │ │
│  │ audioFileId?, waveformData?, orderIndex              │ │
│  └────────────────────────────────────────────────────────┘ │
│                              ↓                                │
│                    ┌──────────────┐                         │
│                    │   Ripple      │  Cascade: Clip → Szene   │
│                    │   Engine      │  → Seq → Akt             │
│                    └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    TIMELINE (Visualisierung)                   │
│  Lane 0: [Pazuzu Clip]──────┐                               │
│  Lane 1: [Kamara Clip]───────┤                               │
│  Lane 10:[SFX Zug]────[SFX Rk]│                               │
│  Lane 20:[Musik      ]────────┘ (cross-scene, absolute)       │
│  ────────────────────────────────► Zeit (Sekunden)            │
└─────────────────────────────────────────────────────────────┘
```

## Edge Cases

1. **Clip wird kürzer als Schätzung**: Nachfolgende Clips rutschen nach links (negative Ripple). Muss gegen `startSec < 0` schützen.
2. **Zwei Clips überlappen sich in derselben Lane**: Erlaubt oder verboten? → **Erlaubt** (Layering in DAWs), aber visuell markieren (Overlay-Opacity).
3. **Szene hat keine Clips**: Szene-Dauer = 0s. In Timeline: Szene-Header trotzdem anzeigen, aber als 1px Marker oder mit "Leer"-Label.
4. **Cross-Scene-Musik startet vor Szene 1**: `absoluteStartSec = -5` (Pre-Roll). Timeline-Ruler muss negative Zeit unterstützen oder Musik beginnt bei t=0.
5. **TTS-Generierung fehlschlägt**: Clip behält WPM-Schätzung. Toast zeigt Fehler. Retry-Button auf Clip.
6. **Track wird gelöscht, aber Clip existiert (mit Audio)**: Clip wird verwaist (orphan). Garbage-Collection nach 30 Tagen oder manuelles Löschen.
7. **Film-Projekt hat bestehende PCT-basierte Daten**: PCT-Werte bleiben als `metadata.pct_from`/`pct_to` erhalten. Neue Clips werden Bottom-Up berechnet. Legacy-Modus kann über Feature-Flag umgeschaltet werden.

## SOLID / DRY / KISS

- **Single Responsibility**: `AudioTrack` = Plan (Text/Emotion). `AudioClip` = Ist (Zeit/Audio). `RippleEngine` = Berechnung. `TimelineRenderer` = Visualisierung.
- **Open/Closed**: Neue Track-Typen (z.B. "Foley") erfordern nur neue Lane-Index-Range. Keine Änderung am Ripple-Algorithmus.
- **Liskov Substitution**: `AudioClip` und `FilmClip` implementieren gemeinsames `Clip` Interface (`startSec`, `endSec`, `laneIndex`).
- **Interface Segregation**: Plan-Elemente (Track/Shot) haben keinen Zeit-Interface. Nur Clips haben Zeit.
- **Dependency Inversion**: Timeline rendert `Clip[]`, nicht `Track[]`. Dropdown rendert `Track[]`, nicht `Clip[]`.
- **DRY**: Ripple-Algorithmus wird für Audio und Film geteilt (unterschiedliche Inputs, gleiche Logik).
- **KISS**: Keine PCT-Prozente für Audio. Nur absolute Sekunden. Keine doppelte Zeit-Ebene (Track-Zeit + Clip-Zeit).

## Abhängigkeiten

- Keine Blocker. T26 (Audio Dropdown CRUD) kann parallel laufen, da T27 das Datenmodell neu definiert und T28 die Implementierung liefert.
- T27 muss abgeschlossen sein, bevor T28 (Implementation) startet.
```