/**
 * Tests for T14 job-auth ownership helper
 */

import { describe, expect, it, vi } from "vitest";

const mockGetJobById = vi.fn();
const mockRequireUserBootstrap = vi.fn();
const mockSendJson = vi.fn();
const mockSendNotFound = vi.fn();
const mockSendUnauthorized = vi.fn();

vi.mock("../../_shared/auth", () => ({
  requireUserBootstrap: (...args: unknown[]) =>
    mockRequireUserBootstrap(...args),
}));

vi.mock("../_shared/job-service", () => ({
  getJobById: (...args: unknown[]) => mockGetJobById(...args),
}));

vi.mock("../../_shared/http", () => ({
  sendJson: (...args: unknown[]) => mockSendJson(...args),
  sendNotFound: (...args: unknown[]) => mockSendNotFound(...args),
  sendUnauthorized: (...args: unknown[]) => mockSendUnauthorized(...args),
}));

const { requireJobOwner } = await import("../_shared/job-auth");

describe("requireJobOwner", () => {
  it("returns null and sends 401 when not authenticated", async () => {
    mockRequireUserBootstrap.mockResolvedValueOnce(null);
    const result = await requireJobOwner({} as never, {} as never, "job-1");
    expect(result).toBeNull();
    expect(mockSendUnauthorized).toHaveBeenCalled();
  });

  it("returns job+user when user owns job", async () => {
    mockRequireUserBootstrap.mockResolvedValueOnce({
      user: { id: "u1" },
    });
    mockGetJobById.mockResolvedValueOnce({
      $id: "job-1",
      user_id: "u1",
      status: "pending",
    });

    const result = await requireJobOwner({} as never, {} as never, "job-1");
    expect(result?.job.$id).toBe("job-1");
    expect(result?.user.id).toBe("u1");
  });

  it("returns 403 when user does not own job", async () => {
    mockRequireUserBootstrap.mockResolvedValueOnce({
      user: { id: "u2" },
    });
    mockGetJobById.mockResolvedValueOnce({
      $id: "job-1",
      user_id: "u1",
      status: "pending",
    });

    const result = await requireJobOwner({} as never, {} as never, "job-1");
    expect(result).toBeNull();
    expect(mockSendJson).toHaveBeenCalledWith(
      expect.anything(),
      403,
      expect.objectContaining({ error: expect.stringContaining("Forbidden") }),
    );
  });

  it("returns 403 when job has no owner (fail-closed)", async () => {
    mockRequireUserBootstrap.mockResolvedValueOnce({
      user: { id: "u1" },
    });
    mockGetJobById.mockResolvedValueOnce({
      $id: "job-1",
      user_id: undefined,
      status: "pending",
    });

    const result = await requireJobOwner({} as never, {} as never, "job-1");
    expect(result).toBeNull();
    expect(mockSendJson).toHaveBeenCalledWith(
      expect.anything(),
      403,
      expect.objectContaining({ error: expect.stringContaining("Forbidden") }),
    );
  });

  it("returns 404 when job not found", async () => {
    mockRequireUserBootstrap.mockResolvedValueOnce({
      user: { id: "u1" },
    });
    mockGetJobById.mockResolvedValueOnce(null);

    const result = await requireJobOwner({} as never, {} as never, "missing");
    expect(result).toBeNull();
    expect(mockSendNotFound).toHaveBeenCalledWith(
      expect.anything(),
      "Job not found",
    );
  });
});
