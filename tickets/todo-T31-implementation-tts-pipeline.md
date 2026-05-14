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

# T31 — TTS-Pipeline und Audio-Generierung

## Kontext

Nach T30 existiert ein funktionierendes Ripple-System. Wenn sich ein Clip ändert, aktualisiert sich die gesamte Timeline. T31 integriert die **TTS-Generierung** (Text-to-Speech) in diese Pipeline: Text + Emotion + TTS-Stimme → Audio-File → echter Waveform-Clip mit echter Dauer → Ripple durch alle Container.

## Problem

1. TTS existiert als separate Function (`scriptony-audio/tts.ts`), ist aber nicht mit dem Clip-System verbunden.
2. Nach TTS-Generierung gibt es keinen automatischen Mechanismus, der die Clip-Dauer aktualisiert.
3. Es gibt keine Waveform-Visualisierung für generierte Audio-Dateien.
4. Emotion aus dem Track (`ttsSettings.emotion`) wird nicht an den TTS-Provider weitergegeben.
5. Autor muss manuell zwischen Dropdown (Text) und externem Tool (TTS) wechseln.

## Lösung

### Schritt 1: TTS-Trigger aus Dropdown/Timeline

Frontend: "🎙️ Generieren" Button auf jedem Track/Clip.

```tsx
// AudioDropdown: Button pro Track
<Button onClick={() => generateTTS(track.id)}>
  {track.audioFileId ? "🔁 Neu generieren" : "🎙️ Generieren"}
</Button>

// AudioTimeline: Button auf Clip
<div className="clip-overlay">
  {!clip.audioFileId && <button>🎙️</button>}
</div>
```

### Schritt 2: TTS-Job-Erstellung

Frontend sendet an Backend:

```ts
POST /tts/generate
{
  trackId: string;
  text: string;
  voiceId: string;        // aus CharacterVoiceAssignment
  emotion?: string;       // aus track.ttsSettings.emotion
  speed?: number;         // aus track.ttsSettings.speed
  stability?: number;     // aus track.ttsSettings.stability
  style?: number;         // aus track.ttsSettings.style
}
```

Backend erstellt Job in `scriptony-jobs`:

```ts
const job = await createJob({
  type: "tts",
  projectId: track.projectId,
  trackId: track.id,
  status: "queued",
  payload: { text, voiceId, emotion, speed, stability, style },
});
```

### Schritt 3: TTS-Verarbeitung (Bestehende Function)

`scriptony-audio/tts.ts`:

1. Holt Job aus Queue.
2. Ruft TTS-Provider auf (OpenAI TTS, ElevenLabs, oder Google).
3. Speichert Audio-File in Appwrite Storage.
4. Berechnet `durationSec` aus Audio-Buffer-Länge / Sample-Rate.
5. Generiert `waveformData` (Amplitude-Peaks für Visualisierung).
6. Speichert beides zurück.

### Schritt 4: Post-TTS: Clip-Aktualisierung

Nach erfolgreicher TTS:

```ts
// In scriptony-audio oder scriptony-audio-story
const audioFileId = uploadResult.$id;
const durationSec = audioBuffer.length / audioBuffer.sampleRate;
const waveformData = extractWaveformPeaks(audioBuffer, 100); // 100 Samples

// Update AudioClip
await updateAudioClip(trackId, {
  audioFileId,
  endSec: clip.startSec + durationSec,
  waveformData,
});

// Trigger Ripple
const ripple = calculateRipple({
  changedClipId: clip.id,
  newEndSec: clip.startSec + durationSec,
  allClips,
  allScenes,
  allSequences,
  allActs,
});

await saveRipple(ripple);
```

### Schritt 5: Waveform-Visualisierung in Timeline

```tsx
// AudioTimelineSegment mit Waveform
function WaveformClip({ clip, pxPerSec }) {
  const width = (clip.endSec - clip.startSec) * pxPerSec;

  if (clip.waveformData) {
    return (
      <svg width={width} height={40}>
        {clip.waveformData.map((peak, i) => (
          <rect
            key={i}
            x={(i / clip.waveformData.length) * width}
            y={20 - peak * 20}
            width={width / clip.waveformData.length}
            height={peak * 40}
            fill="currentColor"
          />
        ))}
      </svg>
    );
  }

  // Fallback: dotted border für geschätzte Clips
  return <div className="dotted-border estimated-clip" />;
}
```

### Schritt 6: Job-Status-Tracking

Frontend polled Job-Status:

```ts
useEffect(() => {
  const interval = setInterval(async () => {
    const job = await getJobStatus(jobId);
    if (job.status === "completed") {
      queryClient.invalidateQueries({ queryKey: audioClipsKey });
      toast.success("TTS generiert!");
    } else if (job.status === "failed") {
      toast.error(`TTS fehlgeschlagen: ${job.error}`);
    }
  }, 2000);
  return () => clearInterval(interval);
}, [jobId]);
```

## User Journey

1. Autor schreibt Dialog in Dropdown: "Die Erde ist ein faszinierender Ort."
2. Autor setzt Emotion: "amüsiert", Charakter: "Pazuzu".
3. Timeline zeigt Clip mit WPM-Schätzung (4.4s, dotted border).
4. Autor klickt "🎙️ Generieren" auf dem Clip.
5. Button zeigt Spinner, Toast: "TTS wird generiert…"
6. Backend: Job queued → processing → completed.
7. Clip aktualisiert sich: echte Dauer 8.2s, Waveform sichtbar, Border solid.
8. Ripple: Nachfolgende Clips rutschen um +3.8s.
9. Autor hört Vorschau direkt im Timeline-Clip (Play-Button auf Clip).

## Akzeptanzkriterien

- [ ] "🎙️ Generieren" Button existiert auf jedem Track (Dropdown) und jedem Clip (Timeline)
- [ ] Button ist disabled wenn kein Text vorhanden oder kein Voice zugewiesen
- [ ] TTS-Job wird in `scriptony-jobs` erstellt mit korrekten Parametern (text, voiceId, emotion, speed, stability, style)
- [ ] Job-Payload enthält `clipId` für Ziel-Zuordnung
- [ ] `scriptony-audio/tts.ts` verarbeitet Job und liefert Audio-File + Dauer + Waveform
- [ ] TTS-Provider-Abstraktion existiert: `OpenAiTtsProvider`, `ElevenLabsTtsProvider` (gleiches Interface)
- [ ] `AudioClip` wird nach TTS mit `audioFileId`, `endSec = startSec + audioDuration`, `waveformData` aktualisiert
- [ ] Ripple wird **automatisch** nach TTS-Abschluss getriggert (kein manuelles Refresh)
- [ ] Timeline zeigt Waveform für generierte Clips (SVG-Rechtecke aus `waveformData`, max 200 Samples)
- [ ] Geschätzte Clips zeigen `dotted border` + `⏳` Badge + "Geschätzt: Xs" Tooltip
- [ ] Generierte Clips zeigen `solid border` + Waveform + Play-Button + "✅ Generiert: Xs" Tooltip
- [ ] Job-Status wird per Polling (2s Intervall) oder WebSocket an Frontend gepusht
- [ ] Bei TTS-Fehler: Clip behält WPM-Schätzung, Toast zeigt Fehler, Retry-Button (max 3 Retries)
- [ ] Bei TTS-Rate-Limit: Exponential Backoff (2s, 4s, 8s), dann Toast-Fehler
- [ ] Bei langem Text (>4096 Tokens): Text wird in Chunks gesplittet, Audio-Dateien werden concatenated
- [ ] TTS-Kosten-Tracking: Projekt-Setting `maxTtsMinutes`, Button disabled wenn Limit erreicht
- [ ] Feature-Flag `VITE_ENABLE_AUDIO_CLIP` ist auf Staging `true`, Prod `false`
- [ ] Keine Regression: Feature-Flag = false → altes Verhalten unverändert
- [ ] `npm run typecheck` und Shimwrappercheck laufen durch

## Architekturskizze

```
Frontend                    Backend                          TTS-Provider
   │                           │                                  │
   │  POST /tts/generate       │                                  │
   │ ────────────────────────> │                                  │
   │                           │  1. Create Job                   │
   │                           │  2. Queue Job                    │
   │                           │                                  │
   │  Poll Job Status          │  3. Process Job                  │
   │ <──────────────────────── │     → call OpenAI/ElevenLabs     │
   │                           │     → get AudioBuffer            │
   │                           │                                  │
   │                           │  4. Upload to Storage            │
   │                           │  5. Extract Duration             │
   │                           │  6. Generate Waveform            │
   │                           │                                  │
   │                           │  7. Update AudioClip            │
   │                           │     → audioFileId               │
   │                           │     → endSec = startSec + dur   │
   │                           │     → waveformData              │
   │                           │                                  │
   │                           │  8. Calculate Ripple            │
   │                           │     → cascade update            │
   │                           │                                  │
   │  Invalidate Query         │                                  │
   │ <──────────────────────── │                                  │
   │  Timeline re-renders      │                                  │
   │  with Waveform + Ripple   │                                  │
```

## Edge Cases

1. **TTS-Provider Rate-Limit**: Job wird mit Retry-Count (max 3) in Queue gehalten. Exponential Backoff.
2. **TTS für 5000 Wörter**: Provider hat Limit (z.B. 4096 Tokens). Text wird in Chunks gesplittet, mehrere Audio-Dateien generiert, dann concatenated.
3. **Charakter hat keine Voice zugewiesen**: Button zeigt "🔧 Voice zuweisen" und leitet zu Voice-Casting.
4. **TTS während Ripple**: Job-Status-Update triggert Ripple. Wenn User gleichzeitig manuell trimmt → Last-Write-Wins.
5. **Waveform-Generierung fehlschlägt**: Audio-File existiert, aber `waveformData = null`. Clip zeigt solid border ohne Waveform (Fallback).
6. **TTS-Kosten-Limit**: Projekt-Setting `maxTtsMinutes`. Wenn überschritten → Button disabled mit Tooltip "TTS-Limit erreicht".

## SOLID / DRY / KISS

- **SRP**: `scriptony-audio/tts.ts` macht nur TTS-Generierung. `scriptony-audio-story` macht nur Clip-Management. `scriptony-jobs` macht nur Queue-Verwaltung.
- **DRY**: Waveform-Extraktions-Logik wird zwischen TTS und Upload geteilt.
- **KISS**: Keine Echtzeit-TTS (Streaming). Batch-Job mit Polling ist einfacher und robuster.
- **OCP**: Neuer TTS-Provider (z.B. Google) erfordert nur neue Provider-Klasse. Keine Änderung am Job-System.
- **Dependency Inversion**: Frontend kennt nur `POST /tts/generate` und `GET /jobs/:id`. Interne TTS-Provider-Details sind gekapselt.

## Abhängigkeiten

- **Blocker**: T28 (AudioClip), T29 (WPM), T30 (Ripple) müssen abgeschlossen sein.
- **Parallel**: Kann mit bestehendem `scriptony-audio/tts.ts` entwickelt werden, da das nur erweitert wird.
- **Nachfolger**: T32 (DAW-Features) baut auf generierten Audio-Clips auf.
