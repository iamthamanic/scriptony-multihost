/**
 * Sync project active style profile metadata (T93.2).
 * Location: src/lib/sync/project-meta-sync.ts
 */

import { apiGet, apiPut, unwrapApiResult } from "@/lib/api-client";
import { localGetActiveStyleProfileId } from "@/lib/api-adapter/style-profiles-local";
import {
  mergeActiveStyleProfileIntoMetadata,
  parseProjectMetadata,
} from "@/lib/project-metadata-merge";
import {
  isHybridStyleProfilePushAvailable,
  resolveCloudProfileIdForActive,
} from "@/lib/style-profile/hybrid-cloud-push";
import type { ProjectSyncDomainResult } from "./project-sync-types";

async function cloudGetActiveStyleProfileId(
  projectId: string,
): Promise<string | null> {
  const result = await apiGet<{ project?: Record<string, unknown> }>(
    `/projects/${encodeURIComponent(projectId)}`,
  );
  const data = unwrapApiResult(result);
  const project = (data?.project ?? data) as Record<string, unknown>;
  const meta = parseProjectMetadata(
    project.metadata_json ?? project.metadataJson,
  );
  const id = meta.activeStyleProfileId ?? meta.active_style_profile_id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

export async function syncProjectMeta(
  projectId: string,
): Promise<ProjectSyncDomainResult> {
  if (!(await isHybridStyleProfilePushAvailable())) {
    return { synced: 0, failed: 0, skipped: 1 };
  }

  try {
    const localActive = await localGetActiveStyleProfileId(projectId);
    const cloudActive = await cloudGetActiveStyleProfileId(projectId);
    if (localActive === cloudActive) {
      return { synced: 0, failed: 0, skipped: 1 };
    }
    if (localActive && localActive !== cloudActive) {
      const cloudProfileId = await resolveCloudProfileIdForActive(localActive);
      if (!cloudProfileId) {
        return { synced: 0, failed: 1, skipped: 0 };
      }
      const result = await apiGet<{ project?: Record<string, unknown> }>(
        `/projects/${encodeURIComponent(projectId)}`,
      );
      const data = unwrapApiResult(result);
      const project = (data?.project ?? data) as Record<string, unknown>;
      const merged = mergeActiveStyleProfileIntoMetadata(
        project.metadata_json ?? project.metadataJson,
        cloudProfileId,
      );
      await apiPut(`/projects/${encodeURIComponent(projectId)}`, {
        metadata_json: merged,
      });
      return { synced: 1, failed: 0, skipped: 0, pushed: 1 };
    }
    return { synced: 0, failed: 0, skipped: 1, pulled: cloudActive ? 1 : 0 };
  } catch (error) {
    console.warn("[project-meta-sync] failed:", error);
    return { synced: 0, failed: 1, skipped: 0 };
  }
}
