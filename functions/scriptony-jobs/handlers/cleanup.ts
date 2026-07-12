/**
 * T14 Job Handlers — Cleanup.
 */

import { z } from "zod";
import { requireAuth } from "../../_shared/auth-http";
import {
  type RequestLike,
  type ResponseLike,
  readJsonBody,
  sendJson,
  sendServerError,
} from "../../_shared/http";
import { cleanupOldJobs } from "../_shared/job-service";

const CleanupBody = z.object({
  hours: z.number().int().positive().optional(),
});

export async function handleCleanup(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (user.defaultRole !== "superadmin") {
    sendJson(res, 403, {
      error: "Forbidden: cleanup requires superadmin privileges",
    });
    return;
  }

  const parsed = CleanupBody.safeParse(await readJsonBody(req));
  if (!parsed.success) {
    sendJson(res, 400, {
      error: "Invalid request body",
      details: parsed.error.issues,
    });
    return;
  }
  const olderThanHours = parsed.data.hours ?? 24;

  try {
    const { deleted, failed, capped } = await cleanupOldJobs(olderThanHours);

    sendJson(res, 200, {
      success: true,
      deleted,
      failed,
      capped,
      message: capped
        ? `Cleaned up ${deleted} old jobs (${failed} failed). More jobs may remain; cap=100 per call.`
        : `Cleaned up ${deleted} old jobs (${failed} failed)`,
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
