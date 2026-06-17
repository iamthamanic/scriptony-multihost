/**
 * Project-wide hybrid sync orchestrator (T93).
 * Location: src/lib/sync/project-sync-engine.ts
 */

import {
  syncStyleProfilesBidirectional,
  type StyleProfileSyncResult,
} from "@/lib/style-profile/style-profile-sync-engine";
import { syncProjectMeta } from "./project-meta-sync";
import { syncCharactersForProject } from "./character-sync-engine";
import { syncTimelineMetaForProject } from "./timeline-meta-sync-engine";

import type { ProjectSyncDomainResult } from "./project-sync-types";

export type { ProjectSyncDomainResult } from "./project-sync-types";

export interface ProjectSyncResult {
  byDomain: {
    styleProfiles: StyleProfileSyncResult;
    projectMeta: ProjectSyncDomainResult;
    characters: ProjectSyncDomainResult;
    timelineMeta: ProjectSyncDomainResult;
  };
  totals: {
    synced: number;
    failed: number;
    conflicts: number;
    skipped: number;
  };
}

function sumDomains(
  domains: ProjectSyncDomainResult[],
): ProjectSyncResult["totals"] {
  return domains.reduce<ProjectSyncResult["totals"]>(
    (acc, domain) => ({
      synced:
        acc.synced +
        domain.synced +
        (domain.pulled ?? 0) +
        (domain.pushed ?? 0),
      failed: acc.failed + domain.failed,
      skipped: acc.skipped + domain.skipped,
      conflicts: acc.conflicts + (domain.conflicts ?? 0),
    }),
    { synced: 0, failed: 0, skipped: 0, conflicts: 0 },
  );
}

export async function syncProjectBidirectional(
  projectId: string,
): Promise<ProjectSyncResult> {
  const styleProfiles = await syncStyleProfilesBidirectional(projectId);
  const [projectMeta, characters, timelineMeta] = await Promise.all([
    syncProjectMeta(projectId),
    syncCharactersForProject(projectId),
    syncTimelineMetaForProject(projectId),
  ]);

  const totals = sumDomains([
    {
      synced: styleProfiles.synced,
      failed: styleProfiles.failed,
      skipped: styleProfiles.skipped,
      pulled: styleProfiles.pulled,
      conflicts: styleProfiles.conflicts,
    },
    projectMeta,
    characters,
    timelineMeta,
  ]);

  return {
    byDomain: { styleProfiles, projectMeta, characters, timelineMeta },
    totals,
  };
}

export async function pullProjectFromCloud(
  projectId: string,
): Promise<ProjectSyncResult> {
  return syncProjectBidirectional(projectId);
}

export async function pushProjectToCloud(
  projectId: string,
): Promise<ProjectSyncResult> {
  return syncProjectBidirectional(projectId);
}
