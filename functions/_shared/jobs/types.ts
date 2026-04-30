/**
 * Job Queue Types - Shared between all functions
 * SOLID: Interface Segregation for long-running operations
 */

export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface Job<T = unknown> {
  $id: string;
  functionName: string;
  status: JobStatus;
  payload: unknown;
  result?: T;
  error?: string;
  progress?: number; // 0-100 for progress bars
  user_id?: string; // T14: Ownership for auth checks
  startedAt?: string; // T14: ISO-8601 when status changed to processing
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobCreateRequest {
  functionName: string;
  payload: unknown;
}

export interface JobStatusResponse<T = unknown> {
  jobId: string;
  status: JobStatus;
  progress?: number;
  result?: T;
  error?: string;
  createdAt: string;
  updatedAt: string;
}
