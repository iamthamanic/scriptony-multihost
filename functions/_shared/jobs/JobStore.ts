/**
 * Job persistence abstraction (T43) — Appwrite vs SQLite sidecar.
 */

import type { Job, JobStatus } from "./types";

export interface JobStore {
  getById(jobId: string): Promise<Job | null>;
  updateStatus(
    jobId: string,
    status: JobStatus,
    patch?: { result?: unknown; error?: string; progress?: number },
  ): Promise<void>;
}
