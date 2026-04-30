/**
 * T14 Job Service — Shared Job-Helpers.
 */

import { ID, Query } from "node-appwrite";
import { z } from "zod";
import {
  createDocument,
  dbId,
  deleteDocument,
  getDocument,
  listDocumentsFull,
  updateDocument,
} from "../../_shared/appwrite-db";
import type { Job, JobStatus } from "../../_shared/jobs/types";

const DATABASE_ID = dbId();
const JOBS_COLLECTION = "jobs";

export interface JobCreateRequest {
  payload: Record<string, unknown>;
}

const JobDocSchema = z.object({
  $id: z.string().min(1),
  function_name: z.string().min(1),
  status: z.enum(["pending", "processing", "completed", "failed", "cancelled"]),
  payload_json: z.string().default("{}"),
  result_json: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  progress: z.number().int().min(0).max(100).nullable().optional(),
  user_id: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
  completed_at: z.string().nullable().optional(),
});

function safeJsonParse(
  raw: string | null | undefined,
  fallback: unknown,
): unknown {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    console.error("[job-service] corrupt JSON in job doc:", raw.slice(0, 200));
    return fallback;
  }
}

function mapJobDoc(doc: Record<string, unknown>): Job {
  const parsed = JobDocSchema.safeParse(doc);
  if (!parsed.success) {
    console.error(
      "[job-service] mapJobDoc validation failed:",
      parsed.error.issues,
    );
    throw new Error(`Invalid job document: ${parsed.error.issues[0]?.message}`);
  }
  const d = parsed.data;

  return {
    $id: d.$id,
    functionName: d.function_name,
    status: d.status as JobStatus,
    payload: safeJsonParse(d.payload_json, {}) as Record<string, unknown>,
    result: safeJsonParse(d.result_json, undefined),
    error: d.error ?? undefined,
    progress: d.progress ?? undefined,
    user_id: d.user_id ?? undefined,
    startedAt: d.started_at ?? undefined,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    completedAt: d.completed_at ?? undefined,
  };
}

export async function getJobById(jobId: string): Promise<Job | null> {
  try {
    const doc = await getDocument(DATABASE_ID, JOBS_COLLECTION, jobId);
    return mapJobDoc(doc);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Appwrite getDocument throws when the document does not exist.
    // Only swallow the "not found" case; propagate real DB errors.
    if (/not found|Document with the requested ID/i.test(msg)) {
      return null;
    }
    console.error(`[job-service] getJobById DB error for ${jobId}:`, msg);
    throw err;
  }
}

export async function createJobEntry(
  functionName: string,
  payload: unknown,
  userId: string,
): Promise<Job> {
  const now = new Date().toISOString();

  const doc = await createDocument(DATABASE_ID, JOBS_COLLECTION, ID.unique(), {
    function_name: functionName,
    status: "pending" as JobStatus,
    payload_json: JSON.stringify(payload),
    user_id: userId,
    progress: 0,
    result_json: null,
    error: null,
    created_at: now,
    updated_at: now,
    completed_at: null,
  });

  return mapJobDoc(doc);
}

export async function startJobDoc(jobId: string): Promise<void> {
  await updateDocument(DATABASE_ID, JOBS_COLLECTION, jobId, {
    status: "processing",
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function failJobDoc(jobId: string, error: string): Promise<void> {
  await updateDocument(DATABASE_ID, JOBS_COLLECTION, jobId, {
    status: "failed",
    error: error.slice(0, 2000),
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function cancelJobDoc(jobId: string): Promise<void> {
  await updateDocument(DATABASE_ID, JOBS_COLLECTION, jobId, {
    status: "cancelled",
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function resetJobForRetry(jobId: string): Promise<void> {
  await updateDocument(DATABASE_ID, JOBS_COLLECTION, jobId, {
    status: "pending",
    error: null,
    progress: 0,
    result_json: null,
    completed_at: null,
    updated_at: new Date().toISOString(),
  });
}

export async function triggerFunctionExecution(
  functionId: string,
  jobId: string,
  payload: unknown,
  userId: string,
): Promise<void> {
  const endpoint =
    process.env.SCRIPTONY_APPWRITE_API_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
    "http://appwrite/v1";
  const apiKey = process.env.APPWRITE_API_KEY;
  const projectId = process.env.APPWRITE_PROJECT_ID;

  if (!apiKey || !projectId) {
    throw new Error("Missing Appwrite credentials");
  }

  const response = await fetch(
    `${endpoint}/functions/${functionId}/executions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Key": apiKey,
        "X-Appwrite-Project": projectId,
      },
      body: JSON.stringify({
        async: true,
        data: JSON.stringify({
          __jobId: jobId,
          __userId: userId,
          ...payload,
        }),
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to trigger function: ${response.status} ${text}`);
  }
}

export async function cleanupOldJobs(
  olderThanHours: number,
): Promise<{ deleted: number; failed: number; capped: boolean }> {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - olderThanHours);

  const oldJobs = await listDocumentsFull(DATABASE_ID, JOBS_COLLECTION, [
    Query.equal("status", ["completed", "failed"]),
    Query.lessThan("updated_at", cutoff.toISOString()),
    Query.limit(100),
  ]);

  let deleted = 0;
  let failed = 0;
  for (const job of oldJobs) {
    try {
      await deleteDocument(DATABASE_ID, JOBS_COLLECTION, job.id as string);
      deleted++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[job-service] cleanup delete failed for ${job.id}: ${msg}`,
      );
    }
  }

  return { deleted, failed, capped: oldJobs.length >= 100 };
}
