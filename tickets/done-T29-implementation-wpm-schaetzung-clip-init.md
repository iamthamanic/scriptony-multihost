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

# T29 — WPM-Schätzung und Clip-Initialisierung

## Kontext

Nach T28 existiert `AudioClip` als separate Ist-Ebene, aber jeder neue Track hat initial **keinen Clip** oder einen Clip mit `endSec = startSec + 1s` (Default). Die Timeline zeigt also 1px breite Striche statt sinnvoller Platzhalter. T29 bringt die **WPM-Schätzung** (Words Per Minute), damit Tracks vor TTS-Generierung bereits eine realistische Breite in der Timeline haben.

## Problem

1. Neue Tracks erscheinen in der Timeline als 1s-Clips — zu klein für Text-Anzeige.
2. Autor kann nicht visuell einschätzen, wie lange ein Dialog dauern wird, bevor er TTS generiert.
3. Keine konsistente Formel zur Schätzung von Sprechdauer aus Text.
4. Clip-Initialisierung passiert nicht automatisch beim Track-Hinzufügen.

## Lösung

### Phase B: Dual-Write beginnt (T29)

T29 aktiviert **Feature-Flag auf Staging/Dev** (`VITE_ENABLE_AUDIO_CLIP=true`), aber produziert weiterhin `audio_clips` parallel zu `scene_audio_tracks`. Frontend zeigt WPM-Schätzung als **Info** (read-only), nicht als editierbares Feld.

### WPM-Schätzung (genaue Implementierung)

```ts
// src/lib/audio-utils.ts

export const WPM_DEFAULTS = {
  base: 150,
  languageModifiers: { de: 1.0, en: 1.07, es: 1.03 },
  emotionModifiers: {
    sachlich: 1.0,
    amüsiert: 1.1,
    aufgeregt: 1.2,
    wütend: 1.25,
    traurig: 0.85,
    ängstlich: 1.15,
    nachdenklich: 0.9,
    begeistert: 1.15,
  },
  typeDefaults: { dialog: 150, narrator: 140, sfx: 0, music: 0, atmo: 0 },
  minDurationSec: 1,
  maxDurationSec: 600,
} as const;

export function estimateDurationSec(
  text: string,
  options: {
    type?: "dialog" | "narrator" | "sfx" | "music" | "atmo";
    emotion?: string;
    language?: "de" | "en" | "es";
    wpmOverride?: number;
  } = {},
): number {
  const {
    type = "dialog",
    emotion = "sachlich",
    language = "de",
    wpmOverride,
  } = options;

  // SFX/Musik/Atmo haben keine Textbasis
  if (type === "sfx" || type === "music" || type === "atmo") {
    return type === "sfx" ? 3 : 60; // Default: SFX=3s, Music/Atmo=60s
  }

  const words = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  if (words === 0) return WPM_DEFAULTS.minDurationSec;

  const baseWpm =
    wpmOverride || WPM_DEFAULTS.typeDefaults[type] || WPM_DEFAULTS.base;
  const langModifier = WPM_DEFAULTS.languageModifiers[language] || 1.0;
  const emotionModifier = WPM_DEFAULTS.emotionModifiers[emotion] || 1.0;

  const effectiveWpm = baseWpm * langModifier * emotionModifier;
  const duration = (words / effectiveWpm) * 60;

  return Math.min(
    Math.max(duration, WPM_DEFAULTS.minDurationSec),
    WPM_DEFAULTS.maxDurationSec,
  );
}
```

### Auto-Clip-Erstellung mit Dual-Write

```ts
// Backend: functions/scriptony-audio-story/routes/tracks.ts
// Beim Track-Create: SCHREIBT in beide Collections

async function createTrack(req: RequestLike, res: ResponseLike): Promise<void> {
  // 1. Track erstellen (bestehende Logik, unverändert)
  const track = await createAudioTrackInDB(body);

  // 2. WPM-Schätzung berechnen
  const wpmEstimate = estimateDurationSec(track.content, {
    type: track.type,
    emotion: track.ttsSettings?.emotion,
  });

  // 3. Shadow-Clip erstellen (NEU in T29)
  const clip = await createAudioClipInDB({
    trackId: track.id,
    sceneId: track.sceneId,
    projectId: track.projectId,
    startSec: await getNextAvailableStartSec(track.sceneId), // siehe unten
    endSec: startSec + wpmEstimate,
    laneIndex: resolveLaneIndex(track.type, track.characterId),
    orderIndex: await getNextOrderIndex(track.sceneId),
  });

  // 4. Dual-Write: Track-Zeitfelder werden weiter aktualisiert (T29)
  await updateAudioTrackInDB(track.id, {
    startTime: clip.startSec,
    duration: wpmEstimate,
  });

  sendJson(res, 201, { track, clip });
}
```

```ts
// Frontend: src/hooks/useCreateAudioTrack.ts (modifiziert für Dual-Write)
export function useCreateAudioTrack(projectId: string, sceneId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (trackData: Partial<AudioTrack>) => {
      // Backend erstellt Track + Clip atomar
      const result = await AudioAPI.createTrack(sceneId, projectId, trackData);
      return result; // { track, clip }
    },
    onSuccess: (data) => {
      // Invalidiere BEIDE Queries
      qc.invalidateQueries({
        queryKey: queryKeys.audio.tracksByScene(sceneId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.audio.clipsByScene(sceneId) });
    },
  });
}
```

### Szene-Startzeit-Berechnung (für Clip-Positionierung)

```ts
// src/lib/timeline-position.ts

export async function getNextAvailableStartSec(
  sceneId: string,
  allClips: AudioClip[],
): Promise<number> {
  const sceneClips = allClips.filter((c) => c.sceneId === sceneId);
  if (sceneClips.length === 0) return 0;

  const lastClip = sceneClips.sort((a, b) => a.endSec - b.endSec)[
    sceneClips.length - 1
  ];
  return lastClip.endSec;
}

export async function getSceneAbsoluteStartSec(
  sceneId: string,
  allScenes: Scene[],
  allSequences: Sequence[],
  allActs: Act[],
): Promise<number> {
  const scene = allScenes.find((s) => s.id === sceneId);
  if (!scene) return 0;

  const sequence = allSequences.find((sq) => sq.id === scene.sequenceId);
  if (!sequence) return 0;

  const act = allActs.find((a) => a.id === sequence.actId);
  if (!act) return 0;

  // Kumulative Berechnung
  const prevActs = allActs
    .filter((a) => a.orderIndex < act.orderIndex)
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const actStartSec = prevActs.reduce(
    (sum, a) => sum + (a.durationSec || 300),
    0,
  );

  const prevSeqs = allSequences
    .filter((sq) => sq.actId === act.id && sq.orderIndex < sequence.orderIndex)
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const seqStartSec = prevSeqs.reduce(
    (sum, sq) => sum + (sq.durationSec || 300),
    0,
  );

  const prevScenes = allScenes
    .filter(
      (s) => s.sequenceId === sequence.id && s.orderIndex < scene.orderIndex,
    )
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const sceneStartSec = prevScenes.reduce(
    (sum, s) => sum + (s.durationSec || 300),
    0,
  );

  return actStartSec + seqStartSec + sceneStartSec;
}
```

### Visualisierung in Timeline (Feature-Flag = true)

```tsx
// src/components/audio/AudioTimelineSegment.tsx (T29)

function ClipSegment({
  clip,
  pxPerSec,
}: {
  clip: AudioClip;
  pxPerSec: number;
}) {
  const startPx = clip.startSec * pxPerSec;
  const widthPx = Math.max((clip.endSec - clip.startSec) * pxPerSec, 4);
  const isEstimated = !clip.audioFileId;

  return (
    <div
      className={cn(
        "timeline-clip",
        isEstimated ? "clip-estimated" : "clip-generated",
      )}
      style={{ left: `${startPx}px`, width: `${widthPx}px` }}
      title={`${isEstimated ? "⏳ Geschätzt" : "✅ Generiert"}: ${(clip.endSec - clip.startSec).toFixed(1)}s`}
    >
      <span className="clip-label">{clip.content || "…"}</span>
      {isEstimated && <span className="clip-badge">⏳</span>}
    </div>
  );
}
```

**CSS:**

```css
.clip-estimated {
  border: 2px dotted var(--muted);
  background: var(--bg);
  opacity: 0.7;
}
.clip-generated {
  border: 2px solid var(--accent);
  background: var(--accent-light);
}
```

### Visualisierung

Clip mit WPM-Schätzung zeigt in Timeline:

- Farbiger Block mit Text-Label
- Badge "⏳ Geschätzt" (ausgegraut)
- Keine Waveform (dotted border statt filled)

## User Journey

1. Autor tippt in Dropdown: "Die Erde ist ein faszinierender Ort." (12 Wörter)
2. Autor wählt Emotion: "amüsiert".
3. Backend berechnet: 12 Wörter / (150 _ 1.1) _ 60 = 4.36s.
4. Clip wird automatisch erstellt: startSec = 45s, endSec = 49.36s.
5. Timeline zeigt 4.36px breiten Block (bei 1px/s) mit Text und "⏳"-Badge.
6. Autor verschiebt anderen Track → Clip bleibt relativ zur Szene, rutscht absolut mit.

## Akzeptanzkriterien

- [ ] `estimateDurationSec()` existiert als Utility in `src/lib/audio-utils.ts` mit Unit-Tests
- [ ] `WPM_DEFAULTS` ist als konstantes Objekt definiert (inkl. Sprach- und Emotion-Modifier)
- [ ] `getNextAvailableStartSec()` und `getSceneAbsoluteStartSec()` existieren in `src/lib/timeline-position.ts`
- [ ] Beim Track-Create wird **automatisch ein Clip mit WPM-Schätzung erstellt** (Backend)
- [ ] Backend macht **Dual-Write** (Track-Zeitfelder + Clip werden beide aktualisiert)
- [ ] Frontend invalidiert **beide Queries** (tracksByScene + clipsByScene) nach Track-Create
- [ ] Timeline zeigt geschätzte Clips mit `⏳`-Badge und `dotted-border` (Feature-Flag = true)
- [ ] Timeline zeigt generierte Clips mit solid border + Play-Button (Feature-Flag = true)
- [ ] WPM-Wert ist im Projekt-Settings konfigurierbar (Default 150, Override möglich)
- [ ] Musik/Atmo/SFX haben manuelle Dauer-Eingabe (nicht WPM-basiert)
- [ ] Clip-Label zeigt Tooltip: "Geschätzt: 4.4s (12 Wörter, 165 WPM, amüsiert)"
- [ ] Feature-Flag `VITE_ENABLE_AUDIO_CLIP` ist auf Staging `true`, Prod `false`
- [ ] Keine Regression: Feature-Flag = false → altes Verhalten unverändert
- [ ] `npm run typecheck` und Shimwrappercheck laufen durch

## Architekturskizze

```
Track-Create Flow:
  1. User klickt "+ Track" in Dropdown
  2. Frontend: createAudioTrack({ content: "...", emotion: "amüsiert" })
  3. Backend:
     a. Insert Track in DB
     b. wpm = 150 * EMOTION_MODIFIERS["amüsiert"] = 165
     c. duration = estimateDurationSec("...", 165) = 4.36s
     d. startSec = getSceneStartSec(sceneId) + offsetInScene
     e. Insert AudioClip { trackId, startSec, endSec: startSec + 4.36s, laneIndex }
  4. Frontend: invalidateQueries → Timeline zeigt neuen Clip
```

## Edge Cases

1. **Leerer Text**: `estimateDurationSec` gibt 1s zurück (Minimum). Clip ist 1px breit mit "(leer)" Label.
2. **Sehr langer Text (500+ Wörter)**: Schätzung gibt 200s+. Clip ist sehr breit. Scrollbarkeit prüfen.
3. **TTS-Generierung liefert kürzeres Audio**: WPM-Schätzung war zu konservativ. Clip endSec wird aktualisiert. Ripple auf nachfolgende Clips.
4. **Track-Text wird nachträglich geändert**: WPM-Schätzung aktualisiert sich NICHT automatisch (verhindert ungewolltes Ripple). User muss "Neu schätzen" klicken oder TTS neu generieren.
5. **Mehrere Sprachen**: WPM 150 gilt für Deutsch. Englisch = 160, Spanisch = 155. Sprache aus Projekt-Settings lesen.

## SOLID / DRY / KISS

- **SRP**: `estimateDurationSec` macht nur Schätzung. `createClipFromTrack` macht nur Erstellung.
- **DRY**: WPM-Formel wird von Frontend (Preview) und Backend (Erstellung) geteilt. Utility in `src/lib/audio-utils.ts`.
- **KISS**: Keine komplexe NLP-Analyse für Pause-Erkennung. Einfache Wort/Min-Formel.
- **OCP**: Neue Emotion = neuer Eintrag in `EMOTION_WPM_MODIFIERS`. Keine Code-Änderung.

## Abhängigkeiten

- **Blocker**: T28 (AudioClip Fundament) muss abgeschlossen sein.
- **Nachfolger**: T30 (Ripple) baut auf den geschätzten Clips auf.
