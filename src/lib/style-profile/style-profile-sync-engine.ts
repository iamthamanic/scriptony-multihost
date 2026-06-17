/**
 * Style profile cloud sync engine — push + pull + conflicts (Step 3).
 * Location: src/lib/style-profile/style-profile-sync-engine.ts
 */

import { listStyleProfiles } from "@/lib/api/style-profile-api";
import {
  localGetStyleProfile,
  localListStyleProfiles,
  localPatchStyleProfileSyncMeta,
  localUpdateStyleProfile,
} from "@/lib/api-adapter/style-profiles-local";
import {
  cloudGetStyleProfile,
  cloudListStyleProfiles,
} from "@/lib/api/style-profile-cloud-http";
import type { StyleProfile } from "@/lib/types/style-profile";
import {
  isHybridStyleProfilePushAvailable,
  upsertStyleProfileToCloud,
} from "./hybrid-cloud-push";
import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import { buildAndValidateSummary } from "./summary";
import { normalizeStyleProfileSpec } from "./normalize";

export interface StyleProfileSyncResult {
  synced: number;
  failed: number;
  skipped: number;
  pulled: number;
  conflicts: number;
}

function parseTs(iso: string | undefined | null): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function needsCloudPush(profile: StyleProfile): boolean {
  return (
    profile.sync.status === "local" ||
    profile.sync.status === "pending" ||
    profile.sync.status === "conflict"
  );
}

function hasLocalChangesSinceSync(profile: StyleProfile): boolean {
  const lastSync = parseTs(profile.sync.lastSyncedAt);
  const updated = parseTs(profile.updatedAt);
  return updated > lastSync + 1000;
}

export async function countPendingStyleProfileSync(
  projectId: string,
): Promise<number> {
  const profiles = await listStyleProfiles(projectId);
  return profiles.filter(
    (p) => needsCloudPush(p) || p.sync.status === "conflict",
  ).length;
}

export async function countStyleProfileConflicts(
  projectId: string,
): Promise<number> {
  const profiles = await listStyleProfiles(projectId);
  return profiles.filter((p) => p.sync.status === "conflict").length;
}

/** Pull cloud updates for linked profiles; mark conflicts when both sides diverged. */
export async function pullStyleProfilesFromCloud(
  projectId: string,
): Promise<Pick<StyleProfileSyncResult, "pulled" | "conflicts" | "failed">> {
  if (!(await isHybridStyleProfilePushAvailable())) {
    return { pulled: 0, conflicts: 0, failed: 0 };
  }

  const [localProfiles, cloudProfiles] = await Promise.all([
    localListStyleProfiles(projectId),
    cloudListStyleProfiles(projectId),
  ]);

  const cloudById = new Map(cloudProfiles.map((p) => [p.id, p]));
  let pulled = 0;
  let conflicts = 0;
  let failed = 0;

  for (const local of localProfiles) {
    const cloudId = local.sync.cloudId?.trim();
    if (!cloudId) continue;

    const cloudSummary = cloudById.get(cloudId);
    if (!cloudSummary) continue;

    const cloudUpdated = parseTs(cloudSummary.updatedAt);
    const localUpdated = parseTs(local.updatedAt);
    const lastSync = parseTs(local.sync.lastSyncedAt);
    const localDirty = hasLocalChangesSinceSync(local);

    if (cloudUpdated <= lastSync && localUpdated <= lastSync) {
      continue;
    }

    if (cloudUpdated > lastSync && localDirty && localUpdated > lastSync) {
      await localPatchStyleProfileSyncMeta(local.id, { status: "conflict" });
      conflicts += 1;
      continue;
    }

    if (
      cloudUpdated > localUpdated ||
      (cloudUpdated > lastSync && !localDirty)
    ) {
      try {
        const cloudFull = await cloudGetStyleProfile(cloudId);
        const spec = normalizeStyleProfileSpec(cloudFull.spec);
        const configSummary = buildAndValidateSummary({
          spec,
          type: cloudFull.type,
          status: cloudFull.status,
          source: cloudFull.source,
        });
        await localUpdateStyleProfile(local.id, {
          name: cloudFull.name,
          spec,
          configSummary,
          previewImageId: cloudFull.previewImageId,
        });
        await localPatchStyleProfileSyncMeta(local.id, {
          status: "synced",
          cloudId,
          lastSyncedAt: new Date().toISOString(),
        });
        pulled += 1;
      } catch (error) {
        console.warn("[style-sync] pull failed:", local.id, error);
        failed += 1;
      }
    }
  }

  return { pulled, conflicts, failed };
}

/** Push all local/pending profiles to cloud (best effort). */
export async function pushPendingStyleProfiles(
  projectId: string,
): Promise<Pick<StyleProfileSyncResult, "synced" | "failed" | "skipped">> {
  if (!(await isHybridStyleProfilePushAvailable())) {
    return { synced: 0, failed: 0, skipped: 0 };
  }

  const profiles = await listStyleProfiles(projectId);
  let synced = 0;
  let failed = 0;
  let skipped = 0;

  for (const profile of profiles) {
    if (profile.sync.status === "conflict") {
      skipped += 1;
      continue;
    }
    if (!needsCloudPush(profile)) {
      skipped += 1;
      continue;
    }
    const meta = await upsertStyleProfileToCloud(profile);
    if (meta?.status === "synced") {
      if (isLocalProfile()) {
        await localPatchStyleProfileSyncMeta(profile.id, meta);
      }
      synced += 1;
    } else {
      failed += 1;
    }
  }

  return { synced, failed, skipped };
}

/** Bidirectional sync: pull then push. */
export async function syncStyleProfilesBidirectional(
  projectId: string,
): Promise<StyleProfileSyncResult> {
  const pull = await pullStyleProfilesFromCloud(projectId);
  const push = await pushPendingStyleProfiles(projectId);
  return {
    ...pull,
    ...push,
    conflicts: pull.conflicts,
    pulled: pull.pulled,
  };
}

export async function resolveStyleProfileConflict(
  profileId: string,
  resolution: "local" | "cloud",
): Promise<void> {
  const local = await localGetStyleProfile(profileId);
  const cloudId = local.sync.cloudId?.trim();
  if (!cloudId) {
    throw new Error("Profil ist nicht mit der Cloud verknüpft");
  }

  if (resolution === "cloud") {
    const cloudFull = await cloudGetStyleProfile(cloudId);
    const spec = normalizeStyleProfileSpec(cloudFull.spec);
    const configSummary = buildAndValidateSummary({
      spec,
      type: cloudFull.type,
      status: cloudFull.status,
      source: cloudFull.source,
    });
    await localUpdateStyleProfile(profileId, {
      name: cloudFull.name,
      spec,
      configSummary,
      previewImageId: cloudFull.previewImageId,
    });
    await localPatchStyleProfileSyncMeta(profileId, {
      status: "synced",
      cloudId,
      lastSyncedAt: new Date().toISOString(),
    });
    return;
  }

  const meta = await upsertStyleProfileToCloud(local);
  if (meta?.status === "synced") {
    await localPatchStyleProfileSyncMeta(profileId, meta);
  } else {
    throw new Error("Cloud-Upload nach Konflikt-Auflösung fehlgeschlagen");
  }
}
