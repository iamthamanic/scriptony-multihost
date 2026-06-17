# T86–T90 — Styleguide Phase 3 (KISS/SOLID/DRY)

**Status:** done  
**Ziel:** implementation  

## T86 — Konflikt-UI
- `StyleProfileConflictBanner` + `useStyleProfileConflictResolve`
- Badges in `ProjectStyleProfileList` (Konflikt / Sync ausstehend)
- Banner im Editor bei `sync.status === conflict`

## T87 — Timeline Overrides + Cloud
- `ShotCardModal` übergibt `sceneOverrideId` aus Timeline-Context
- Cloud: `styleProfileId` / `styleProfileOverrideId` in `timeline.ts`, `scriptony-shots` PUT, Schema

## T88 — Renders Projekt-API
- `GET /stage/render-jobs?projectId=` in `scriptony-stage`
- `listProjectRenderJobs` mit API-first + Shot-Fallback
- `ProjectRendersSection`: Accept/Reject auf Projektebene

## T89 — Analyse erweitert
- Validation-Asset-Coverage im Heuristik-Score (client + `_shared/style-analyze`)
- Optional `mode: 'ai'` → LLM-Blend via `style-analyze-ai.ts`

## T90 — Rich Validation + Compare-Diff
- `ValidationAssetsSectionCard` (18/18 rich sections)
- `compare-style-profiles.ts` + Sektions-Diff im Compare-Tab
