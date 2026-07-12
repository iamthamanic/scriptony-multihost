/**
 * T14 Job Auth Helper — thin wrapper around shared requireJobOwner.
 *
 * DRY: Wires _shared/job-auth.ts with scriptony-jobs local getJobById.
 */

import type { RequestLike, ResponseLike } from "../../_shared/http";
import {
  requireJobOwner as baseRequireJobOwner,
  type JobAuthResult,
} from "../../_shared/job-auth";
import { getJobById } from "./job-service";

export type { JobAuthResult } from "../../_shared/job-auth";

/**
 * Authenticate user, fetch job, verify ownership.
 * Returns null if any check fails (response already sent).
 */
export async function requireJobOwner(
  req: RequestLike,
  res: ResponseLike,
  jobId: string,
): Promise<JobAuthResult | null> {
  return baseRequireJobOwner(req, res, jobId, getJobById);
}
