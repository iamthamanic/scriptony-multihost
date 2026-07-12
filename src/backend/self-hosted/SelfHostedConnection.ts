/**
 * Self-hosted Appwrite connection model (T41).
 */

export interface SelfHostedConnection {
  id: string;
  name: string;
  endpoint: string;
  projectId: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface TestSelfHostedConnectionInput {
  endpoint: string;
  projectId: string;
}

export interface TestConnectionResult {
  ok: boolean;
  message?: string;
}

export function normalizeConnectionError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function trimEndpoint(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, "");
}
