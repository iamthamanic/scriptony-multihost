# T71: DRY Appwrite Function Entrypoints

**Status:** todo  
**Scope:** `functions/**/index.ts`  
**Goal:** Remove duplicated `getPathname`, `withParams`, and route-not-found helpers from function entrypoints.

## Change

Shared helpers in `functions/_shared/appwrite-handler.ts` are now the single source:

- `getPathname(req)` — normalize `req.path` / `req.url` to a pathname
- `withParams(req, params)` — merge route params onto the request
- `sendRouteNotFound(service, req, res)` — consistent 404 for unmatched dispatch routes

## Updated entrypoints (18)

- `scriptony-ai`
- `scriptony-assistant` (keeps `/ai/assistant` → `/ai` normalization in `dispatch`)
- `scriptony-audio`
- `scriptony-beats`
- `scriptony-characters`
- `scriptony-clips`
- `scriptony-editor-readmodel`
- `scriptony-image`
- `scriptony-mcp-appwrite` (`getPathname` only; unknown routes still use `sendBadRequest`)
- `scriptony-project-nodes`
- `scriptony-projects`
- `scriptony-stage`
- `scriptony-stage2d`
- `scriptony-stage3d`
- `scriptony-style`
- `scriptony-style-guide`
- `scriptony-sync`
- `scriptony-worldbuilding`

## Notes

- Dispatch logic and route tables are unchanged.
- Entity-level `sendNotFound` calls (e.g. "Shot not found") remain in handlers.
- Route-level 404 messages now include HTTP method via `sendRouteNotFound`.

## Verification

```bash
SHIM_CHANGED_FILES="functions/scriptony-ai/index.ts,..." npm run build:functions
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--backend" SHIM_CHANGED_FILES="functions/..." npm run checks
```
