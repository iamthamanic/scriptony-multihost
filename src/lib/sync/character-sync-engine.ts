/**
 * Character sync — v1 skipped (name-only dedup / cloudId mapping folgt).
 * Location: src/lib/sync/character-sync-engine.ts
 */

import type { ProjectSyncDomainResult } from "./project-sync-types";

const V1_SKIP_REASON =
  "Character-Sync v1: cloudId-Mapping folgt in späterem Ticket";

export async function syncCharactersForProject(
  _projectId: string,
): Promise<ProjectSyncDomainResult> {
  return {
    synced: 0,
    failed: 0,
    skipped: 1,
    skipReason: V1_SKIP_REASON,
  };
}
