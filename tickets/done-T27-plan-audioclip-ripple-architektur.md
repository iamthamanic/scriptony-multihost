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

- **Film/Serie**: PCT-basierte Hierarchie (`metadata.pct_from`/`pct_to`). `Clip` existiert als separates NLE-Objekt, ist aber sekundär zur Struktur. Kein Ripple-Effekt.
- **Audio/Hörspiel**: `AudioTrack` enthält `startTime`/`duration` direkt auf dem Plan-Objekt. Plan und Ist sind vermischt. Keine separate Clip-Ebene.

**T26 ist parallel at-work**: `AudioDropdown` CRUD (Struktur-Beats, Inline-Editing, Track-Hinzufügen). T27 darf T26 nicht blockieren oder invalidateieren.

## Problem

1. **AudioTrack ist Plan+Ist in einem Objekt**: `startTime`/`duration` sitzen auf dem Track. Änderungen im Text (Plan) beeinflussen direkt die Timeline (Ist).
2. **Kein Clip-System für Audio**: Es gibt keine `AudioClip`-Entität. TTS-Generierung hat keine Zielstruktur.
3. **Kein Ripple bei Film**: Wenn ein Shot länger wird, rutscht nichts automatisch nach. PCT-Prozente müssen manuell angepasst werden.
4. **Strukturänderungen synchronisieren sich nicht**: Verschieben einer Sequence im Dropdown erfordert manuelle Neuberechnung in der Timeline.
5. **T26 arbeitet parallel an AudioDropdown**: T27 muss T26 kompatibel halten.

## Lösung

### 1. Feature-Flag-Strategie (schrittweise Einführung)

**Kein Big-Bang.** Das neue System wird über ein Feature-Flag schrittweise eingeführt:

```ts
// src/lib/feature-flags.ts
export const FEATURE_FLAGS = {
  audioClipSystem: {
    enabled: import.meta.env.VITE_ENABLE_AUDIO_CLIP === "true" || false,
    rolloutPercentage: 0, // 0% = nur lokal/dev, 100% = alle Nutzer
  },
};
```

**Phasen:**
| Phase | Was passiert | Wer sieht es |
|-------|-------------|-------------|
| **P0** (T27) | Plan + Datenbank-Schema | Nur Dev/Reviewer |
| **P1** (T28) | Backend + Typen existieren, Frontend ignoriert noch | Dev |
| **P2** (T29) | AudioDropdown zeigt WPM-Schätzung als Info (nicht editierbar) | Dev + Staging |
| **P3** (T30) | Ripple aktiv, Timeline rendert AudioClip | Dev + Beta-User |
| **P4** (T31) | TTS-Pipeline integriert | Beta-User |
| **P5** (T32–T33) | DAW-Features + Film-Refactoring | Alle User |

### 2. Datenbank-Schema (genau)

#### NEU: `audio_clips` Collection

| Feld            | Typ       | Nullable | Default | Index      | Beschreibung                                   |
| --------------- | --------- | -------- | ------- | ---------- | ---------------------------------------------- |
| `id`            | UUID      | Nein     | auto    | PK         | Eindeutige ID                                  |
| `track_id`      | UUID      | Nein     | —       | FK + Index | Verweis auf `scene_audio_tracks`               |
| `scene_id`      | UUID      | Nein     | —       | Index      | Für schnellen Scene-Lookup                     |
| `project_id`    | UUID      | Nein     | —       | Index      | Für Projekt-Filter                             |
| `start_sec`     | Float     | Nein     | 0       | —          | Absolute Startzeit in Sekunden                 |
| `end_sec`       | Float     | Nein     | 1       | —          | Absolute Endzeit (≥ start_sec + 1)             |
| `lane_index`    | Int       | Nein     | 0       | Index      | 0–9 Dialog, 10–19 SFX, 20–29 Musik, 30–39 Atmo |
| `order_index`   | Int       | Nein     | 0       | —          | Reihenfolge innerhalb Lane                     |
| `audio_file_id` | String    | Ja       | null    | —          | Appwrite Storage File ID                       |
| `waveform_data` | JSON      | Ja       | null    | —          | Array von Floats (0–1), max 200 Samples        |
| `cross_scene`   | Bool      | Nein     | false   | —          | true = absolute Zeit, ignoriert Ripple         |
| `fx_preset_id`  | String    | Ja       | null    | —          | Reverb-Preset (später)                         |
| `created_at`    | Timestamp | Nein     | now     | —          | Erstellzeit                                    |
| `updated_at`    | Timestamp | Nein     | now     | —          | Aktualisierungszeit                            |

**Constraints:**

- `CHECK (end_sec >= start_sec + 1)` — Mindestens 1 Sekunde
- `CHECK (lane_index >= 0 AND lane_index <= 99)` — Gültige Lane-Range
- `UNIQUE (track_id)` — Ein Track hat max. einen Clip (T28–T30)

#### ANPASSUNG: `scene_audio_tracks` (bestehende Collection)

**Keine Schema-Änderung in T27/T28.** `start_time` und `duration` bleiben zunächst erhalten als **Legacy-Felder**. Sie werden erst in T30 auf null gesetzt, wenn der Clip-Ripple stabil läuft.

| Feld            | Status in T28                        | Status in T30               |
| --------------- | ------------------------------------ | --------------------------- |
| `start_time`    | Erhalten (Rückwärtskompatibel)       | Nullable                    |
| `duration`      | Erhalten (Rückwärtskompatibel)       | Nullable                    |
| `content`       | Erhalten                             | Erhalten                    |
| `tts_settings`  | Erhalten                             | Erhalten                    |
| `audio_file_id` | Erhalten → DUPLIKAT in `audio_clips` | Entfernt (nur noch in Clip) |

### 3. Typ-System (genau)

```ts
// src/lib/types/index.ts

// ── AudioTrack (Plan-rein, keine Zeit) ──
export interface AudioTrack {
  id: string;
  sceneId: string;
  projectId: string;
  type: AudioTrackType; // "dialog" | "narrator" | "music" | "sfx" | "atmo"
  content?: string; // Der Text (Dialog/Erzähler) oder Label (SFX/Musik)
  characterId?: string; // Nur für Dialog

  // TTS-Konfiguration (Plan)
  ttsVoiceId?: string;
  ttsSettings?: {
    emotion?: string; // "sachlich" | "amüsiert" | "aufgeregt" | ...
    stability?: number; // 0–1
    style?: number; // 0–1
    speed?: number; // 0.5–2.0
  };

  // LEGACY (bleibt erhalten bis T30, dann deprecated)
  /** @deprecated Wird durch AudioClip ersetzt. Nicht für neue Code verwenden. */
  startTime?: number;
  /** @deprecated Wird durch AudioClip ersetzt. Nicht für neue Code verwenden. */
  duration?: number;
  /** @deprecated Wird durch AudioClip.audioFileId ersetzt. */
  audioFileId?: string;

  createdAt: string;
  updatedAt: string;
}

// ── AudioClip (Ist, Zeit + Audio) ──
export interface AudioClip {
  id: string;
  trackId: string; // FK zu AudioTrack
  sceneId: string; // Denormalisiert für schnelle Queries
  projectId: string; // Denormalisiert für schnelle Queries
  startSec: number; // Absolute Zeit auf Projekt-Timeline
  endSec: number; // startSec + duration
  laneIndex: number; // Lane-Zuweisung
  orderIndex: number; // Sortierung innerhalb Lane
  audioFileId?: string; // Referenz zu Appwrite Storage
  waveformData?: number[]; // Amplitude-Peaks für Visualisierung
  crossScene?: boolean; // false = an Szene gebunden, true = absolut
  fxPresetId?: string; // Optional: Reverb-Preset
  createdAt: string;
  updatedAt: string;
}

// ── Gemeinsames Clip-Interface (Audio + Film) ──
export interface BaseClip {
  id: string;
  startSec: number;
  endSec: number;
  laneIndex: number;
}

// ── Lane-Schema ──
export const LANE_SCHEMA = {
  dialog: { base: 0, max: 9, label: "Dialog", icon: "Mic" },
  sfx: { base: 10, max: 19, label: "SFX", icon: "Volume2" },
  music: { base: 20, max: 29, label: "Musik", icon: "Music" },
  atmo: { base: 30, max: 39, label: "Atmo", icon: "Wind" },
  narrator: { base: 40, max: 49, label: "Erzähler", icon: "BookOpen" },
  global: { base: 90, max: 99, label: "Global", icon: "Globe" },
} as const;

// ── WPM-Schätzungskonfiguration ──
export const WPM_DEFAULTS = {
  base: 150, // Wörter pro Minute
  languageModifiers: {
    de: 1.0,
    en: 1.07, // Englisch ist etwas schneller
    es: 1.03,
  },
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
  typeDefaults: {
    dialog: 150,
    narrator: 140,
    sfx: 0, // Kein Text = keine WPM, manuelle Eingabe
    music: 0,
    atmo: 0,
  },
  minDurationSec: 1, // Mindestens 1 Sekunde
  maxDurationSec: 600, // Maximal 10 Minuten (Safety)
} as const;
```

### 4. API-Verträge (Request/Response)

#### `GET /clips` — Liste aller Clips einer Szene

**Request:**

```http
GET /clips?sceneId=<uuid>
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "clips": [
    {
      "id": "clip-uuid-1",
      "trackId": "track-uuid-1",
      "sceneId": "scene-uuid-1",
      "projectId": "proj-uuid-1",
      "startSec": 45.0,
      "endSec": 49.36,
      "laneIndex": 0,
      "orderIndex": 0,
      "audioFileId": null,
      "waveformData": null,
      "crossScene": false,
      "fxPresetId": null,
      "createdAt": "2026-05-13T10:00:00Z",
      "updatedAt": "2026-05-13T10:00:00Z"
    }
  ],
  "sceneStartSec": 45.0,
  "sceneEndSec": 120.0
}
```

#### `POST /clips` — Clip erstellen

**Request:**

```http
POST /clips
Authorization: Bearer <token>
Content-Type: application/json

{
  "trackId": "track-uuid-1",
  "sceneId": "scene-uuid-1",
  "projectId": "proj-uuid-1",
  "startSec": 45.0,
  "endSec": 49.36,
  "laneIndex": 0,
  "orderIndex": 0
}
```

**Response 201:**

```json
{
  "clip": {
    "id": "new-clip-uuid",
    "trackId": "track-uuid-1",
    ...
  }
}
```

**Validierung:**

- `trackId` muss existieren
- `sceneId` muss zum Track passen
- `endSec >= startSec + 1`
- `laneIndex` in 0–99

#### `PUT /clips/:id` — Clip aktualisieren (inkl. Ripple)

**Request:**

```http
PUT /clips/clip-uuid-1
Authorization: Bearer <token>
Content-Type: application/json

{
  "endSec": 85.0,
  "audioFileId": "storage-file-id-123",
  "waveformData": [0.1, 0.5, 0.9, ...]
}
```

**Response 200:**

```json
{
  "clip": { ...updated... },
  "ripple": {
    "affectedClips": 3,
    "affectedScenes": 2,
    "affectedSequences": 1,
    "newProjectDurationSec": 185.0
  }
}
```

#### `DELETE /clips/:id` — Clip löschen

**Request:**

```http
DELETE /clips/clip-uuid-1
Authorization: Bearer <token>
```

**Response 200:**

```json
{ "deleted": true, "ripple": { ... } }
```

### 5. Migrationsstrategie (Audio: schrittweise)

#### Phase A: T28 — "Shadow Clips" (kein Breaking Change)

```
BESTEHEND (läuft weiter):
  scene_audio_tracks: { id, start_time, duration, content, ... }
     ↓
  AudioDropdown liest start_time/duration
  AudioTimeline liest start_time/duration

NEU (parallel, Feature-Flag aus):
  audio_clips: { id, track_id, start_sec, end_sec, ... }
     ↓
  Niemand liest dies noch
```

**Aktionen:**

1. `audio_clips` Collection wird angelegt.
2. Kein Frontend-Code liest `audio_clips` noch.
3. Backend-Route `/clips` existiert, aber ist ungenutzt.
4. `AudioTrack` Typ in `index.ts` bekommt `AudioClip`-Felder als optional/deprecated markiert.

#### Phase B: T29 — "WPM-Dual-Write"

```
AudioDropdown (neu):
  - Zeigt Track-Text + Emotion + Charakter
  - Zeigt geschätzte Dauer als INFO (read-only, aus audio_clips oder WPM)
  - Bearbeitet NUR Track-Text/Emotion/Charakter

AudioTimeline (alt + neu parallel):
  - Feature-Flag VITE_ENABLE_AUDIO_CLIP = false:
    → Rendert AudioTrack.start_time/duration (alt)
  - Feature-Flag VITE_ENABLE_AUDIO_CLIP = true:
    → Rendert AudioClip.start_sec/end_sec (neu)

Backend:
  - Beim Track-Create: SCHREIBT in scene_audio_tracks UND audio_clips
  - Beim Track-Update: SCHREIBT in beide Collections
```

**Aktionen:**

1. Migrationsskript erstellt für jeden bestehenden Track einen Shadow-Clip:
   ```ts
   // Migration: T28 → T29
   for (const track of existingTracks) {
     await createAudioClip({
       trackId: track.id,
       sceneId: track.scene_id,
       projectId: track.project_id,
       startSec: track.start_time || 0,
       endSec: (track.start_time || 0) + (track.duration || 3),
       laneIndex: resolveLaneIndex(track.type, track.character_id),
       orderIndex: track.order_index || 0,
       audioFileId: track.audio_file_id, // Duplikat!
     });
   }
   ```
2. Frontend-Code liest **nur** `audio_clips` wenn Feature-Flag an.
3. Backend macht **Dual-Write** (beide Collections aktualisieren).

#### Phase C: T30 — "Ripple aktiv, Legacy aus"

```
AudioDropdown:
  - Zeigt KEINE Zeiten mehr (nur Plan)
  - Track-Reihenfolge ändern → triggert Ripple-API

AudioTimeline:
  - Rendert NUR AudioClip (kein Fallback auf Track-Zeit)
  - Ripple-Algorithmus aktiv

Backend:
  - STOPP Dual-Write. Nur noch audio_clips wird geschrieben.
  - scene_audio_tracks.start_time/duration werden ignoriert (nicht gelöscht).
```

**Aktionen:**

1. `scene_audio_tracks.start_time` und `duration` als `@deprecated` markieren.
2. `AudioTrack` Typ: `startTime`/`duration` als optional + JSDoc `@deprecated`.
3. Kein Frontend-Code verwendet diese Felder mehr.
4. Garbage-Collection-Job prüft auf verwaiste Clips.

#### Phase D: T33+ — "Cleanup"

```
- scene_audio_tracks.start_time/duration werden physisch entfernt (Migration)
- audio_clips.audio_file_id ist Single Source of Truth
- Feature-Flag wird entfernt (immer aktiv)
```

### 6. Migrationsstrategie (Film: Dual-Modus)

Film hat **keinen** schrittweisen Rollout. Stattdessen: **Projekt-Setting** pro Film.

```ts
// project_settings Collection (neues Feld)
interface ProjectSettings {
  projectId: string;
  timelineMode: "pct" | "ripple"; // Default: "pct" für bestehende, "ripple" für neue
}
```

**Bestehende Film-Projekte:**

- Bleiben auf `timelineMode: "pct"`.
- PCT-Werte in `metadata.pct_from`/`pct_to` bleiben erhalten.
- Keine automatische Migration.
- Optional: "Migrieren"-Button in Projekt-Settings (manuell).

**Neue Film-Projekte:**

- Starten auf `timelineMode: "ripple"`.
- Keine PCT-Felder in metadata.
- Shot-Dauer = Clip-Dauer Bottom-Up.

**Migration PCT → Ripple (manuell):**

```ts
function migrateFilmProjectToRipple(projectId: string) {
  const duration = getProjectDuration(projectId); // z.B. 5400s (90min)
  const acts = getActs(projectId);

  for (const act of acts) {
    const pctFrom = act.metadata?.pct_from ?? 0;
    const pctTo = act.metadata?.pct_to ?? 100;
    act.startSec = (pctFrom / 100) * duration;
    act.endSec = (pctTo / 100) * duration;
  }

  // Same for sequences, scenes...
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

### 7. Kompatibilitätslayer während Transition

```tsx
// src/components/audio/AudioTimeline.tsx (während T28–T30)

function AudioTimeline({ projectId, projectType }) {
  const useNewSystem = FEATURE_FLAGS.audioClipSystem.enabled;

  if (useNewSystem) {
    // NEU: Liest AudioClip
    const { data: clips } = useAudioClips(projectId);
    return <NewAudioTimeline clips={clips} />;
  } else {
    // ALT: Liest AudioTrack (bestehend, unverändert)
    const { data: tracks } = useAudioTimeline(projectId);
    return <LegacyAudioTimeline tracks={tracks} />;
  }
}
```

```tsx
// src/components/audio/AudioDropdown.tsx (während T28–T30)

function AudioDropdown({ projectId }) {
  const useNewSystem = FEATURE_FLAGS.audioClipSystem.enabled;

  // Plan-Teil ist identisch (Text/Emotion/Charakter)
  // Zeit-Teil ist bedingt:

  return (
    <div>
      {tracks.map((track) => (
        <TrackCard key={track.id}>
          <TextEditor value={track.content} />
          <EmotionSelect value={track.ttsSettings?.emotion} />
          <CharacterSelect value={track.characterId} />

          {useNewSystem && (
            <InfoBadge>
              {clip ? `⏳ ${clip.endSec - clip.startSec}s` : "Nicht generiert"}
            </InfoBadge>
          )}

          {!useNewSystem && (
            <LegacyTimeDisplay>
              {" "}
              {/* Unverändert */}
              {track.startTime}s – {track.duration}s
            </LegacyTimeDisplay>
          )}
        </TrackCard>
      ))}
    </div>
  );
}
```

### 8. T26-Abhängigkeiten (parallel at-work)

**T26** arbeitet an:

- `AudioDropdown` CRUD (Inline-Editing, Track-Hinzufügen, Track-Typ-Select)
- `useHierarchyCRUD` Hook
- `projectTypeRegistry` Integration

**T27-Kompatibilität:**

- T26 darf `AudioTrack.startTime`/`duration` weiter verwenden (Legacy-Modus).
- T26 darf KEINE neuen Felder in `scene_audio_tracks` einführen, die T27/T28 konflikten.
- T26s `useCreateAudioTrack` muss in T29 erweitert werden um **Dual-Write** (Track + Clip).
- **Merge-Strategie**: T26 merged zuerst. T28 rebased auf T26 und fügt Clip-Erstellung zum Track-Create hinzu.

### 9. Rollback-Strategie

| Phase              | Rollback                                                            | Wie                                                 |
| ------------------ | ------------------------------------------------------------------- | --------------------------------------------------- |
| T28 (Shadow Clips) | Feature-Flag auf `false`                                            | `VITE_ENABLE_AUDIO_CLIP=false`                      |
| T29 (Dual-Write)   | Stoppe Dual-Write, lösche `audio_clips`                             | SQL: `DELETE FROM audio_clips WHERE project_id = X` |
| T30 (Ripple aktiv) | Setze `timelineMode = "pct"` für Film. Audio: Feature-Flag `false`. | Projekt-Settings Update                             |
| T31+ (TTS/DAW)     | Kein einfacher Rollback. Backup vor Migration nötig.                | `pg_dump` oder Appwrite-Backup                      |

**Notfall-Rollback (T28–T30):**

```bash
# 1. Feature-Flag ausschalten
export VITE_ENABLE_AUDIO_CLIP=false

# 2. Lösche Shadow-Clips (optional, nicht nötig für Funktionalität)
# Appwrite Console → Database → audio_clips → Empty Collection

# 3. Frontend zeigt wieder AudioTrack.start_time/duration
# Kein Code-Change nötig!
```

### 10. Test-Strategie

| Test-Typ        | Was                                                          | Wann    |
| --------------- | ------------------------------------------------------------ | ------- |
| **Unit**        | `estimateDurationSec`, `calculateRipple`, `resolveLaneIndex` | T28–T30 |
| **Integration** | Track-Create → Clip-Create → Ripple → Timeline-Update        | T30     |
| **E2E**         | Autor erstellt Track → sieht Clip in Timeline → TTS → Ripple | T31     |
| **Migration**   | Bestehende Tracks → Shadow-Clips → Zeiten identisch?         | T29     |
| **Regression**  | Film-Projekt im PCT-Modus: unveränderte Funktionalität       | T33     |
| **Performance** | Ripple mit 1000 Clips < 200ms                                | T30     |

**Test-Daten:**

```ts
// Mock-Projekt für Tests
const mockAudioProject = {
  acts: [{ id: "act-1", orderIndex: 0 }],
  sequences: [{ id: "seq-1", actId: "act-1", orderIndex: 0 }],
  scenes: [{ id: "scene-1", sequenceId: "seq-1", orderIndex: 0 }],
  tracks: [
    {
      id: "track-1",
      sceneId: "scene-1",
      type: "dialog",
      content: "Hallo Welt",
      characterId: "char-1",
    },
    { id: "track-2", sceneId: "scene-1", type: "sfx", content: "Zug bremst" },
  ],
};
```

## User Journey

### Szenario 1: Autor plant Hörspiel (P0–P3)

1. Autor öffnet Audio-Projekt, geht in Dropdown-Ansicht.
2. Fügt Szene 1 → Track "Dialog Pazuzu" mit Text hinzu.
3. Setzt Emotion auf "amüsiert", ordnet Charakter zu.
4. Wechselt zu Timeline-Ansicht.
5. **P0–P2 (Legacy-Modus)**: Track erscheint mit `startTime`/`duration` (alt).
6. **P3+ (Ripple-Modus)**: Track erscheint als Clip mit WPM-Schätzung (4.4s) auf Pazuzu-Lane.
7. Autor kann Clip verschieben/trimmen. Ripple aktualisiert nachfolgende Elemente.

### Szenario 2: TTS-Generierung verlängert Szene (P4)

1. Autor klickt "🎙️ Generieren" auf Track.
2. TTS liefert Audio-File mit 8.2s statt geschätzter 4.4s.
3. Clip.endSec aktualisiert sich auf 8.2s (+3.8s Delta).
4. Ripple: Szene 1.endSec += 3.8s → Sequence 1.endSec += 3.8s → Akt 1.endSec += 3.8s → Szene 2 startet um 3.8s später.
5. Timeline zeigt Ripple-Animation (alles ab Szene 2 rutscht sanft nach rechts).

### Szenario 3: Film-Autor im Dual-Modus

1. Autor öffnet altes Film-Projekt (timelineMode: "pct").
2. Timeline zeigt PCT-basierte Shot-Blöcke (unverändert).
3. Autor öffnet neues Film-Projekt (timelineMode: "ripple").
4. Timeline zeigt Clip-basierte Shot-Blöcke mit Ripple-Verhalten.
5. Trimmen eines Shots triggert Ripple durch Szenen/Sequences/Acts.

## Akzeptanzkriterien

- [ ] `audio_clips` Collection ist in Appwrite/Hasura angelegt mit allen Feldern, Indexen, Constraints
- [ ] `AudioClip` Type ist in `src/lib/types/index.ts` definiert
- [ ] `AudioTrack` hat `startTime`/`duration` als `@deprecated` markiert (JSDoc + optional)
- [ ] `BaseClip` Interface existiert als gemeinsames Contract für Audio + Film
- [ ] `LANE_SCHEMA` und `WPM_DEFAULTS` sind als konstante Objekte definiert
- [ ] API-Routen (`GET/POST/PUT/DELETE /clips`) sind dokumentiert mit Request/Response-Beispielen
- [ ] Feature-Flag `VITE_ENABLE_AUDIO_CLIP` ist definiert
- [ ] Migrationsplan (Phase A–D) ist dokumentiert
- [ ] Dual-Write-Strategie (T29) ist beschrieben
- [ ] Film-Dual-Modus (`timelineMode: "pct" | "ripple"`) ist spezifiziert
- [ ] Rollback-Strategie für jede Phase ist dokumentiert
- [ ] T26-Kompatibilität ist geklärt (keine Blocker, Merge-Reihenfolge)
- [ ] Test-Strategie mit Mock-Daten ist definiert
- [ ] Keine Breaking Changes ohne dokumentierte Migration

## Architekturskizze

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PHASE A–B: DUAL-MODE (T28–T29)                     │
│                                                                         │
│  AudioDropdown (T26/T27 unverändert)      AudioTimeline                 │
│       │                                        │                        │
│       │ Feature-Flag = false                     │ Feature-Flag = false   │
│       ▼                                        ▼                        │
│  scene_audio_tracks {                    scene_audio_tracks {           │
│    start_time, duration                    start_time, duration           │
│  }                                         }                            │
│       ▲                                        ▲                        │
│       │ Dual-Write                             │ Dual-Write             │
│       │ (Backend schreibt beide)               │ (Backend schreibt)     │
│       │                                        │                        │
│  audio_clips {                            audio_clips {                  │
│    start_sec, end_sec                     start_sec, end_sec            │
│  }                                         }                            │
│       ▲                                        ▲                        │
│       │ Niemand liest noch                       │ Niemand liest noch     │
│       │ (nur Dev/Test)                          │ (nur Dev/Test)         │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                        PHASE C: RIPPLE AKTIV (T30+)                     │
│                                                                         │
│  AudioDropdown (keine Zeiten mehr)         AudioTimeline                │
│       │                                        │                        │
│       │ Plan-rein (Text/Emotion)               │ Ist-rein (Clips)        │
│       ▼                                        ▼                        │
│  scene_audio_tracks {                    audio_clips {                  │
│    content, ttsSettings    ───1:N───>    start_sec, end_sec           │
│    [start_time: deprecated]              laneIndex, waveformData        │
│  }                                         }                            │
│       │                                        │                        │
│       │ Track-Create → Auto-Clip-Erstellung    │ Clip-Update → Ripple     │
│       │                                        │ → Cascade Update       │
└─────────────────────────────────────────────────────────────────────────┘
```

## Edge Cases (präzisiert)

1. **Clip wird kürzer als Schätzung (negative Ripple):**
   - Nachfolgende Clips rutschen nach links.
   - Schutz: `startSec` darf nicht < `sceneStartSec` werden.
   - Wenn Konflikt: Clip wird auf `minDurationSec = 1` gekürzt. Toast: "Kürzung begrenzt — andere Clips blockieren."

2. **Zwei Clips überlappen sich in derselben Lane:**
   - Erlaubt. Visuell: Opacity 0.7 auf überlappendem Bereich.
   - Playback: Beide Clips werden gemischt (spätere Phase).

3. **Szene hat keine Clips:**
   - Szene-Dauer = 0s.
   - Timeline: Szene-Header als 1px Marker + "(leer)" Tooltip.
   - Dropdown: Szene zeigt "+ Track hinzufügen" Prominent.

4. **Cross-Scene-Musik startet vor Szene 1 (negative Zeit):**
   - `absoluteStartSec = -5` ist erlaubt.
   - Timeline-Ruler beginnt bei `min(all absoluteStartSec)` (z.B. -5).
   - Szene 1 startet bei t=0. Musik läuft von t=-5 bis t=295.

5. **TTS-Generierung fehlschlägt:**
   - Clip behält WPM-Schätzung.
   - Toast: "TTS fehlgeschlagen: [Fehlermeldung]"
   - Retry-Button erscheint auf Clip.
   - Max 3 Retries, dann "Manuell aufnehmen"-Option.

6. **Track wird gelöscht, aber Clip hat Audio-File:**
   - Clip wird als "verwaist" markiert (`orphan: true`, `orphanedAt: now()`).
   - Garbage-Collection-Job (täglich) löscht verwaiste Clips > 30 Tage.
   - Audio-File in Storage bleibt erhalten (separater Cleanup).

7. **Film-Projekt mit bestehenden PCT-Daten:**
   - PCT-Werte in `metadata.pct_from`/`pct_to` bleiben unverändert.
   - Keine automatische Migration.
   - Optionaler "Migrieren"-Button in Projekt-Settings.

8. **Dual-Write-Race-Condition (T29):**
   - User A ändert Track-Zeit → Backend schreibt in beide Collections.
   - User B ändert gleichzeitig Clip-Zeit → Last-Write-Wins.
   - Timestamp + Optimistic Locking: `updated_at` prüfen, Konflikt melden.

9. **Feature-Flag-Wechsel während Session:**
   - User schaltet Feature-Flag an.
   - Frontend invalidiert Queries → lädt neue Daten.
   - Kein Page-Reload nötig.

10. **Performance: 10.000 Clips in einem Projekt:**
    - Ripple-Algorithmus ist O(n) für betroffene Szenen.
    - Ziel: < 500ms für 10.000 Clips.
    - Falls langsamer: Pagination oder virtuelle Ripple (nur sichtbarer Bereich).

## SOLID / DRY / KISS

- **Single Responsibility**: `AudioTrack` = Plan (Text/Emotion). `AudioClip` = Ist (Zeit/Audio). `RippleEngine` = Berechnung. `TimelineRenderer` = Visualisierung. **KEINE Vermischung.**
- **Open/Closed**: Neue Track-Typen = neuer Lane-Index-Range. Kein Ripple-Code-Change. Neue Emotion = neuer WPM-Modifier.
- **Liskov Substitution**: `AudioClip` und `FilmClip` implementieren `BaseClip`. `LegacyAudioTimeline` und `NewAudioTimeline` implementieren `AudioTimelineInterface`.
- **Interface Segregation**: Plan-Elemente haben keinen Zeit-Interface. Nur Clips haben Zeit. Dropdown-Props ≠ Timeline-Props.
- **Dependency Inversion**: Timeline rendert `Clip[]` (Abstraktion), nicht `Track[]` (Konkretion).
- **DRY**: Ripple-Algorithmus geteilt zwischen Audio und Film. WPM-Formel geteilt zwischen Frontend (Preview) und Backend (Erstellung). Dual-Write-Logik in einem Service zentralisiert.
- **KISS**: Keine PCT-Prozente für Audio. Keine doppelte Zeit-Ebene. Kein Big-Bang (Feature-Flag). Ein Track = Ein Clip in Phase 1–3 (keine Multi-Clip-Komplexität vor T32).

## Abhängigkeiten

- **T26 (parallel)**: AudioDropdown CRUD. T27 definiert Datenmodell, T28 implementiert es. T26 kann parallel laufen, aber T28 muss T26 rebasen und Dual-Write hinzufügen.
- **T27 → T28**: T27 muss abgeschlossen sein (Architektur-Review) bevor T28 startet.
- **Keine externen Blocker**: Keine neue Appwrite-Version nötig. Kein neues Node-Modul. Hasura/Appwrite unterstützen alle benötigten Features.
- **Riskante Abhängigkeit**: `scriptony-audio/tts.ts` (bestehend) muss in T31 erweitert werden. Kein Breaking Change.
