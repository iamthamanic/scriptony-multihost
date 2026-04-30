/**
 * Tests for T14 job cleanup handler
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireAuth = vi.fn();
const mockSendJson = vi.fn();
const mockSendServerError = vi.fn();
const mockCleanupOldJobs = vi.fn();

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
  cleanupOldJobs: (...args: unknown[]) => mockCleanupOldJobs(...args),
}));

const { handleCleanup } = await import("../handlers/cleanup");

describe("handleCleanup", () => {
  const makeReq = (body: Record<string, unknown>) =>
    ({ body, method: "POST" }) as never;

  beforeEach(() => {
    mockSendJson.mockClear();
  });

  it("returns 403 for non-superadmin", async () => {
    mockRequireAuth.mockResolvedValueOnce({
      id: "u1",
      defaultRole: "user",
    });
    await handleCleanup(makeReq({}), {} as never);
    expect(mockSendJson).toHaveBeenCalledWith(
      expect.anything(),
      403,
      expect.objectContaining({
        error: expect.stringContaining("superadmin"),
      }),
    );
  });

  it("allows superadmin to cleanup", async () => {
    mockRequireAuth.mockResolvedValueOnce({
      id: "u1",
      defaultRole: "superadmin",
    });
    mockCleanupOldJobs.mockResolvedValueOnce({
      deleted: 5,
      failed: 0,
      capped: false,
    });
    await handleCleanup(makeReq({}), {} as never);
    expect(mockSendJson).toHaveBeenCalledWith(
      expect.anything(),
      200,
      expect.objectContaining({ success: true, deleted: 5 }),
    );
  });
});
