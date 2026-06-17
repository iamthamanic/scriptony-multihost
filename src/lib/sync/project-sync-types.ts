/**
 * Shared types for project sync domains (T93).
 * Location: src/lib/sync/project-sync-types.ts
 */

export interface ProjectSyncDomainResult {
  synced: number;
  failed: number;
  skipped: number;
  pulled?: number;
  pushed?: number;
  conflicts?: number;
  /** Human-readable reason when skipped (v1 hybrid scope). */
  skipReason?: string;
}
