/**
 * T15 Media Job Service — Direct DB Write to jobs Collection.
 *
 * SOLID/DIP: Nutzt Appwrite DB Abstraktion, nicht direkte SDK-Calls.
 * DRY: Wiederverwendet createDocument aus _shared/appwrite-db.
 * KISS: Direkter DB-Write, kein HTTP-Roundtrip zu scriptony-jobs.
 */

import { Buffer } from "node:buffer";
import { ID } from "node-appwrite";
import { createDocument, dbId } from "../../_shared/appwrite-db";

const DATABASE_ID = dbId();
const JOBS_COLLECTION = "jobs";

/**
 * Create a media-worker job entry in the jobs collection.
 * Returns immediately — the actual work happens asynchronously.
 *
 * @param jobType — Media action job type (e.g. media-worker-mix-audio)
 * @param payload — Action-specific payload (must be serializable, < 100 KB)
 * @param userId — Authenticated user ID
 * @param projectId — Project context for access checks
 */
export async function createMediaJob(
  jobType: string,
  payload: Record<string, unknown>,
  userId: string,
  projectId: string,
): Promise<{
  jobId: string;
  status: string;
  createdAt: string;
}> {
  const now = new Date().toISOString();

  const doc = await createDocument(DATABASE_ID, JOBS_COLLECTION, ID.unique(), {
    function_name: jobType,
    status: "pending",
    payload_json: JSON.stringify({ ...payload, project_id: projectId }),
    user_id: userId,
    project_id: projectId,
    progress: 0,
    result_json: null,
    error: null,
    created_at: now,
    updated_at: now,
    completed_at: null,
  });

  return {
    jobId: doc.$id,
    status: "pending",
    createdAt: now,
  };
}

/**
 * Check if a payload exceeds the size limit.
 * Uses Buffer.byteLength for Node.js compatibility.
 */
export function checkPayloadSize(
  payload: Record<string, unknown>,
  limitBytes: number,
): { ok: true } | { ok: false; size: number; limit: number } {
  const size = Buffer.byteLength(JSON.stringify(payload), "utf8");
  if (size > limitBytes) {
    return { ok: false, size, limit: limitBytes };
  }
  return { ok: true };
}
