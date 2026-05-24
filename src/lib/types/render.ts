/**
 * Puppet-Layer render job types.
 */

export type RenderJobStatus = "queued" | "executing" | "completed" | "failed";
export type ReviewStatus = "pending" | "accepted" | "rejected";

export interface RenderJob {
  id: string;
  userId: string;
  projectId: string;
  shotId: string;
  type: string;
  jobClass: string;
  status: RenderJobStatus;
  reviewStatus: ReviewStatus;
  acceptedAt: string | null;
  acceptedBy: string | null;
  guideBundleId: string;
  styleProfileId: string;
  repairConfig: string | null;
  outputImageIds: string[];
  createdAt: string;
  completedAt: string | null;
}

// Re-export freshness types from the shared module (single source of truth).
// Avoids duplicate definitions that could drift out of sync.
export type {
  FreshnessStatus,
  ShotFreshnessResult,
} from "../../../functions/_shared/freshness";
