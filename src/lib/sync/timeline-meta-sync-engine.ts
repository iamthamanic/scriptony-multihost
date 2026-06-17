/**
 * Timeline shot style metadata sync — v1 skipped (local/cloud ID mismatch).
 * Location: src/lib/sync/timeline-meta-sync-engine.ts
 */

import type { ProjectSyncDomainResult } from "./project-sync-types";

const V1_SKIP_REASON =
  "Timeline-Style-Sync v1: Shot-ID-Mapping local↔cloud folgt in späterem Ticket";

export async function syncTimelineMetaForProject(
  _projectId: string,
): Promise<ProjectSyncDomainResult> {
  return {
    synced: 0,
    failed: 0,
    skipped: 1,
    skipReason: V1_SKIP_REASON,
  };
}
