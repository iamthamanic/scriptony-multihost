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

# T30 — Ripple und Synchronisation: Bottom-Up Cascade

## Kontext

Nach T28/T29 existieren `AudioClip`s mit WPM-Schätzungen in der Timeline. Wenn sich ein Clip ändert (z.B. durch TTS-Generierung oder manuelles Trimmen), muss sich die **gesamte hierarchische Struktur** automatisch aktualisieren: Szene → Sequence → Akt. Außerdem müssen **nachfolgende Elemente** (spätere Szenen/Sequences/Acts) um das Delta verschoben werden. T30 implementiert diesen Ripple-Algorithmus.

## Problem

1. Clip.endSec ändert sich von 45s auf 90s (+45s Delta). Szene.endSec muss von 120s auf 165s aktualisiert werden. Nachfolgende Szene 2 startet nicht mehr bei 120s, sondern bei 165s.
2. Szene 1 wird im Dropdown vor Szene 2 verschoben (Reihenfolge). Alle Clips in Szene 1 müssen neue absolute Start-/Endzeiten bekommen.
3. Sequence 1 wird vor Sequence 2 verschoben. Alle Szenen in Sequence 1 und alle danach müssen neu berechnet werden.
4. Keine zentrale Recalculate-Funktion existiert aktuell.
5. Frontend und Backend können inkonsistent werden, wenn Ripple nur auf einer Seite passiert.

## Lösung

### Phase C: Ripple aktiv, Feature-Flag = true (T30)

T30 aktiviert das Ripple-System für Staging/Beta-User. Frontend rendert **nur noch AudioClip** (kein Fallback auf Track-Zeit). Backend stoppt Dual-Write für Audio-Projekte. Legacy-Track-Zeitfelder (`start_time`, `duration`) werden ignoriert.

### Ripple-Algorithmus (Backend + Frontend geteilt)

**Datei:** `src/lib/ripple-engine.ts` — Reine Funktion, kein React, kein State.

```ts
// src/lib/ripple-engine.ts

interface RippleInput {
  changedClipId: string;
  newEndSec: number;
  allClips: AudioClip[];
  allScenes: Scene[];
  allSequences: Sequence[];
  allActs: Act[];
}

interface RippleOutput {
  updatedClips: AudioClip[];
  updatedScenes: Scene[];
  updatedSequences: Sequence[];
  updatedActs: Act[];
}

export function calculateRipple(input: RippleInput): RippleOutput {
  const {
    changedClipId,
    newEndSec,
    allClips,
    allScenes,
    allSequences,
    allActs,
  } = input;

  const changedClip = allClips.find((c) => c.id === changedClipId);
  if (!changedClip) throw new Error("Clip not found");

  const delta = newEndSec - changedClip.endSec;
  if (delta === 0)
    return {
      updatedClips: [],
      updatedScenes: [],
      updatedSequences: [],
      updatedActs: [],
    };

  // 1. Update the changed clip
  const updatedClips = allClips.map((c) =>
    c.id === changedClipId ? { ...c, endSec: newEndSec } : c,
  );

  // 2. Update scene duration (max of clip ends in scene)
  const sceneId = changedClip.sceneId;
  const sceneClips = updatedClips.filter((c) => c.sceneId === sceneId);
  const newSceneEndSec = Math.max(...sceneClips.map((c) => c.endSec));

  const updatedScenes = allScenes.map((s) =>
    s.id === sceneId
      ? {
          ...s,
          endSec: newSceneEndSec,
          durationSec: newSceneEndSec - s.startSec,
        }
      : s,
  );

  // 3. Ripple: shift all clips in subsequent scenes within the same sequence
  const scene = updatedScenes.find((s) => s.id === sceneId);
  const sequenceId = scene?.sequenceId;
  const scenesInSequence = updatedScenes
    .filter((s) => s.sequenceId === sequenceId)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const sceneIndex = scenesInSequence.findIndex((s) => s.id === sceneId);

  for (let i = sceneIndex + 1; i < scenesInSequence.length; i++) {
    const nextScene = scenesInSequence[i];
    nextScene.startSec += delta;
    nextScene.endSec += delta;

    // Shift all clips in this subsequent scene
    const clipsInNextScene = updatedClips.filter(
      (c) => c.sceneId === nextScene.id,
    );
    clipsInNextScene.forEach((c) => {
      c.startSec += delta;
      c.endSec += delta;
    });
  }

  // 4. Update sequence duration (sum of scene durations)
  const newSequenceEndSec =
    scenesInSequence[scenesInSequence.length - 1]?.endSec || 0;

  const updatedSequences = allSequences.map((sq) =>
    sq.id === sequenceId
      ? {
          ...sq,
          endSec: newSequenceEndSec,
          durationSec: newSequenceEndSec - sq.startSec,
        }
      : sq,
  );

  // 5. Ripple: shift all subsequent sequences in the same act
  const sequence = updatedSequences.find((sq) => sq.id === sequenceId);
  const actId = sequence?.actId;
  const sequencesInAct = updatedSequences
    .filter((sq) => sq.actId === actId)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const seqIndex = sequencesInAct.findIndex((sq) => sq.id === sequenceId);

  for (let i = seqIndex + 1; i < sequencesInAct.length; i++) {
    const nextSeq = sequencesInAct[i];
    nextSeq.startSec += delta;
    nextSeq.endSec += delta;

    // Shift all scenes in this subsequent sequence
    const scenesInNextSeq = updatedScenes.filter(
      (s) => s.sequenceId === nextSeq.id,
    );
    scenesInNextSeq.forEach((s) => {
      s.startSec += delta;
      s.endSec += delta;

      // Shift all clips in these scenes
      const clipsInScene = updatedClips.filter((c) => c.sceneId === s.id);
      clipsInScene.forEach((c) => {
        c.startSec += delta;
        c.endSec += delta;
      });
    });
  }

  // 6. Update act duration (sum of sequence durations)
  const newActEndSec = sequencesInAct[sequencesInAct.length - 1]?.endSec || 0;

  const updatedActs = allActs.map((a) =>
    a.id === actId
      ? { ...a, endSec: newActEndSec, durationSec: newActEndSec - a.startSec }
      : a,
  );

  // 7. Ripple: shift all subsequent acts
  const sortedActs = updatedActs.sort((a, b) => a.orderIndex - b.orderIndex);
  const actIndex = sortedActs.findIndex((a) => a.id === actId);

  for (let i = actIndex + 1; i < sortedActs.length; i++) {
    const nextAct = sortedActs[i];
    nextAct.startSec += delta;
    nextAct.endSec += delta;

    // Shift all sequences in this act
    const seqsInAct = updatedSequences.filter((sq) => sq.actId === nextAct.id);
    seqsInAct.forEach((sq) => {
      sq.startSec += delta;
      sq.endSec += delta;

      // Shift all scenes
      const scenesInSeq = updatedScenes.filter((s) => s.sequenceId === sq.id);
      scenesInSeq.forEach((s) => {
        s.startSec += delta;
        s.endSec += delta;

        // Shift all clips
        const clips = updatedClips.filter((c) => c.sceneId === s.id);
        clips.forEach((c) => {
          c.startSec += delta;
          c.endSec += delta;
        });
      });
    });
  }

  return { updatedClips, updatedScenes, updatedSequences, updatedActs };
}
```

### Frontend: Optimistisches Update

```ts
// In AudioTimeline-Komponente
const handleClipTrim = (clipId: string, newEndSec: number) => {
  const ripple = calculateRipple({
    changedClipId: clipId,
    newEndSec,
    allClips,
    allScenes,
    allSequences,
    allActs,
  });

  // Optimistisches UI-Update
  setClips(ripple.updatedClips);
  setScenes(ripple.updatedScenes);
  setSequences(ripple.updatedSequences);
  setActs(ripple.updatedActs);

  // Persistenz im Hintergrund
  debouncedSaveToBackend(ripple);
};
```

### Backend: Batch-Update

```ts
// POST /clips/ripple
// Akzeptiert RippleOutput und speichert alle Änderungen in einer Transaktion
```

### Dropdown ↔ Timeline Synchronisation

Wenn im Dropdown eine Strukturänderung passiert (Szene/Sequence/Akt verschoben):

1. Frontend sendet neue `orderIndex` an Backend.
2. Backend berechnet **komplettes Ripple** für alle betroffenen Elemente.
3. Backend gibt neue absolute Zeiten zurück.
4. Frontend aktualisiert Timeline-State.

## User Journey

### Szenario 1: TTS verlängert Clip

1. Autor generiert TTS für Dialog in Szene 1.
2. TTS liefert 85s statt geschätzter 45s.
3. Clip.endSec aktualisiert auf 85s (+40s).
4. Ripple: Szene 1.endSec += 40s → Szene 2.startSec += 40s → alle Clips in Szene 2 += 40s.
5. Sequence 1.endSec += 40s → Sequence 2.startSec += 40s.
6. Akt 1.endSec += 40s → Akt 2.startSec += 40s.
7. Autor sieht in Timeline: alles ab Szene 2 hat sich nach rechts verschoben. Playhead bleibt.

### Szenario 2: Szene im Dropdown verschieben

1. Autor zieht Szene 3 vor Szene 2 im Dropdown.
2. `orderIndex` ändert sich.
3. Backend berechnet: Szene 3 jetzt bei t=120s (vorher t=300s), Szene 2 jetzt bei t=250s.
4. Alle Clips in beiden Szenen aktualisieren ihre absolute Zeit.
5. Timeline springt nicht — sanfte Animation der Verschiebung.

## Akzeptanzkriterien

- [ ] `calculateRipple()` existiert als geteilte Utility in `src/lib/ripple-engine.ts` (kein React, kein State, pure function)
- [ ] `RippleInput` und `RippleOutput` Interfaces sind definiert mit `stats` (affectedCounts)
- [ ] `checkForConflicts()` existiert für Optimistic Locking (Timestamp-Vergleich)
- [ ] Ripple aktualisiert Clips, Szenen, Sequences, Acts korrekt und vollständig
- [ ] Nachfolgende Elemente verschieben sich um exakt das Delta (kein Rundungsfehler)
- [ ] Cross-Scene-Tracks (`cross_scene: true`) werden NICHT verschoben (absolute Zeit)
- [ ] Strukturänderung im Dropdown → `PUT /scenes/reorder` → Backend berechnet komplettes Ripple → Frontend aktualisiert Timeline
- [ ] Optimistisches UI-Update: `setTimelineState` sofort nach lokaler Ripple-Berechnung, **kein Warten auf Backend**
- [ ] Debounced Persistenz: 500ms nach letzter Änderung → `POST /clips/ripple`
- [ ] Backend speichert Ripple in **einer Transaktion** (keine halben Updates, kein Orphan-Clip)
- [ ] Bei Backend-Fehler: `refetchTimeline()` → Rollback auf letzten konsistenten Server-Zustand
- [ ] Bei Konflikt (anderer User hat geändert): Toast + "Neu laden" / "Trotzdem speichern"
- [ ] Performance: Ripple für 1.000 Clips < 100ms, für 10.000 Clips < 500ms
- [ ] Unit-Tests für Ripple mit verschachtelten Szenen/Sequences/Acts (min. 20 Test-Cases)
- [ ] Integration-Test: Track-Create → Clip-Create → Ripple → Timeline-Update
- [ ] Feature-Flag `VITE_ENABLE_AUDIO_CLIP` ist auf Staging `true`, Prod `false` (Beta-Phase)
- [ ] Keine Regression: Feature-Flag = false → altes Verhalten unverändert
- [ ] `npm run typecheck` und Shimwrappercheck laufen durch

## Architekturskizze

```
┌──────────────────────────────────────────────────────────────┐
│                      RIPPLE ENGINE                            │
│                                                               │
│  Input: changedClip { id, newEndSec }                        │
│         allClips[], allScenes[], allSequences[], allActs[]   │
│                                                               │
│  Step 1: Update clip.endSec                                   │
│     ↓                                                         │
│  Step 2: Recalculate scene.endSec = max(clips.endSec)       │
│     ↓                                                         │
│  Step 3: Shift subsequent scenes in sequence by delta       │
│     ↓                                                         │
│  Step 4: Recalculate sequence.endSec                         │
│     ↓                                                         │
│  Step 5: Shift subsequent sequences in act by delta           │
│     ↓                                                         │
│  Step 6: Recalculate act.endSec                              │
│     ↓                                                         │
│  Step 7: Shift subsequent acts by delta                       │
│                                                               │
│  Output: { updatedClips, updatedScenes, updatedSequences,     │
│          updatedActs }                                       │
└──────────────────────────────────────────────────────────────┘
                              ↓
                    ┌──────────────┐
                    │   Frontend   │  Optimistisches Update
                    │   Backend    │  Persistenz-Transaktion
                    └──────────────┘
```

## Edge Cases

1. **Delta = 0**: Keine Ripple nötig. Früher Rückgabe.
2. **Negative Delta (Clip kürzer)**: Nachfolgende Elemente rutschen nach links. Schutz gegen `startSec < 0`.
3. **Szene ohne Clips**: Szene-Dauer = 0. Nachfolgende Szene startet direkt danach (kein Gap).
4. **Cross-Scene-Musik bei Ripple**: Musik-Clip hat `crossScene: true` und `absoluteStartSec`. Ripple ignoriert ihn. Aber: Wenn Szene verschoben wird, wo Musik startet → Musik bleibt an absoluter Zeit (startet jetzt früher/später relativ zur Szene).
5. **Zyklische Referenzen**: Nicht möglich durch Datenmodell (baumartige Hierarchie), aber prüfen.
6. **Gleichzeitige Ripple von zwei Usern**: Last-Write-Wins mit Timestamp. Konflikt-UI zeigt "Anderer User hat gerade geändert. Neu laden?"
7. **Ripple während Playback**: Playback pausiert nicht. Playhead zeigt auf neue Position (gleiche absolute Zeit, andere visuelle Position).

## SOLID / DRY / KISS

- **SRP**: `calculateRipple` macht nur Berechnung. `saveRipple` macht nur Persistenz. `renderRipple` macht nur UI.
- **DRY**: Ein Ripple-Algorithmus für Audio und Film (geteilt in `src/lib/ripple-engine.ts`).
- **KISS**: Keine PCT-Prozente in Ripple. Nur absolute Sekunden. Keine doppelte Berechnung (nicht PCT + Sekunden).
- **OCP**: Neue Container-Ebene (z.B. "Episode" für Serien) erfordert nur einen weiteren Loop im Algorithmus.
- **Liskov**: `calculateRipple` akzeptiert `BaseClip[]` — funktioniert mit `AudioClip` und `FilmClip`.

## Abhängigkeiten

- **Blocker**: T28 (AudioClip Fundament) und T29 (WPM-Schätzung) müssen abgeschlossen sein.
- **Nachfolger**: T31 (TTS-Pipeline) baut auf Ripple auf.
