# T26: File-Size Refactoring (KISS/SOLID/DRY)

**Status:** todo  
**Scope:** Frontend Codebase  
**Goal:** Reduce file sizes to comply with project rules (max 300 lines/file, max 150 lines/component)

## Background

AI Review (Ollama Cloud GLM 5.1) identified multiple files exceeding the project limits. These are pre-existing issues that violate the 300-line file / 150-line component rule from `AGENTS.md`.

## Findings

### Critical (>300 lines)

1. **`src/hooks/useProjectClipLanes.ts`** (482 lines)
   - Extract `groupClipsByLane`/`sortedLaneIndicesFromGroups` (already exported)
   - Extract FX-persist logic into `useFxPersist.ts`
   - Extract ripple-derivation into `useRippleDerivation.ts`

2. **`src/lib/api-adapter/worlds-adapter.ts`** (388 lines)
   - Split `categoriesApiAdapter` into `worlds/categories-adapter.ts`
   - Split `itemsApiAdapter` into `worlds/items-adapter.ts`

3. **`src/lib/api-adapter/projects-adapter.ts`** (350 lines)
   - Extract `cloudFetch` helper into `api-adapter/helpers.ts`
   - Extract local-project CRUD into `api-adapter/local-projects.ts`

4. **`src/lib/api-adapter/timeline-local.ts`** (361 lines)
   - Split `localUltraBatchLoadProject` into `timeline/batch-load.ts`
   - Split `localInitializeProject` into `timeline/initialize.ts`

5. **`src/hooks/useTimelineAddAudio.ts`** (346 lines)
   - Extract recording sub-hook into `useAudioRecording.ts`
   - Extract upload sub-hook into `useAudioUpload.ts`

### Major (>150 lines component / >300 lines Rust)

6. **`src/components/timeline/audio/AudioClipLaneTracks.tsx`** (253 lines)
   - Extract sidebar-label into `AudioLaneSidebar.tsx`
   - Extract content-lane into `AudioLaneContent.tsx`

7. **`src/components/audio/track-header/TrackHeader.tsx`** (186 lines)
   - Extract header top row into `TrackHeaderTop.tsx`
   - Extract drag-drop logic into `TrackDragDrop.tsx`

8. **`src/components/audio/track-header/mixer-slider.css`** (78 lines)
   - Replace `#fff` with `var(--foreground)`
   - Replace `rgba(255,255,255,…)` with `hsl(var(--foreground) / <alpha>)`

9. **`src-tauri/src/commands/workspace.rs`** (323 lines)
   - Extract `validate_workspace_root` into `workspace/validation.rs`
   - Extract `project_dir_under_workspace` into `workspace/paths.rs`
   - Extract delete-command into `workspace/delete.rs`

### Minor

10. **`src/components/desktop/LocalProjectOpenGuard.tsx`** (35 lines)
    - Move `resolveDirPathByProjectId` side-effect into `useLocalProject` hook
    - Or create `useEnsureLocalProjectOpen` hook

## Implementation Plan

### Phase 1: Extract Hooks (KISS)
- [ ] `useProjectClipLanes.ts` → split into 3 files
- [ ] `useTimelineAddAudio.ts` → split into 3 files

### Phase 2: Extract Adapters (SOLID/DRY)
- [ ] `worlds-adapter.ts` → split into 2 files
- [ ] `projects-adapter.ts` → split into 2 files
- [ ] `timeline-local.ts` → split into 2 files

### Phase 3: Extract Components (KISS)
- [ ] `AudioClipLaneTracks.tsx` → split into 3 files
- [ ] `TrackHeader.tsx` → split into 3 files
- [ ] `mixer-slider.css` → theme variables

### Phase 4: Rust Refactoring (DRY)
- [ ] `workspace.rs` → split into 4 files

### Phase 5: Guard Cleanup
- [ ] `LocalProjectOpenGuard.tsx` → move logic to hook

## Success Criteria

- All files ≤300 lines
- All components ≤150 lines
- No hardcoded colors in CSS
- All existing tests pass
- No new lint errors
