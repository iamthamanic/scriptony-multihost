/**
 * Tests for T15 media-worker business logic
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateDocument = vi.fn();
const mockGetDocument = vi.fn();
const mockRequireAuth = vi.fn();
const mockRequireProjectAccess = vi.fn();
const mockSendJson = vi.fn();
const mockSendNotFound = vi.fn();
const mockSendServerError = vi.fn();

vi.mock("../../_shared/appwrite-db", () => ({
  dbId: () => "test-db",
  createDocument: (...args: unknown[]) => mockCreateDocument(...args),
  getDocument: (...args: unknown[]) => mockGetDocument(...args),
}));

vi.mock("../../_shared/http", () => ({
  readJsonBody: async (req: unknown) => {
    const r = req as Record<string, unknown>;
    return r?.body ?? {};
  },
  sendJson: (...args: unknown[]) => mockSendJson(...args),
  sendNotFound: (...args: unknown[]) => mockSendNotFound(...args),
  sendServerError: (...args: unknown[]) => mockSendServerError(...args),
}));

vi.mock("../../_shared/scriptony", () => ({
  requireProjectAccess: async (...args: unknown[]) => {
    const result = await mockRequireProjectAccess(...args);
    if (!result) {
      // Simulate real function: sends 404 before returning null
      mockSendNotFound(args[2], "Project not found or access denied");
    }
    return result;
  },
}));

vi.mock("../../_shared/auth-http", () => ({
  requireAuth: async (...args: unknown[]) => {
    const result = await mockRequireAuth(...args);
    if (!result) {
      // Simulate real function: sends 401 before returning null
      // We do not mock sendUnauthorized here; just return null
    }
    return result;
  },
}));

const { createMediaJob, checkPayloadSize } =
  await import("../_shared/media-job-service");

const { handleDispatch } = await import("../handlers/dispatch");

describe("createMediaJob", () => {
  it("creates a job document and returns job metadata", async () => {
    mockCreateDocument.mockResolvedValueOnce({ $id: "job-new" });
    const result = await createMediaJob(
      "media-worker-mix-audio",
      { session_id: "s1" },
      "u1",
      "p1",
    );
    expect(result.jobId).toBe("job-new");
    expect(result.status).toBe("pending");
    expect(mockCreateDocument).toHaveBeenCalledWith(
      "test-db",
      "jobs",
      expect.any(String),
      expect.objectContaining({
        function_name: "media-worker-mix-audio",
        status: "pending",
        user_id: "u1",
        progress: 0,
      }),
    );
  });
});

describe("checkPayloadSize", () => {
  it("returns ok for small payload", () => {
    const result = checkPayloadSize({ a: 1 }, 1000);
    expect(result.ok).toBe(true);
  });

  it("returns not ok for oversized payload", () => {
    const big = { data: "x".repeat(10000) };
    const result = checkPayloadSize(big, 100);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.size).toBeGreaterThan(100);
    }
  });
});

describe("handleDispatch", () => {
  const makeReq = (body: Record<string, unknown>) =>
    ({ body, method: "POST" }) as never;

  beforeEach(() => {
    mockRequireProjectAccess.mockReset();
    mockSendJson.mockClear();
    mockSendNotFound.mockClear();
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValueOnce(null);
    await handleDispatch(
      makeReq({ project_id: "p1" }),
      {} as never,
      "mix-audio",
    );
    expect(mockSendJson).not.toHaveBeenCalled();
  });

  it("returns 422 for unsupported action", async () => {
    mockRequireAuth.mockResolvedValueOnce({ id: "u1" });
    await handleDispatch(
      makeReq({ project_id: "p1" }),
      {} as never,
      "not-real",
    );
    expect(mockSendJson).toHaveBeenCalledWith(
      expect.anything(),
      422,
      expect.objectContaining({
        error: expect.stringContaining("Unsupported"),
      }),
    );
  });

  it("returns 400 for invalid payload via Zod", async () => {
    mockRequireAuth.mockResolvedValueOnce({ id: "u1" });
    await handleDispatch(
      makeReq({ project_id: "p1" }),
      {} as never,
      "mix-audio",
    );
    expect(mockSendJson).toHaveBeenCalledWith(
      expect.anything(),
      400,
      expect.objectContaining({
        error: expect.stringContaining("Invalid request body"),
      }),
    );
  });

  it("returns 404 when user lacks project access", async () => {
    mockRequireAuth.mockResolvedValueOnce({ id: "u1" });
    mockRequireProjectAccess.mockResolvedValueOnce(null);
    await handleDispatch(
      makeReq({ project_id: "p1", session_id: "s1" }),
      {} as never,
      "mix-audio",
    );
    expect(mockRequireProjectAccess).toHaveBeenCalledWith(
      "p1",
      "u1",
      expect.anything(),
    );
    // requireProjectAccess sends 404 internally; handler just returns
    expect(mockSendJson).not.toHaveBeenCalled();
  });

  it("returns 413 for oversized payload", async () => {
    mockRequireAuth.mockResolvedValueOnce({ id: "u1" });
    mockRequireProjectAccess.mockResolvedValueOnce({ id: "p1" });
    await handleDispatch(
      makeReq({ project_id: "p1", session_id: "x".repeat(100_000) }),
      {} as never,
      "mix-audio",
    );
    expect(mockSendJson).toHaveBeenCalledWith(
      expect.anything(),
      413,
      expect.objectContaining({ error: "Payload too large" }),
    );
  });

  it("returns 202 with jobId on success", async () => {
    mockRequireAuth.mockResolvedValueOnce({ id: "u1" });
    mockRequireProjectAccess.mockResolvedValueOnce({ id: "p1" });
    mockCreateDocument.mockResolvedValueOnce({ $id: "job-123" });
    await handleDispatch(
      makeReq({ project_id: "p1", session_id: "s1" }),
      {} as never,
      "mix-audio",
    );
    expect(mockSendJson).toHaveBeenCalledWith(
      expect.anything(),
      202,
      expect.objectContaining({
        jobId: "job-123",
        status: "pending",
        action: "mix-audio",
      }),
    );
  });
});
