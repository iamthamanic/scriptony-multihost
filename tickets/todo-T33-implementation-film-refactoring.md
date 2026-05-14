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

# T33 — Film-Refactoring: Vereinheitlichtes Clip-Ripple für Film/Serie

## Kontext

Nach T27–T32 ist das Audio-System vollständig auf Clip-basiertem Ripple. Film/Serie nutzt aktuell ein **PCT-basiertes Zeitmodell** (`metadata.pct_from`/`pct_to` auf Acts/Sequences/Scenes/Shots) mit sekundären `Clip` Objekten für NLE-Edits. T33 bringt das **vereinheitlichte Ripple-System** auch auf Film — als zusätzlicher Modus, nicht als Ersatz.

## Problem

1. Film-Timeline hat 8500 Zeilen in `VideoEditorTimeline.tsx`. PCT-basierte Logik ist überall verstreut (`calculateActBlocks`, `manualActTimings`, `buildFullActPctPreviewMapForTrim`).
2. Kein Ripple: Wenn Shot 1 länger wird, muss der User manuell die PCT-Werte der nachfolgenden Shots/Szenen anpassen.
3. `Clip` existiert für Film, aber ist ein **NLE-Add-on** (graue Spur unter Shots), nicht das primäre Zeitmodell.
4. Shot hat `shotlengthMinutes`/`shotlengthSeconds` als Plan-Dauer, aber die tatsächliche Timeline-Dauer kommt aus PCT-Prozenten.
5. Keine Synchronisation zwischen Dropdown-Reihenfolge und Timeline-Zeit: Verschieben einer Szene im Dropdown ändert nicht ihre Zeit in der Timeline.

## Lösung

### Strategie: Dual-Modus (nicht Big-Bang)

Film/Serie bekommt einen **zusätzlichen Ripple-Modus**, der neben dem PCT-Modus existiert. Per Projekt-Setting wählbar:

```ts
interface ProjectTimelineMode {
  mode: "pct" | "ripple"; // "pct" = Legacy, "ripple" = neu
}
```

**Default für neue Film-Projekte:** `"ripple"`.
**Bestehende Projekte:** `"pct"` (Migration optional).

### Schritt 1: FilmClip erweitern

`FilmClip` (bestehend) bekommt `laneIndex` (für zukünftige Multi-Lane Film-Timeline):

```ts
export interface Clip {
  id: string;
  projectId: string;
  shotId: string;
  sceneId: string;
  startSec: number;
  endSec: number;
  laneIndex: number; // NEU: 0 = Haupt-Spur, 1+ = Overlay/FX
  orderIndex: number;
  sourceInSec?: number;
  sourceOutSec?: number;
  createdAt?: string;
  updatedAt?: string;
}
```

### Schritt 2: Shot-Dauer Bottom-Up

Im Ripple-Modus:

```ts
// Shot-Dauer = Summe aller Clip-Dauern (statt PCT)
shot.endSec = shot.startSec + sum(shot.clips.map((c) => c.endSec - c.startSec));

// ODER: Shot-Dauer = Plan-Dauer (shotlengthSeconds) wenn keine Clips
shot.endSec = shot.startSec + (shot.shotlengthSeconds || 3); // Default 3s
```

### Schritt 3: Ripple-Engine für Film

Gleicher `calculateRipple`-Algorithmus wie Audio (T30), aber mit `FilmClip` statt `AudioClip`:

```ts
// src/lib/ripple-engine.ts — bereits generisch
function calculateRipple<T extends BaseClip>(
  changedClip: T,
  allClips: T[],
  allContainers: Container[],
  ...
): RippleOutput
```

### Schritt 4: VideoEditorTimeline erweitern

8500 Zeilen sind viel. Strategie: **Inkrementell**.

1. Neuer `useRippleTimeline`-Hook kapselt Ripple-Logik.
2. `VideoEditorTimeline` prüft `project.timelineMode`.
   - `"pct"`: Bestehende Logik (keine Änderung).
   - `"ripple"`: Neue Logik mit `useRippleTimeline`.
3. UI-Elemente (Trim-Handles, Playback, Zoom) bleiben identisch. Nur Datenquelle ändert sich.

### Schritt 5: Migration PCT → Ripple

```ts
// Einmalig pro Projekt
function migratePctToRipple(projectId: string): void {
  const acts = getActs(projectId);
  const sequences = getSequences(projectId);
  const scenes = getScenes(projectId);
  const shots = getShots(projectId);
  const durationSec = getProjectDuration(projectId);

  // Convert PCT to absolute seconds
  for (const act of acts) {
    const pctFrom = act.metadata?.pct_from ?? 0;
    const pctTo = act.metadata?.pct_to ?? 100;
    act.startSec = (pctFrom / 100) * durationSec;
    act.endSec = (pctTo / 100) * durationSec;
    act.durationSec = act.endSec - act.startSec;
  }

  // Same for sequences, scenes, shots...
  // Then create default Clips for each Shot
  for (const shot of shots) {
    createClip({
      shotId: shot.id,
      sceneId: shot.sceneId,
      startSec: shot.startSec,
      endSec: shot.endSec,
      laneIndex: 0,
    });
  }

  setProjectTimelineMode(projectId, "ripple");
}
```

## User Journey

### Szenario 1: Film-Autor trimmt Shot

1. Autor öffnet Film-Projekt im Ripple-Modus.
2. Trimmt Shot 1 in Timeline von 5s auf 15s (+10s).
3. Ripple: Shot 1.endSec = 15s → Szene 1.endSec += 10s → Sequence 1.endSec += 10s → Akt 1.endSec += 10s.
4. Shot 2 in derselben Szene rutscht um 10s nach rechts.
5. Alle nachfolgenden Szenen/Sequences/Acts rutschen mit.
6. Autor sieht sofort: Gesamtfilm ist jetzt 100s statt 90s.

### Szenario 2: Film-Autor verschiebt Szene im Dropdown

1. Autor zieht Szene 3 vor Szene 2 im Dropdown.
2. Backend berechnet Ripple: Szene 3 jetzt früher, Szene 2 später.
3. Timeline aktualisiert: Szenen-Blöcke tauschen Position.
4. Alle Shots/Clips in beiden Szenen aktualisieren absolute Zeiten.

### Szenario 3: Migration von altem Projekt

1. Autor öffnet altes PCT-basiertes Film-Projekt.
2. Toast: "Neues Ripple-System verfügbar. Migrations-Assistent starten?"
3. Autor klickt "Migrieren".
4. System konvertiert PCT-Werte zu absoluten Sekunden, erstellt Default-Clips.
5. Timeline sieht identisch aus, aber jetzt mit Ripple-Verhalten.

## Akzeptanzkriterien

- [ ] `project.timelineMode` Setting existiert (`"pct"` | `"ripple"`) in `project_settings` Collection
- [ ] Neuer `useRippleTimeline`-Hook existiert in `src/hooks/useRippleTimeline.ts`
- [ ] `VideoEditorTimeline` prüft `project.timelineMode` und rendert:
  - `"pct"`: Bestehende PCT-Logik (unverändert, keine Regression)
  - `"ripple"`: Neue `useRippleTimeline`-Logik (Bottom-Up)
- [ ] `useRippleTimeline` und `usePctTimeline` implementieren gleiches `TimelineHook` Interface
- [ ] Shot-Trimmen im Ripple-Modus triggert Ripple durch Szene/Sequence/Akt
- [ ] Dropdown-Strukturänderung (Szene verschieben) triggert Ripple in Timeline (Ripple-Animation)
- [ ] PCT-Modus bleibt **vollständig funktionsfähig** — bestehende Film-Projekte zeigen identische Timeline
- [ ] Neuer Film-Projekt startet automatisch im Ripple-Modus
- [ ] Bestehender Film-Projekt startet im PCT-Modus (Rückwärtskompatibel)
- [ ] Optionaler "Migrieren"-Button in Projekt-Settings konvertiert PCT → Ripple (manuell)
- [ ] Migrationsskript `migratePctToRipple()` existiert: PCT-Werte → absolute Sekunden → Default-Clips
- [ ] `Clip.laneIndex` existiert (für zukünftige Multi-Lane Film-Timeline)
- [ ] Clip-Dauer = `endSec - startSec` (Bottom-Up, nicht PCT-abhängig)
- [ ] Regression-Test: 20 bestehende Film-Projekte im PCT-Modus → Timeline identisch vor/nach T33
- [ ] Performance-Test: Ripple-Modus mit 500 Shots → < 200ms
- [ ] `npm run typecheck` und Shimwrappercheck laufen durch für PCT- UND Ripple-Modus
- [ ] Feature-Flag `VITE_ENABLE_FILM_RIPPLE` (optional, falls Risiko hoch) standardmäßig `false`

## Architekturskizze

```
BEFORE (PCT-Modus):
  Akt 1 (pct: 0-30%) → 0-1620s
    Seq 1 (pct: 0-50%) → 0-810s
      Szene 1 (pct: 0-40%) → 0-324s
        Shot 1 → Clip (start: 0, end: 100s) [muss in 324s passen]
        Shot 2 → Clip (start: 100, end: 324s)

AFTER (Ripple-Modus):
  Akt 1 (start: 0, end: 1800s) ← Bottom-Up: sum(sequences)
    Seq 1 (start: 0, end: 900s) ← Bottom-Up: sum(scenes)
      Szene 1 (start: 0, end: 400s) ← Bottom-Up: sum(shot clips)
        Shot 1 → Clip (start: 0, end: 150s) [frei trimmbar]
        Shot 2 → Clip (start: 150, end: 400s)
      Szene 2 (start: 400, end: 900s) ← folgt Szene 1
```

## Edge Cases

1. **Shot hat keine Clips**: Dauer = `shotlengthSeconds` (Plan) oder 3s Default. Kein Crash.
2. **Shot hat mehrere Clips**: Summe der Clip-Dauern = Shot-Dauer. Wenn Summe > Plan-Dauer: Ripple.
3. **PCT-Modus → Ripple-Modus → zurück zu PCT**: PCT-Werte sind erhalten (in `metadata`). Kein Datenverlust.
4. **Ripple-Modus, aber User will PCT-Trim**: Toggle-Button "Klassischer Modus" wechselt zurück.
5. **Film hat 1000+ Shots**: Performance-Test für Ripple. Ziel: < 200ms.
6. **Clip existiert, aber Shot wurde gelöscht**: Orphan-Clip. Garbage-Collection.

## SOLID / DRY / KISS

- **SRP**: `VideoEditorTimeline` rendert. `useRippleTimeline` berechnet. `usePctTimeline` berechnet (bestehend). Getrennte Hooks.
- **DRY**: `calculateRipple` wird mit Audio geteilt. Gleicher Algorithmus, unterschiedliche Clip-Typen.
- **KISS**: Kein Big-Bang. Dual-Modus ermöglicht schrittweise Migration. Kein Zwang.
- **OCP**: Neuer Modus = neuer Hook. Bestehende PCT-Logik unverändert.
- **Liskov**: `useRippleTimeline` und `usePctTimeline` implementieren gleiches `TimelineHook` Interface.

## Abhängigkeiten

- **Blocker**: T30 (Ripple-Engine) muss abgeschlossen sein.
- **Optional**: T28–T32 (Audio) sollten stabil sein, da Film-Refactoring von der Ripple-Engine abhängt.
- **Risiko**: Hohes Risiko durch 8500 Zeilen VideoEditorTimeline. Extensive Tests nötig.
- **Nachfolger**: Keine direkten Nachfolger. T33 schließt die Audio-Film-Vereinheitlichung ab.
