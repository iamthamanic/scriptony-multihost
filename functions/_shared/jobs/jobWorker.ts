/**
 * Job Worker Helpers
 * Functions call these to report progress/completion when running as jobs
 */

import { updateDocument } from "../appwrite-db";

const JOBS_COLLECTION = "jobs";

interface JobContext {
  jobId: string;
  userId: string;
  isJob: boolean;
}

/**
 * Extract job context from function payload
 * Call this at the start of your function
 */
export function extractJobContext(payload: unknown): JobContext | null {
  if (!payload || typeof payload !== "object") return null;

  const p = payload as Record<string, unknown>;
  const jobId = p.__jobId as string | undefined;
  const userId = p.__userId as string | undefined;

  if (!jobId) return null;

  return {
    jobId,
    userId: userId || "",
    isJob: true,
  };
}

/**
 * Strip internal job fields from payload before processing
 */
export function stripJobFields(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const { __jobId, __userId, ...rest } = payload;
  return rest;
}

/**
 * Update job progress (0-100).
 * Throws on DB error so caller knows state is out of sync.
 */
export async function reportJobProgress(
  jobId: string,
  progress: number,
): Promise<void> {
  await updateDocument(JOBS_COLLECTION, jobId, {
    progress: Math.min(100, Math.max(0, progress)),
    updated_at: new Date().toISOString(),
  });
}

/**
 * Mark job as completed with result.
 * Throws on DB error so caller knows state is out of sync.
 */
export async function completeJob<T>(jobId: string, result: T): Promise<void> {
  await updateDocument(JOBS_COLLECTION, jobId, {
    status: "completed",
    result_json: JSON.stringify(result),
    progress: 100,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

/**
 * Mark job as failed.
 * Throws on DB error so caller knows state is out of sync.
 */
export async function failJob(jobId: string, error: string): Promise<void> {
  await updateDocument(JOBS_COLLECTION, jobId, {
    status: "failed",
    error: error.slice(0, 2000),
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

/**
 * Wrap any async operation with job reporting.
 * Usage: const result = await wrapWithJobReporting(jobContext, async () => { ... });
 *
 * Progress-report failures are logged but do NOT abort the main operation.
 * Completion / start-status failures propagate so the worker knows state is inconsistent.
 */
export async function wrapWithJobReporting<T>(
  context: JobContext | null,
  operation: (reportProgress: (p: number) => void) => Promise<T>,
): Promise<T> {
  if (!context?.isJob) {
    // Not running as job, just execute
    return await operation(() => {}); // No-op progress reporter
  }

  try {
    // Mark as processing + record start time
    await updateDocument(JOBS_COLLECTION, context.jobId, {
      status: "processing",
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const result = await operation((progress) => {
      // Fire-and-forget progress updates — a failed progress report
      // must not kill a long-running operation.
      reportJobProgress(context.jobId, progress).catch((err) => {
        console.error("[jobWorker] progress report failed:", {
          jobId: context.jobId,
          error: err,
        });
      });
    });

    // Mark as complete
    await completeJob(context.jobId, result);

    return result;
  } catch (error) {
    // Mark as failed — guarantee original error propagates even if failJob throws
    const errorMessage = error instanceof Error ? error.message : String(error);
    try {
      await failJob(context.jobId, errorMessage);
    } catch (failErr) {
      console.error(
        "[jobWorker] failJob also failed; original error will still propagate:",
        { jobId: context.jobId, error: failErr },
      );
    }
    throw error;
  }
}
