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

# T28 — AudioClip Fundament: Typ, Collection, Backend, Frontend-Umstellung

## Kontext

T27 hat das Zielmodell definiert: `AudioTrack` wird Plan-rein (keine Zeit-Felder), `AudioClip` wird als separate Ist-Ebene eingeführt. T28 implementiert dieses Fundament. Das ist der kritische Pfad für alle nachfolgenden Audio-Tickets.

## Problem

1. `AudioTrack` in `src/lib/types/index.ts` hat `startTime: number` und `duration: number`. Das vermischt Plan und Ist.
2. Es gibt keine `AudioClip`-Entität weder im Typ-System noch in der Datenbank noch im Backend.
3. `AudioDropdown.tsx` zeigt `track.startTime`/`duration` an — das wird im Plan-Kontext verwirrend.
4. `AudioTimeline.tsx` rendert direkt `AudioTrack` — es gibt keine Clip-Zwischenschicht.
5. `AudioTimelineSegment.tsx` berechnet `startPx = track.startTime * pxPerSec` — direkte Track-Zeit statt Clip-Zeit.

## Lösung

### Schritt 1: Typ-System (`src/lib/types/index.ts`)

```ts
// NEU: AudioClip
export interface AudioClip {
  id: string;
  trackId: string; // ← Referenz zum AudioTrack
  sceneId: string;
  projectId: string;
  startSec: number;
  endSec: number;
  laneIndex: number; // 0-9 Dialog, 10-19 SFX, 20-29 Musik, 30-39 Atmo
  orderIndex: number;
  audioFileId?: string;
  waveformData?: number[];
  createdAt: string;
  updatedAt: string;
}

// ANPASSUNG: AudioTrack (entfernt Zeit, behält Schätzung als Fallback)
export interface AudioTrack {
  id: string;
  sceneId: string;
  projectId: string;
  type: AudioTrackType;
  content?: string;
  characterId?: string;
  // REMOVED: startTime, duration
  ttsVoiceId?: string;
  ttsSettings?: {
    emotion?: string;
    stability?: number;
    style?: number;
    speed?: number;
  };
  createdAt: string;
  updatedAt: string;
}
```

### Schritt 2: Datenbank-Collection (`audio_clips`)

**Felder und Constraints** (aus T27, identisch):

| Feld            | Typ       | Nullable | Default | Index      | Beschreibung                           |
| --------------- | --------- | -------- | ------- | ---------- | -------------------------------------- |
| `id`            | UUID      | Nein     | auto    | PK         | Eindeutige ID                          |
| `track_id`      | UUID      | Nein     | —       | FK + Index | Verweis auf `scene_audio_tracks`       |
| `scene_id`      | UUID      | Nein     | —       | Index      | Für schnellen Scene-Lookup             |
| `project_id`    | UUID      | Nein     | —       | Index      | Für Projekt-Filter                     |
| `start_sec`     | Float     | Nein     | 0       | —          | Absolute Startzeit                     |
| `end_sec`       | Float     | Nein     | 1       | —          | ≥ start_sec + 1                        |
| `lane_index`    | Int       | Nein     | 0       | Index      | 0–99 per LANE_SCHEMA                   |
| `order_index`   | Int       | Nein     | 0       | —          | Sortierung innerhalb Lane              |
| `audio_file_id` | String    | Ja       | null    | —          | Appwrite Storage File ID               |
| `waveform_data` | JSON      | Ja       | null    | —          | Array von Floats, max 200 Samples      |
| `cross_scene`   | Bool      | Nein     | false   | —          | true = absolute Zeit, ignoriert Ripple |
| `fx_preset_id`  | String    | Ja       | null    | —          | Reverb-Preset (später)                 |
| `created_at`    | Timestamp | Nein     | now     | —          | Erstellzeit                            |
| `updated_at`    | Timestamp | Nein     | now     | —          | Aktualisierungszeit                    |

**Constraints:**

```sql
CHECK (end_sec >= start_sec + 1)
CHECK (lane_index >= 0 AND lane_index <= 99)
UNIQUE (track_id)  -- Ein Track hat max. einen Clip in T28–T30
```

**Indexe:**

- `track_id` (B-Tree, für 1:1 Lookup)
- `scene_id` (B-Tree, für Scene-Filter)
- `project_id` (B-Tree, für Projekt-Scope)
- `lane_index` (B-Tree, für Lane-Sortierung)
- Composite: `(scene_id, lane_index, order_index)` für schnelle Lane-Queries

### Schritt 3: Backend-API (`functions/scriptony-audio-story/routes/clips.ts`)

**GraphQL Queries:**

```graphql
query GetAudioClips($sceneId: uuid!) {
  audio_clips(
    where: { scene_id: { _eq: $sceneId } }
    order_by: [{ lane_index: asc }, { order_index: asc }]
  ) {
    id
    track_id
    scene_id
    project_id
    start_sec
    end_sec
    lane_index
    order_index
    audio_file_id
    waveform_data
    cross_scene
    fx_preset_id
    created_at
    updated_at
  }
}
```

**GraphQL Mutation (Create):**

```graphql
mutation CreateAudioClip($object: audio_clips_insert_input!) {
  insert_audio_clips_one(object: $object) {
    id
    track_id
    start_sec
    end_sec
    lane_index
  }
}
```

**GraphQL Mutation (Update):**

```graphql
mutation UpdateAudioClip($id: uuid!, $set: audio_clips_set_input!) {
  update_audio_clips_by_pk(pk_columns: { id: $id }, _set: $set) {
    id
    start_sec
    end_sec
    updated_at
  }
}
```

**GraphQL Mutation (Delete):**

```graphql
mutation DeleteAudioClip($id: uuid!) {
  delete_audio_clips_by_pk(id: $id) {
    id
  }
}
```

**REST-Routen:**

```ts
// functions/scriptony-audio-story/routes/clips.ts
GET    /clips?sceneId=<uuid>     → listClips(req, res)
POST   /clips                    → createClip(req, res)
PUT    /clips/:id                → updateClip(req, res)
DELETE /clips/:id                → deleteClip(req, res)
```

**Validierung (Backend):**

```ts
function validateClipInput(input: unknown): AudioClipInput {
  const schema = z.object({
    trackId: z.string().uuid(),
    sceneId: z.string().uuid(),
    projectId: z.string().uuid(),
    startSec: z.number().min(0),
    endSec: z.number().min(1),
    laneIndex: z.number().int().min(0).max(99),
    orderIndex: z.number().int().min(0),
    audioFileId: z.string().optional(),
    waveformData: z.array(z.number().min(0).max(1)).max(200).optional(),
    crossScene: z.boolean().default(false),
    fxPresetId: z.string().optional(),
  });
  return schema.parse(input);
}
```

### Schritt 4: Frontend-Hooks (`src/hooks/useAudioClips.ts`)

```ts
// src/hooks/useAudioClips.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/react-query";
import * as ClipAPI from "../lib/api/audio-clip-api";
import type { AudioClip } from "../lib/types";

export function useAudioClips(sceneId: string | undefined) {
  const { getAccessToken } = useAuth();
  return useQuery<AudioClip[]>({
    queryKey: queryKeys.audio.clipsByScene(sceneId || ""),
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return ClipAPI.getClipsByScene(sceneId!, token);
    },
    enabled: !!sceneId,
    staleTime: 10 * 1000,
  });
}

export function useCreateAudioClip(
  projectId: string | undefined,
  sceneId: string | undefined,
) {
  const qc = useQueryClient();
  const { getAccessToken } = useAuth();
  return useMutation({
    mutationFn: async (clipData: Partial<AudioClip>) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return ClipAPI.createClip(sceneId!, projectId!, clipData, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.audio.clipsByScene(sceneId || ""),
      });
    },
  });
}

export function useUpdateAudioClip(clipId: string) {
  const qc = useQueryClient();
  const { getAccessToken } = useAuth();
  return useMutation({
    mutationFn: async (updates: Partial<AudioClip>) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return ClipAPI.updateClip(clipId, updates, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.audio.clips() });
    },
  });
}

export function useDeleteAudioClip(clipId: string) {
  const qc = useQueryClient();
  const { getAccessToken } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return ClipAPI.deleteClip(clipId, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.audio.clips() });
    },
  });
}
```

### Schritt 5: AudioDropdown entzeitlichen (Feature-Flag-gesteuert)

```tsx
// src/components/audio/AudioDropdown.tsx — Phase A (T28)

function TrackCard({ track }: { track: AudioTrack }) {
  const useNewSystem = FEATURE_FLAGS.audioClipSystem.enabled; // false in T28

  return (
    <div className="track-card">
      {/* Plan-Teil (immer sichtbar) */}
      <TextEditor value={track.content} onChange={updateTrackContent} />
      <EmotionBadge emotion={track.ttsSettings?.emotion} />
      <CharacterBadge characterId={track.characterId} />
      <TrackTypeBadge type={track.type} />

      {/* Zeit-Teil (Feature-Flag abhängig) */}
      {useNewSystem ? (
        <InfoBadge variant="muted">
          Zeit wird in Clip verwaltet (nicht hier)
        </InfoBadge>
      ) : (
        <LegacyTimeDisplay>
          {/* Unverändert in T28 — T29 zeigt WPM-Schätzung */}
          {track.startTime}s – {track.duration}s
        </LegacyTimeDisplay>
      )}
    </div>
  );
}
```

**In T28:** `useNewSystem = false`. Dropdown zeigt weiter `startTime`/`duration` (unverändert). Kein Breaking Change.

### Schritt 6: AudioTimeline auf Clips umstellen (Feature-Flag-gesteuert)

```tsx
// src/components/audio/AudioTimeline.tsx — Phase A (T28)

export function AudioTimeline({ projectId, projectType }: AudioTimelineProps) {
  const useNewSystem = FEATURE_FLAGS.audioClipSystem.enabled; // false in T28

  if (useNewSystem) {
    // NEU: Lädt AudioClip (noch nicht aktiv in T28)
    const { data: clips } = useAudioClips(projectId);
    return <NewAudioTimeline clips={clips} />;
  } else {
    // ALT: Lädt AudioTrack (bestehend, unverändert in T28)
    const { data: tracks } = useAudioTimeline(projectId);
    return <LegacyAudioTimeline tracks={tracks} />;
  }
}
```

```tsx
// src/components/audio/AudioTimelineSegment.tsx — Vorbereitung für T29

interface TimelineSegmentProps {
  item: AudioTrack | AudioClip; // Union-Typ für Transition
  pxPerSec: number;
}

export function AudioTimelineSegment({ item, pxPerSec }: TimelineSegmentProps) {
  // T28: item ist immer AudioTrack (Legacy)
  // T29+: item kann AudioClip sein (neu)

  const startSec = "startSec" in item ? item.startSec : item.startTime;
  const endSec =
    "endSec" in item
      ? item.endSec
      : (item.startTime || 0) + (item.duration || 0);

  const startPx = (startSec || 0) * pxPerSec;
  const widthPx = Math.max((endSec - (startSec || 0)) * pxPerSec, 4);

  return (
    <div
      className={cn(
        "timeline-segment",
        "startSec" in item ? "clip-mode" : "track-mode",
      )}
      style={{ left: `${startPx}px`, width: `${widthPx}px` }}
    >
      {/* Content */}
    </div>
  );
}
```

**In T28:** `useNewSystem = false`. Timeline rendert weiter `AudioTrack` (unverändert). `AudioTimelineSegment` hat Union-Typ vorbereitet für T29.

### Schritt 7: Migration bestehender Tracks (Shadow-Clip-Erstellung)

**Migrationsskript:**

```ts
// scripts/migrate-audio-tracks-to-clips.ts
import { getAllProjects } from "../src/lib/api/projects-api";
import { getSceneAudioTracks } from "../src/lib/api/audio-story-api";
import { createAudioClip } from "../src/lib/api/audio-clip-api";

async function migrateTracksToClips() {
  const projects = await getAllProjects();

  for (const project of projects.filter((p) => p.type === "audio")) {
    const tracks = await getAllTracksByProject(project.id);

    for (const track of tracks) {
      // Erstelle Shadow-Clip mit bestehenden Zeiten
      await createAudioClip({
        trackId: track.id,
        sceneId: track.sceneId,
        projectId: track.projectId,
        startSec: track.startTime || 0,
        endSec: (track.startTime || 0) + (track.duration || 3),
        laneIndex: resolveLaneIndex(track.type, track.characterId),
        orderIndex: track.orderIndex || 0,
        audioFileId: track.audioFileId, // Duplikat!
        waveformData: track.waveformData, // Duplikat!
      });

      console.log(
        `✅ Migrated track ${track.id} → clip for scene ${track.sceneId}`,
      );
    }
  }

  console.log(
    `Migration complete: ${projects.length} projects, ${tracks.length} tracks`,
  );
}

function resolveLaneIndex(type: string, characterId?: string): number {
  switch (type) {
    case "dialog":
      return characterId ? 0 : 40; // 0 = Dialog, 40 = Erzähler
    case "sfx":
      return 10;
    case "music":
      return 20;
    case "atmo":
      return 30;
    default:
      return 0;
  }
}
```

**Achtung:** Dieser Migration ist **idempotent**. Wenn er zweimal läuft:

- Prüfe ob Clip für Track bereits existiert (`UNIQUE (track_id)` Constraint verhindert Duplikat).
- ODER: `ON CONFLICT (track_id) DO NOTHING` in SQL.

**In T28:** `audio_clips` existiert, aber niemand liest sie noch. Die Migration ist nur Vorbereitung für T29.

## User Journey

1. Entwickler klont Repo, führt Migrationsskript aus.
2. Autor öffnet Audio-Projekt → Dropdown zeigt Tracks ohne Zeiten.
3. Autor fügt Track hinzu → Track erscheint in Dropdown, kein Zeit-Input.
4. Autor wechselt zu Timeline → Track erscheint als Clip mit Default-Länge (1s Platzhalter).
5. Autor generiert TTS → Clip bekommt echte Dauer und Waveform.
6. Autor sieht Ripple in Timeline (nachfolgende Clips rutschen).

## Akzeptanzkriterien

- [ ] `AudioClip` Interface ist in `src/lib/types/index.ts` definiert mit allen Feldern aus T27
- [ ] `AudioTrack` hat `startTime`/`duration` als `@deprecated` + optional markiert (NICHT entfernt — Rückwärtskompatibilität)
- [ ] `audio_clips` Collection ist in Appwrite/Hasura angelegt mit allen Feldern, Constraints, Indexen
- [ ] `functions/scriptony-audio-story/routes/clips.ts` implementiert CRUD mit Zod-Validierung
- [ ] Frontend-Hook `src/hooks/useAudioClips.ts` existiert mit Query + 3 Mutations
- [ ] `AudioDropdown.tsx` zeigt in T28 **weiterhin Zeiten an** (Feature-Flag = false, unverändert)
- [ ] `AudioTimeline.tsx` rendert in T28 **weiterhin AudioTrack[]** (Feature-Flag = false, unverändert)
- [ ] `AudioTimelineSegment.tsx` hat Union-Typ vorbereitet für T29 (kein Funktionswechsel)
- [ ] Migrationsskript `scripts/migrate-audio-tracks-to-clips.ts` erstellt Shadow-Clips für bestehende Tracks
- [ ] Feature-Flag `VITE_ENABLE_AUDIO_CLIP` ist definiert und standardmäßig `false`
- [ ] `npm run typecheck` läuft ohne Fehler
- [ ] `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks` läuft durch
- [ ] Keine Frontend-Regression: Audio-Projekte sehen identisch aus wie vor T28

## Architekturskizze

```
BEFORE (T27-Zustand):
  AudioTrack { startTime, duration, content, characterId }
     ↓
  AudioTimelineSegment: left = track.startTime * pxPerSec

AFTER (T28-Zustand):
  AudioTrack { content, characterId, ttsSettings } ───────┐
                                                          │ 1:N
  AudioClip { trackId, startSec, endSec, laneIndex } ◄───┘
     ↓
  AudioTimelineSegment: left = clip.startSec * pxPerSec
```

## Edge Cases

1. **Track ohne Clip**: Timeline zeigt 1px breiten Platzhalter oder ausgegrauten "Nicht generiert"-Hinweis.
2. **Clip ohne Track (verwaist)**: Garbage-Collection-Job prüft auf verwaiste Clips, markiert sie, löscht nach 30 Tagen.
3. **Mehrere Clips pro Track**: Nicht vorgesehen in T28. Ein Track hat genau einen Clip. Multi-Clip-Tracks kommen in späteren Phasen.
4. **Frontend-Cache veraltet**: Nach Track-Update muss Clip-Query invalidiert werden (`queryClient.invalidateQueries`).
5. **Race Condition: Track gelöscht während Clip erstellt wird**: Backend prüft Track-Existenz vor Clip-Insert.

## SOLID / DRY / KISS

- **SRP**: `AudioTrack` = Plan. `AudioClip` = Ist. Keine doppelte Verantwortung.
- **OCP**: Neue Felder auf Clip (z.B. `fadeIn`) erfordern keine Änderung am Track.
- **DRY**: Clip-CRUD-Logik wird zwischen Frontend-Hook und Backend-Route geteilt (keine Duplikation).
- **KISS**: Ein Track = Ein Clip in T28. Keine Multi-Clip-Komplexität.
- **Liskov**: `AudioClip` und `FilmClip` implementieren beide `BaseClip` Interface (`startSec`, `endSec`).

## Abhängigkeiten

- **Blocker**: T27 muss abgeschlossen sein (Architektur-Review).
- **Parallel**: T26 (Audio Dropdown CRUD) kann parallel laufen, da T28 das Datenmodell neu aufsetzt.
- **Nachfolger**: T29 (WPM-Schätzung) baut auf T28 auf.
