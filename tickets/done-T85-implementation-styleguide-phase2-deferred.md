# T85 — Styleguide Phase 2 (deferred items)

**Status:** done  
**Ziel:** implementation  
**Scope:** Validation upload, KI analyze endpoint, bidirectional sync, timeline overrides, Renders subnav

## Delivered

| Item | Implementation |
|------|----------------|
| Validation-Asset-Upload | `POST /ai/style/profiles/:id/validation-asset`, local `importAsset` + `validation-asset-upload.ts`, interactive `ValidationAssetGrid` |
| `POST /ai/style/analyze` | `functions/_shared/style-analyze.ts`, route in `scriptony-style`, `analyze-style-remote.ts` + hook fallback |
| Bidirectional Sync | `pullStyleProfilesFromCloud`, `syncStyleProfilesBidirectional`, conflict status + count in status bar |
| Shot/Scene Override UI | `StyleProfileOverrideSelect`, `ShotStyleOverrideControls`, `SceneStyleOverrideControl`, metadata persist in shots-local + timeline-api |
| Renders subnav | `ProjectDetailSubnav` + `ProjectRendersSection` + `listProjectRenderJobs` |

## Checks

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend" SHIM_CHANGED_FILES="functions/scriptony-style/index.ts,functions/scriptony-style/style-service.ts,functions/_shared/style-analyze.ts,src/lib/style-profile,src/components/projects,src/components/timeline,src/components/ShotCard.tsx,src/components/structure/DropdownView.tsx,src/lib/api-adapter/shots-local.ts,src/lib/api/timeline-api.ts" npm run checks
```
