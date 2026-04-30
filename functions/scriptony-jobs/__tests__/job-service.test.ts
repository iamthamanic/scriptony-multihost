/**
 * Tests for T14 job-service business logic
 */

import { describe, expect, it, vi } from "vitest";

// Mock appwrite-db before importing job-service
const mockGetDocument = vi.fn();
const mockCreateDocument = vi.fn();
const mockUpdateDocument = vi.fn();
const mockDeleteDocument = vi.fn();
const mockListDocumentsFull = vi.fn();

vi.mock("../../_shared/appwrite-db", () => ({
  dbId: () => "test-db",
  getDocument: (...args: unknown[]) => mockGetDocument(...args),
  createDocument: (...args: unknown[]) => mockCreateDocument(...args),
  updateDocument: (...args: unknown[]) => mockUpdateDocument(...args),
  deleteDocument: (...args: unknown[]) => mockDeleteDocument(...args),
  listDocumentsFull: (...args: unknown[]) => mockListDocumentsFull(...args),
}));

// Must import after mock
const {
  getJobById,
  createJobEntry,
  failJobDoc,
  cancelJobDoc,
  resetJobForRetry,
  cleanupOldJobs,
} = await import("../_shared/job-service");

describe("getJobById", () => {
  it("returns mapped job when document exists", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "job-1",
      function_name: "test",
      status: "pending",
      payload_json: '{"a":1}',
      user_id: "user-1",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });

    const job = await getJobById("job-1");
    expect(job).not.toBeNull();
    expect(job?.$id).toBe("job-1");
    expect(job?.functionName).toBe("test");
    expect(job?.payload).toEqual({ a: 1 });
    expect(job?.user_id).toBe("user-1");
  });

  it("returns null when document not found", async () => {
    mockGetDocument.mockRejectedValueOnce(
      new Error("Document with the requested ID could not be found"),
    );
    const job = await getJobById("missing");
    expect(job).toBeNull();
  });

  it("throws on real DB errors (not 404)", async () => {
    mockGetDocument.mockRejectedValueOnce(new Error("Connection refused"));
    await expect(getJobById("job-1")).rejects.toThrow("Connection refused");
  });

  it("throws when document fails Zod validation", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "job-bad",
      // missing function_name and status
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });
    await expect(getJobById("job-bad")).rejects.toThrow(/Invalid job document/);
  });

  it("falls back gracefully on corrupt payload_json", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "job-bad-json",
      function_name: "test",
      status: "completed",
      payload_json: "not-json",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });

    const job = await getJobById("job-bad-json");
    expect(job).not.toBeNull();
    expect(job?.payload).toEqual({}); // safe fallback
  });
});

describe("createJobEntry", () => {
  it("creates job and returns mapped doc", async () => {
    mockCreateDocument.mockResolvedValueOnce({
      $id: "job-new",
      function_name: "image-generate",
      status: "pending",
      payload_json: '{"projectId":"p1"}',
      user_id: "u1",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });

    const job = await createJobEntry(
      "image-generate",
      { projectId: "p1" },
      "u1",
    );
    expect(job.$id).toBe("job-new");
    expect(job.status).toBe("pending");
    expect(job.user_id).toBe("u1");
  });
});

describe("failJobDoc", () => {
  it("updates job to failed with truncated error", async () => {
    mockUpdateDocument.mockResolvedValueOnce({});
    await failJobDoc("job-1", "something failed");
    expect(mockUpdateDocument).toHaveBeenCalledWith(
      "test-db",
      "jobs",
      "job-1",
      expect.objectContaining({ status: "failed", error: "something failed" }),
    );
  });
});

describe("cancelJobDoc", () => {
  it("updates job to cancelled", async () => {
    mockUpdateDocument.mockResolvedValueOnce({});
    await cancelJobDoc("job-1");
    expect(mockUpdateDocument).toHaveBeenCalledWith(
      "test-db",
      "jobs",
      "job-1",
      expect.objectContaining({ status: "cancelled" }),
    );
  });
});

describe("resetJobForRetry", () => {
  it("resets job to pending", async () => {
    mockUpdateDocument.mockResolvedValueOnce({});
    await resetJobForRetry("job-1");
    expect(mockUpdateDocument).toHaveBeenCalledWith(
      "test-db",
      "jobs",
      "job-1",
      expect.objectContaining({ status: "pending", error: null }),
    );
  });
});

describe("cleanupOldJobs", () => {
  it("returns deleted count and capped flag", async () => {
    mockListDocumentsFull.mockResolvedValueOnce([{ id: "j1" }, { id: "j2" }]);
    mockDeleteDocument.mockResolvedValueOnce({});
    mockDeleteDocument.mockResolvedValueOnce({});

    const result = await cleanupOldJobs(24);
    expect(result.deleted).toBe(2);
    expect(result.capped).toBe(false);
  });

  it("sets capped=true when limit reached", async () => {
    const docs = Array.from({ length: 100 }, (_, i) => ({ id: `j${i}` }));
    mockListDocumentsFull.mockResolvedValueOnce(docs);
    mockDeleteDocument.mockResolvedValue({});

    const result = await cleanupOldJobs(24);
    expect(result.capped).toBe(true);
  });
});
