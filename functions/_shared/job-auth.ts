/**
 * Shared Job Auth Helper — Ownership checks with DI.
 *
 * SOLID/DIP: `getJobById` is injected so _shared stays independent
 * of any specific function module's job-service.
 */

import { type AuthUser, requireUserBootstrap } from "./auth";
import {
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendNotFound,
  sendUnauthorized,
} from "./http";
import type { Job } from "./jobs/types";

export interface JobAuthResult {
  user: AuthUser;
  job: Job;
}

/**
 * Authenticate user, fetch job via injected getter, verify ownership.
 * Returns null if any check fails (response already sent).
 */
export async function requireJobOwner(
  req: RequestLike,
  res: ResponseLike,
  jobId: string,
  getJobById: (id: string) => Promise<Job | null>,
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
