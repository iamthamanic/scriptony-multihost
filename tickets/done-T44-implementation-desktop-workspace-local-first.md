# T44 — Desktop Workspace (Local First)

**Status:** done  
**Typ:** implementation  
**Ziel:** Desktop startet im Local-Profil; erster Start wählt Workspace-Stammordner; Hub listet/erstellt/öffnet `.scriptony`-Projekte.

## Umsetzung

- Tauri: `plugin-dialog`, `plugin-store`, Command `register_workspace_scope`
- `src/local/workspace/`: store, scanner, picker, types
- `LocalWorkspaceProvider`, `FirstRunWorkspaceGate`, `LocalProjectsHub`, `LocalProjectShell`
- Routing in `App.tsx` / `AppContent.tsx`
- Desktop: Self-hosted-Restore überschreibt Local nicht mehr ohne explizite Env-Wahl
- Tests: `workspace-scanner.test.ts`, `workspace-store.test.ts`

## Abnahme

```bash
SHIM_CHANGED_FILES="src/local/workspace/,src/hooks/useLocalWorkspace.tsx,src/components/desktop/,src/App.tsx,src/components/AppContent.tsx,src/runtime/runtime-provider.tsx,src-tauri/,package.json" CHECK_MODE=snippet npm run checks
```

## Follow-up

- T53: Legacy `projectsApi` → `useScriptonyBackend` für vollständige ProjectDetail-Ansicht
- Cloud-Sync optional unverändert (T40)
