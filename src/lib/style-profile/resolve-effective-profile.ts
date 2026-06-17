/**
 * Resolve effective style profile: project → scene → shot override (Step 4).
 * Location: src/lib/style-profile/resolve-effective-profile.ts
 */

export interface StyleOverrideContext {
  activeProjectProfileId?: string | null;
  sceneOverrideId?: string | null;
  shotAssignedProfileId?: string | null;
  shotOverrideId?: string | null;
}

/** shot override → scene override → shot assignment → project active */
export function resolveEffectiveStyleProfileId(
  ctx: StyleOverrideContext,
): string | null {
  return (
    ctx.shotOverrideId?.trim() ||
    ctx.sceneOverrideId?.trim() ||
    ctx.shotAssignedProfileId?.trim() ||
    ctx.activeProjectProfileId?.trim() ||
    null
  );
}

export interface RenderJobStyleInput {
  projectId: string;
  shotId: string;
  activeProjectProfileId?: string | null;
  sceneOverrideId?: string | null;
  shotAssignedProfileId?: string | null;
  shotOverrideId?: string | null;
}

export function resolveStyleProfileIdForRenderJob(
  input: RenderJobStyleInput,
): string | null {
  return resolveEffectiveStyleProfileId({
    activeProjectProfileId: input.activeProjectProfileId,
    sceneOverrideId: input.sceneOverrideId,
    shotAssignedProfileId: input.shotAssignedProfileId,
    shotOverrideId: input.shotOverrideId,
  });
}
