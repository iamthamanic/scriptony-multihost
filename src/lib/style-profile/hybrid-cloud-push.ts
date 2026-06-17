/**
 * Best-effort cloud push for local style profiles (T77 hybrid desktop).
 * Location: src/lib/style-profile/hybrid-cloud-push.ts
 */

import { apiPut, apiGet, unwrapApiResult } from "@/lib/api-client";
import { mergeActiveStyleProfileIntoMetadata } from "@/lib/project-metadata-merge";
import { hasOpenLocalProject } from "@/lib/api-adapter/domain-access";
import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import {
  localGetStyleProfile,
  localPatchStyleProfileSyncMeta,
} from "@/lib/api-adapter/style-profiles-local";
import { canUseCloudSessionAndConfig } from "@/lib/auth/cloud-session";
import type {
  StyleProfile,
  StyleProfileSyncMeta,
} from "@/lib/types/style-profile";
import {
  cloudCreateStyleProfile,
  cloudDeleteStyleProfile,
  cloudUpdateStyleProfile,
} from "@/lib/api/style-profile-cloud-http";
import { buildAndValidateSummary } from "./summary";

export function shouldRunHybridStyleProfilePush(): boolean {
  return isLocalProfile() && hasOpenLocalProject();
}

export async function isHybridStyleProfilePushAvailable(): Promise<boolean> {
  if (!shouldRunHybridStyleProfilePush()) return false;
  return canUseCloudSessionAndConfig();
}

function buildCloudPayload(profile: StyleProfile) {
  return {
    name: profile.name,
    projectId: profile.projectId,
    previewImageId: profile.previewImageId ?? null,
    config: buildAndValidateSummary({
      spec: profile.spec,
      type: profile.type,
      status: profile.status,
      source: profile.source,
    }),
    spec: profile.spec,
  };
}

/** Create or update cloud profile; returns sync meta or null when skipped. */
export async function upsertStyleProfileToCloud(
  profile: StyleProfile,
): Promise<StyleProfileSyncMeta | null> {
  if (!(await isHybridStyleProfilePushAvailable())) return null;

  const payload = buildCloudPayload(profile);
  const existingCloudId = profile.sync.cloudId?.trim() || null;

  try {
    if (existingCloudId) {
      await cloudUpdateStyleProfile(existingCloudId, payload);
      return {
        status: "synced",
        cloudId: existingCloudId,
        lastSyncedAt: new Date().toISOString(),
      };
    }

    const created = await cloudCreateStyleProfile(profile.projectId, payload);
    return {
      status: "synced",
      cloudId: created.id,
      lastSyncedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn("[style-profile-hybrid] upsert failed:", error);
    return {
      status: "pending",
      cloudId: existingCloudId,
      lastSyncedAt: profile.sync.lastSyncedAt ?? null,
    };
  }
}

export async function deleteStyleProfileFromCloud(
  cloudId: string | null | undefined,
): Promise<void> {
  const id = cloudId?.trim();
  if (!id) return;
  if (!(await isHybridStyleProfilePushAvailable())) return;
  try {
    await cloudDeleteStyleProfile(id);
  } catch (error) {
    console.warn("[style-profile-hybrid] delete failed:", error);
  }
}

/** Mirror active profile to cloud project metadata (uses cloud profile id). */
export async function pushActiveStyleProfileToCloud(
  projectId: string,
  cloudProfileId: string | null,
): Promise<void> {
  if (!(await isHybridStyleProfilePushAvailable())) return;
  try {
    const result = await apiGet<{ project?: Record<string, unknown> }>(
      `/projects/${encodeURIComponent(projectId)}`,
    );
    const data = unwrapApiResult(result);
    const project = (data?.project ?? data) as Record<string, unknown>;
    await apiPut(`/projects/${encodeURIComponent(projectId)}`, {
      metadata_json: mergeActiveStyleProfileIntoMetadata(
        project.metadata_json ?? project.metadataJson,
        cloudProfileId,
      ),
    });
  } catch (error) {
    console.warn("[style-profile-hybrid] active profile push failed:", error);
  }
}

/** Fire-and-forget upsert after local save. */
export function scheduleHybridStyleProfileUpsert(
  profile: StyleProfile,
  onSynced?: (meta: StyleProfileSyncMeta) => void | Promise<void>,
): void {
  if (!shouldRunHybridStyleProfilePush()) return;
  void (async () => {
    const meta = await upsertStyleProfileToCloud(profile);
    if (meta && onSynced) await onSynced(meta);
  })();
}

function patchSyncMetaBestEffort(
  profileId: string,
  meta: StyleProfileSyncMeta,
): void {
  void localPatchStyleProfileSyncMeta(profileId, meta).catch((error) => {
    console.warn("[style-profile-hybrid] sync meta patch failed:", error);
  });
}

/** Schedule cloud upsert + local sync meta after local create/update. */
export function afterLocalStyleProfileSave(profile: StyleProfile): void {
  scheduleHybridStyleProfileUpsert(profile, (meta) => {
    patchSyncMetaBestEffort(profile.id, meta);
  });
}

export async function resolveCloudProfileIdForActive(
  localProfileId: string,
): Promise<string | null> {
  const profile = await localGetStyleProfile(localProfileId);
  if (profile.sync.cloudId?.trim()) {
    return profile.sync.cloudId.trim();
  }
  const meta = await upsertStyleProfileToCloud(profile);
  if (meta?.cloudId) {
    await localPatchStyleProfileSyncMeta(localProfileId, meta);
    return meta.cloudId;
  }
  return null;
}

/** Mirror active local profile to cloud metadata (best effort). */
export function scheduleHybridActiveStyleProfilePush(
  projectId: string,
  localProfileId: string | null,
): void {
  if (!shouldRunHybridStyleProfilePush()) return;
  void (async () => {
    const cloudId = localProfileId
      ? await resolveCloudProfileIdForActive(localProfileId)
      : null;
    await pushActiveStyleProfileToCloud(projectId, cloudId);
  })();
}
