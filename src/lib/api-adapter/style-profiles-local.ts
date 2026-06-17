/**
 * Local style profiles via LocalStyleProfileRepository + project-settings.
 * Location: src/lib/api-adapter/style-profiles-local.ts
 */

import type {
  CreateStyleProfilePayload,
  StyleProfile,
  StyleProfileSyncMeta,
  UpdateStyleProfilePatch,
} from "@/lib/types/style-profile";
import {
  readProjectSettings,
  writeProjectSettings,
} from "@/local/project-settings";
import { requireLocalBackend } from "./runtime-dispatch";
import { buildAndValidateSummary } from "@/lib/style-profile/summary";

export async function localGetActiveStyleProfileId(
  projectId: string,
): Promise<string | null> {
  const backend = requireLocalBackend(projectId);
  const settings = await readProjectSettings(backend.localProject.dirPath);
  return settings?.activeStyleProfileId ?? null;
}

export async function localSetActiveStyleProfileId(
  projectId: string,
  profileId: string | null,
): Promise<void> {
  const backend = requireLocalBackend(projectId);
  const existing =
    (await readProjectSettings(backend.localProject.dirPath)) ?? {};
  await writeProjectSettings(backend.localProject.dirPath, {
    ...existing,
    activeStyleProfileId: profileId,
  });
}

export async function localListStyleProfiles(
  projectId: string,
): Promise<StyleProfile[]> {
  const backend = requireLocalBackend(projectId);
  const activeId = await localGetActiveStyleProfileId(projectId);
  return backend.styleProfiles.list(projectId, {
    activeStyleProfileId: activeId,
  });
}

export async function localGetStyleProfile(
  profileId: string,
): Promise<StyleProfile> {
  const backend = requireLocalBackend();
  const profile = await backend.styleProfiles.get(profileId);
  if (!profile) throw new Error(`StyleProfile ${profileId} not found`);
  const activeId = await localGetActiveStyleProfileId(profile.projectId);
  return {
    ...profile,
    isActiveForProject: activeId === profile.id,
    fullSpecEditing: true,
  };
}

export async function localCreateStyleProfile(
  projectId: string,
  payload: CreateStyleProfilePayload,
): Promise<StyleProfile> {
  const backend = requireLocalBackend(projectId);
  const profile = await backend.styleProfiles.create(projectId, payload);
  if (payload.setActive !== false) {
    const existing = await localListStyleProfiles(projectId);
    if (existing.length === 1) {
      await localSetActiveStyleProfileId(projectId, profile.id);
      return { ...profile, isActiveForProject: true, fullSpecEditing: true };
    }
  }
  if (payload.setActive === true) {
    await localSetActiveStyleProfileId(projectId, profile.id);
    return { ...profile, isActiveForProject: true, fullSpecEditing: true };
  }
  return { ...profile, fullSpecEditing: true };
}

export async function localUpdateStyleProfile(
  profileId: string,
  patch: UpdateStyleProfilePatch,
): Promise<StyleProfile> {
  const backend = requireLocalBackend();
  const existing = await backend.styleProfiles.get(profileId);
  if (!existing) throw new Error(`StyleProfile ${profileId} not found`);

  const nextSpec = patch.spec ?? existing.spec;
  const configSummary =
    patch.configSummary ??
    buildAndValidateSummary({
      spec: nextSpec,
      type: patch.type ?? existing.type,
      status: patch.status ?? existing.status,
      source: patch.source ?? existing.source,
    });

  return backend.styleProfiles.update(profileId, {
    ...patch,
    configSummary,
    spec: nextSpec,
    version: (existing.version ?? 1) + (patch.spec ? 1 : 0),
  });
}

export async function localDeleteStyleProfile(
  profileId: string,
): Promise<void> {
  const backend = requireLocalBackend();
  const existing = await backend.styleProfiles.get(profileId);
  if (!existing) return;
  const activeId = await localGetActiveStyleProfileId(existing.projectId);
  if (activeId === profileId) {
    await localSetActiveStyleProfileId(existing.projectId, null);
  }
  await backend.styleProfiles.delete(profileId);
}

export async function localPatchStyleProfileSyncMeta(
  profileId: string,
  sync: Partial<StyleProfileSyncMeta>,
): Promise<void> {
  const backend = requireLocalBackend();
  await backend.styleProfiles.patchSyncMeta(profileId, sync);
}
