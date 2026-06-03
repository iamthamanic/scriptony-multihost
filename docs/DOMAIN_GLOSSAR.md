# Domain Glossar — Local vs Cloud-HTTP

> HTTP route names are **transport**, not domain names. Routes appear only in `*-cloud-http.ts`, [`route-map.ts`](../src/lib/api-gateway/route-map.ts), and this table.

| Domäne (Produkt) | SQLite / lokal | Cloud-HTTP (Route) | Fassade → Adapter |
|------------------|----------------|--------------------|-------------------|
| **Projekt-Figur (Timeline)** | Tabelle `characters`, [`LocalCharacterRepository`](../src/backend/local/LocalCharacterRepository.ts) | `GET/POST/PUT/DELETE /timeline-characters` | [`characters-api.ts`](../src/lib/api/characters-api.ts) → [`characters-adapter`](../src/lib/api-adapter/characters-adapter.ts) |
| **Story Beat** | `story_beats`, [`LocalBeatsRepository`](../src/backend/local/LocalBeatsRepository.ts) | `/beats`, `/beats/:id` | [`beats-api.ts`](../src/lib/api/beats-api.ts) → [`beats-adapter`](../src/lib/api-adapter/beats-adapter.ts) |
| **Timeline-Struktur (Act/Seq/Scene/Node)** | `project_nodes`, [`LocalStructureRepository`](../src/backend/local/LocalStructureRepository.ts) | `/nodes`, `/nodes/batch-load`, `/initialize-project` | [`timeline-api.ts`](../src/lib/api/timeline-api.ts) / [`timeline-api-v2.ts`](../src/lib/api/timeline-api-v2.ts) → [`timeline-structure-adapter`](../src/lib/api-adapter/timeline-structure-adapter.ts), [`timeline-local`](../src/lib/api-adapter/timeline-local.ts) |
| **Audio-Clip** | via [`LocalAudioRepository`](../src/backend/local/LocalAudioRepository.ts) | `/clips`, `/audio-clips` | [`audio-clip-api.ts`](../src/lib/api/audio-clip-api.ts) → [`clips-adapter`](../src/lib/api-adapter/clips-adapter.ts) |
| **Audio-Track / Voice** | `LocalAudioRepository` | `scriptony-audio-story` routes | [`audio-story-adapter`](../src/lib/api-adapter/audio-story-adapter.ts) |
| **Shot (Film)** | Struktur-Knoten `type=shot` | `/shots`, `/shots/by-scene/:id` | [`shots-api.ts`](../src/lib/api/shots-api.ts) → [`shots-adapter`](../src/lib/api-adapter/shots-adapter.ts) |
| **Worldbuilding (Welt/Item)** | [`LocalWorldbuildingRepository`](../src/backend/local/LocalWorldbuildingRepository.ts) | worldbuilding Functions | [`items-api`](../src/lib/api-adapter/items-api.ts), [`worlds-adapter`](../src/lib/api-adapter/worlds-adapter.ts) |
| **Projekt-Liste (Workspace)** | Workspace-Scan + SQLite | `/projects` (cloud) | [`projects-adapter`](../src/lib/api-adapter/projects-adapter.ts) |
| **Style Guide (lesen)** | Lokaler Draft | `/style-guide/:projectId` | [`style-guide-api.ts`](../src/lib/api/style-guide-api.ts) → [`style-guide-adapter`](../src/lib/api-adapter/style-guide-adapter.ts) |
| **Style Guide (Jobs/Upload)** | — | `/style-guide/...` + job queue | [`style-guide-job-api.ts`](../src/lib/api/style-guide-job-api.ts) — `CLOUD_SESSION` |
| **Creative Gym** | [`local-json-storage`](../src/modules/creative-gym/infrastructure/storage/local-json-storage.ts) | user-scoped cloud (planned) | [`creative-gym/`](../src/modules/creative-gym/) — not project sync |
| **Stage** | lokal / Blender-Pipeline | — | `LOCAL_ONLY` in capability registry |

## Naming convention (new code)

| Suffix / folder | Meaning |
|-----------------|--------|
| `*-cloud-http.ts` | `apiGet` / `apiClient` to gateway |
| `*-local.ts` (adapter) | `requireLocalBackend()` |
| `*-adapter.ts` | `dispatchByRuntime` only |
| `backend/local/` | Repositories + SQLite |

**Forbidden:** New domain modules named after HTTP paths (`timeline-characters-api.ts`).

## Legacy duplicate

[`scenes-characters-adapter.ts`](../src/lib/api-adapter/scenes-characters-adapter.ts) — scenes legacy + characters; prefer **`characters-adapter`** for timeline characters. Scenes remain on `scenesApiAdapter` until fully migrated.
