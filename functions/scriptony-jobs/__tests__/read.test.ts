/**
 * Tests for T14 job read handler (zombie-job prevention)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireAuth = vi.fn();
const mockSendJson = vi.fn();
const mockSendServerError = vi.fn();
const mockCreateJobEntry = vi.fn();
const mockTriggerFunctionExecution = vi.fn();
const mockFailJobDoc = vi.fn();

vi.mock("../../_shared/auth-http", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

vi.mock("../../_shared/http", () => ({
  readJsonBody: async (req: unknown) => {
    const r = req as Record<string, unknown>;
    return r?.body ?? {};
  },
  sendJson: (...args: unknown[]) => mockSendJson(...args),
  sendServerError: (...args: unknown[]) => mockSendServerError(...args),
}));

vi.mock("../_shared/job-service", () => ({
  createJobEntry: (...args: unknown[]) => mockCreateJobEntry(...args),
  failJobDoc: (...args: unknown[]) => mockFailJobDoc(...args),
  triggerFunctionExecution: (...args: unknown[]) =>
    mockTriggerFunctionExecution(...args),
}));

vi.mock("../config/supported-jobs", () => ({
  SUPPORTED_JOBS: {
    "style-guide": {
      functionId: "scriptony-style-guide",
      timeoutMs: 120_000,
      requiresAuth: true,
    },
  },
}));

const { handleCreateJob } = await import("../handlers/read");

describe("handleCreateJob", () => {
  const makeReq = (body: Record<string, unknown>) =>
    ({ body, method: "POST" }) as never;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSendJson.mockClear();
    mockFailJobDoc.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks job as failed when trigger fails (zombie-job prevention)", async () => {
    mockRequireAuth.mockResolvedValueOnce({ id: "u1" });
    mockCreateJobEntry.mockResolvedValueOnce({
      $id: "job-1",
      createdAt: "2024-01-01T00:00:00Z",
    });
    mockTriggerFunctionExecution.mockRejectedValueOnce(
      new Error("trigger failed"),
    );

    await handleCreateJob(makeReq({ payload: {} }), {} as never, "style-guide");

    // Wait for the catch handler promise
    await vi.runAllTimersAsync();

    expect(mockSendJson).toHaveBeenCalledWith(
      expect.anything(),
      201,
      expect.objectContaining({ jobId: "job-1" }),
    );
    expect(mockFailJobDoc).toHaveBeenCalledWith(
      "job-1",
      expect.stringContaining("trigger failed"),
    );
  });
});
