/**
 * T14 Job Handlers — Cancel + Retry.
 */

import {
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendServerError,
} from "../../_shared/http";
import { requireJobOwner } from "../_shared/job-auth";
import {
  cancelJobDoc,
  failJobDoc,
  resetJobForRetry,
  triggerFunctionExecution,
} from "../_shared/job-service";
import { SUPPORTED_JOBS } from "../config/supported-jobs";

export async function handleCancel(
  req: RequestLike,
  res: ResponseLike,
  jobId: string,
): Promise<void> {
  const result = await requireJobOwner(req, res, jobId);
  if (!result) return;

  const { job } = result;

  if (job.status !== "pending" && job.status !== "processing") {
    sendJson(res, 409, {
      error: `Cannot cancel job with status: ${job.status}`,
    });
    return;
  }

  try {
    await cancelJobDoc(jobId);

    sendJson(res, 200, {
      success: true,
      jobId,
      status: "cancelled",
      message: "Job cancelled",
    });
  } catch (error) {
    sendServerError(res, error);
  }
}

export async function handleRetry(
  req: RequestLike,
  res: ResponseLike,
  jobId: string,
): Promise<void> {
  const result = await requireJobOwner(req, res, jobId);
  if (!result) return;

  const { job, user } = result;

  if (job.status !== "failed" && job.status !== "cancelled") {
    sendJson(res, 409, {
      error: `Cannot retry job with status: ${job.status}`,
    });
    return;
  }

  const config = SUPPORTED_JOBS[job.functionName];
  if (!config) {
    sendJson(res, 422, {
      error: `Unsupported job type for retry: ${job.functionName}`,
    });
    return;
  }

  try {
    await resetJobForRetry(jobId);

    // Intentionally fire-and-forget: we return 200 immediately.
    // The catch handler ensures zombie jobs are marked failed even if
    // the serverless runtime freezes after the HTTP response.
    void (async () => {
      try {
        await triggerFunctionExecution(
          config.functionId,
          jobId,
          job.payload,
          user.id,
        );
      } catch (err: unknown) {
        try {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[jobs] retry trigger failed:", { jobId, error: err });
          // Avoid zombie jobs: mark as failed so client stops polling
          await failJobDoc(jobId, `Retry trigger failed: ${msg}`);
        } catch (innerErr) {
          console.error("[jobs] failJobDoc also failed:", {
            jobId,
            error: innerErr,
          });
        }
      }
    })();

    sendJson(res, 200, {
      success: true,
      jobId,
      status: "pending",
      message: "Job retried",
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
