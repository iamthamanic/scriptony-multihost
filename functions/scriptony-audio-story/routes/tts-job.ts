/**
 * TTS-Job-Helpers — Self-contained, kein Import aus anderen Function-Modulen.
 *
 * T31: Module-Independence. Direkter Appwrite-DB-Zugriff.
 */

import { createHmac } from "node:crypto";
import { Client, Databases, ID } from "node-appwrite";
import process from "node:process";

// =============================================================================
// Appwrite Client
// =============================================================================

export function getDbClient() {
  const endpoint =
    process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
    process.env.APPWRITE_ENDPOINT ||
    "";
  const projectId =
    process.env.APPWRITE_FUNCTION_PROJECT_ID ||
    process.env.APPWRITE_PROJECT_ID ||
    "";
  const apiKey = process.env.APPWRITE_API_KEY || "";

  if (!endpoint || !projectId || !apiKey) {
    throw new Error("Missing Appwrite credentials");
  }

  return new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);
}

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "scriptony";
const JOBS_COLLECTION = "jobs";

// =============================================================================
// Types
// =============================================================================

type JobStatus =
  | "pending"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface Job {
  $id: string;
  function_name: string;
  status: JobStatus;
  payload_json: string;
  result_json: string | null;
  error: string | null;
  progress: number | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

function mapJobDoc(doc: Record<string, unknown>): Job {
  return {
    $id: String(doc.$id),
    function_name: String(doc.function_name || ""),
    status: String(doc.status || "pending") as JobStatus,
    payload_json: String(doc.payload_json || "{}"),
    result_json: doc.result_json == null ? null : String(doc.result_json),
    error: doc.error == null ? null : String(doc.error),
    progress: typeof doc.progress === "number" ? doc.progress : null,
    user_id: doc.user_id == null ? null : String(doc.user_id),
    created_at: String(doc.$createdAt || doc.created_at || ""),
    updated_at: String(doc.$updatedAt || doc.updated_at || ""),
  };
}

// =============================================================================
// Job CRUD
// =============================================================================

export async function createTtsJob(
  userId: string,
  payload: Record<string, unknown>,
): Promise<Job> {
  const client = getDbClient();
  const databases = new Databases(client);
  const now = new Date().toISOString();

  const doc = await databases.createDocument(
    DATABASE_ID,
    JOBS_COLLECTION,
    ID.unique(),
    {
      function_name: "audio-process",
      status: "queued" as JobStatus,
      payload_json: JSON.stringify(payload),
      user_id: userId,
      progress: 0,
      result_json: null,
      error: null,
      created_at: now,
      updated_at: now,
      completed_at: null,
    },
  );

  return mapJobDoc(doc);
}

export async function getJobById(jobId: string): Promise<Job | null> {
  try {
    const client = getDbClient();
    const databases = new Databases(client);
    const doc = await databases.getDocument(
      DATABASE_ID,
      JOBS_COLLECTION,
      jobId,
    );
    return mapJobDoc(doc);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/not found/i.test(msg)) return null;
    throw err;
  }
}

export async function markJobFailed(
  jobId: string,
  error: string,
): Promise<void> {
  const client = getDbClient();
  const databases = new Databases(client);
  const now = new Date().toISOString();

  await databases.updateDocument(DATABASE_ID, JOBS_COLLECTION, jobId, {
    status: "failed",
    error: error.slice(0, 2000),
    completed_at: now,
    updated_at: now,
  });
}

export async function markJobCompleted(
  jobId: string,
  result: Record<string, unknown>,
): Promise<void> {
  const client = getDbClient();
  const databases = new Databases(client);
  const now = new Date().toISOString();

  await databases.updateDocument(DATABASE_ID, JOBS_COLLECTION, jobId, {
    status: "completed",
    result_json: JSON.stringify(result),
    completed_at: now,
    updated_at: now,
  });
}

export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
): Promise<void> {
  const client = getDbClient();
  const databases = new Databases(client);
  await databases.updateDocument(DATABASE_ID, JOBS_COLLECTION, jobId, {
    status,
    updated_at: new Date().toISOString(),
  });
}

function signJobPayload(jobId: string, userId: string): string {
  const secret = process.env.TTS_JOB_SECRET || "";
  if (!secret) {
    throw new Error("Missing TTS_JOB_SECRET for job signature");
  }
  return createHmac("sha256", secret)
    .update(`${jobId}:${userId}`)
    .digest("hex");
}

/**
 * Triggert eine Appwrite Function Execution.
 * Uebergibt NUR __jobId/__userId/__signature; der Worker liest
 * den vollstaendigen Payload serverseitig aus der jobs-Collection.
 */

export async function triggerFunctionExecution(
  functionId: string,
  jobId: string,
  userId: string,
): Promise<void> {
  const endpoint =
    process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
    process.env.APPWRITE_ENDPOINT ||
    "";
  // T31: Strengte lokale Endpoint-Erkennung
  let parsedEndpoint: URL;
  try {
    parsedEndpoint = new URL(endpoint);
  } catch {
    throw new Error("Invalid APPWRITE_ENDPOINT URL format");
  }
  const isLocal =
    ["localhost", "127.0.0.1", "[::1]"].includes(parsedEndpoint.hostname) ||
    parsedEndpoint.hostname === "[::1]";
  if (!endpoint || (!isLocal && !endpoint.startsWith("https://"))) {
    throw new Error(
      "Secure endpoint required: set APPWRITE_FUNCTION_API_ENDPOINT or APPWRITE_ENDPOINT to https://...",
    );
  }
  const apiKey = process.env.APPWRITE_API_KEY;
  const projectId =
    process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;

  if (!apiKey || !projectId) {
    throw new Error("Missing Appwrite credentials");
  }

  const res = await fetch(`${endpoint}/v1/functions/${functionId}/executions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Key": apiKey,
      "X-Appwrite-Project": projectId,
    },
    body: JSON.stringify({
      async: true,
      path: "/tts/job",
      method: "POST",
      body: JSON.stringify({
        __jobId: jobId,
        __userId: userId,
        __signature: signJobPayload(jobId, userId),
      }),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to trigger function: ${res.status} ${text}`);
  }
}
