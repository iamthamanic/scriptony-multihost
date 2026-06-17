# T93 — ProjectSyncEngine (Plan)

**Status:** todo  
**Typ:** plan  
**Phase:** 5  
**Parent:** [T97 Roadmap](./todo-T97-plan-puppet-layer-phase4-roadmap.md)  
**Basis:** T86 Style-Sync ✅, T40 Cloud-Sync-Achse, [`docs/ARCHITECTURE_LOCAL_CLOUD.md`](../docs/ARCHITECTURE_LOCAL_CLOUD.md)

## Problem

**Heute:** `style-profile-sync-engine.ts` synct nur StyleProfiles (pull/push/conflict). Characters, Timeline-Metadaten, aktives Profil und Cloud-only-Entitäten sind **nicht** in einem Flow.

Nutzer mit Hybrid-Desktop brauchen **einen** Sync-Einstieg (→ T100 Settings) für das ganze Projekt.

## Ziel (KISS)

**Orchestrator + Domain-Adapter** — kein Monolith:

```ts
// src/lib/sync/project-sync-engine.ts
interface ProjectSyncResult {
  byDomain: {
    styleProfiles: StyleProfileSyncResult;
    projectMeta?: { synced: boolean };
    characters?: { pulled: number; pushed: number; conflicts: number };
    timelineMeta?: { pulled: number; conflicts: number };
  };
  totals: { synced; failed; conflicts; skipped };
}

async function syncProjectBidirectional(projectId: string): Promise<ProjectSyncResult>
async function pullProjectFromCloud(projectId: string): Promise<ProjectSyncResult>
async function pushProjectToCloud(projectId: string): Promise<ProjectSyncResult>
```

## SOLID: Domain-Sync-Module

| Domain | Modul | Strategie v1 |
|--------|-------|----------------|
| StyleProfiles | `style-profile-sync-engine.ts` | **bereits** — importieren, nicht kopieren |
| Project meta | `project-meta-sync.ts` | `activeStyleProfileId` in `metadata_json` |
| Characters | `character-sync-engine.ts` | pull-by-project, push on dirty, `cloudId` in local SQLite |
| Timeline | `timeline-meta-sync-engine.ts` | **nur** shot/scene metadata: overrides, `styleProfileId` — **nicht** ganze Struktur-CRDT |
| RenderJobs | — | **read-only pull** optional v2 — nicht v1 |
| GuideBundles | — | Cloud-only, kein bidirektionaler Sync v1 |

Jedes Modul: gleiche Sync-Metapher wie Profiles (`local | pending | synced | conflict`).

## Conflict-Resolution (DRY)

Wiederverwenden:

- `resolveStyleProfileConflict(id, "local" | "cloud")` ✅
- Generisch: `src/lib/sync/resolve-sync-conflict.ts` — Template für andere Domänen

UI: T100 Settings — Liste Konflikte pro Domäne → gleicher Banner-Pattern wie `StyleProfileConflictBanner`.

## Datenmodell (local SQLite)

Erweiterung nur wo nötig — **kein Big-Bang**:

```sql
-- characters: sync_status, cloud_id, last_synced_at (falls noch nicht)
-- structure nodes metadata: bereits JSON — conflict via project-level change_log optional
```

Prefer: `change_log` Tabelle (falls vorhanden) für Timeline — nur Plan-Verweis, Implementation prüft `LocalBackend`.

## UI

| Ort | Verhalten |
|-----|-----------|
| `ProjectStyleSettingsBlock` (T100) | „Alles synchronisieren“ → `syncProjectBidirectional` |
| `ProjectSettingsSection` | Domänen-Breakdown nach Sync |
| Style-Editor Status-Bar | bleibt profil-spezifisch (DRY: ruft nur style-Teil) |

## Cloud-Import (fehlende cloudId)

v1 KISS:

- Pull: Cloud-Profile ohne lokalen Eintrag → **anlegen** mit `sync.cloudId = cloud.id`
- Kein automatisches Löschen lokaler-only Profile

## Implementierungs-Reihenfolge (innerhalb T93)

```
T93.1  project-sync-engine.ts Shell + styleProfiles delegate
T93.2  project-meta-sync (activeStyleProfileId)
T93.3  character-sync-engine
T93.4  timeline-meta-sync (shot/scene override fields)
T93.5  Settings UI breakdown + multi-conflict list
```

## Acceptance (v1)

- [ ] Ein Aufruf `syncProjectBidirectional` führt Style + Meta aus
- [ ] Ergebnis zeigt per-Domain-Zähler
- [ ] Characters: mindestens pull + push happy path
- [ ] Timeline: shot `styleProfileId` / scene `styleProfileOverrideId` round-trip hybrid
- [ ] Konflikte blockieren push nicht für andere Domänen (best effort)

## Checks

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend" \
  SHIM_CHANGED_FILES="src/lib/sync/,src/hooks/useProjectSync.ts,src/components/projects/settings/" \
  npm run checks
```

Backend nur wenn Character-Cloud-API angefasst.

## Nicht-Ziele (v1)

- Vollständige Timeline-Struktur-Merge (acts/sequences reorder)
- RenderJob bidirektional
- Real-time multi-user
- Ersetzen von `hybrid-cloud-push` on-save — bleibt **zusätzlich** (event push + manual full sync)

## Abhängigkeiten

- T98 — Cloud-APIs stabil
- T100 — Settings-Tab als Sync-Home empfohlen
- T86 — Conflict-UI Pattern

## Folge-Tickets

- `todo-T93-implementation-project-sync-engine-v1.md` (Meta + Shell)
- `todo-T93-implementation-character-sync.md`
- `todo-T93-implementation-timeline-meta-sync.md`
