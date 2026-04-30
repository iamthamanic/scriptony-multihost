/**
 * T14 Job Auth Helper — DRY: Auth + Ownership checks in one place.
 */

import { type AuthUser, requireUserBootstrap } from "../../_shared/auth";
import {
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendNotFound,
  sendUnauthorized,
} from "../../_shared/http";
import type { Job } from "../../_shared/jobs/types";
import { getJobById } from "./job-service";

export interface JobAuthResult {
  user: AuthUser;
  job: Job;
}

/**
 * Authenticate user, fetch job, verify ownership.
 * Returns null if any check fails (response already sent).
 */
export async function requireJobOwner(
  req: RequestLike,
  res: ResponseLike,
  jobId: string,
): Promise<JobAuthResult | null> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return null;
  }

  const job = await getJobById(jobId);
  if (!job) {
    sendNotFound(res, "Job not found");
    return null;
  }

  if (job.user_id !== bootstrap.user.id) {
    sendJson(res, 403, { error: "Forbidden: not your job" });
    return null;
  }

  return { user: bootstrap.user, job };
}
