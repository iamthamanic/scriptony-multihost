/**
 * Tests for shared requireJobOwner (DI)
 */

import { describe, expect, it, vi } from "vitest";

const mockRequireUserBootstrap = vi.hoisted(() => vi.fn());
const mockSendJson = vi.hoisted(() => vi.fn());
const mockSendNotFound = vi.hoisted(() => vi.fn());
const mockSendUnauthorized = vi.hoisted(() => vi.fn());

vi.mock("../http", () => ({
  sendJson: (...args: unknown[]) => mockSendJson(...args),
  sendNotFound: (...args: unknown[]) => mockSendNotFound(...args),
  sendUnauthorized: (...args: unknown[]) => mockSendUnauthorized(...args),
}));

vi.mock("../auth", () => ({
  requireUserBootstrap: (...args: unknown[]) =>
    mockRequireUserBootstrap(...args),
}));

const { requireJobOwner } = await import("../job-auth");

describe("requireJobOwner", () => {
  it("returns null and sends 401 when not authenticated", async () => {
    mockRequireUserBootstrap.mockResolvedValueOnce(null);
    const result = await requireJobOwner(
      {} as never,
      {} as never,
      "job-1",
      vi.fn(),
    );
    expect(result).toBeNull();
    expect(mockSendUnauthorized).toHaveBeenCalled();
  });

  it("returns job+user when user owns job", async () => {
    mockRequireUserBootstrap.mockResolvedValueOnce({ user: { id: "u1" } });
    const result = await requireJobOwner(
      {} as never,
      {} as never,
      "job-1",
      vi.fn().mockResolvedValueOnce({
        $id: "job-1",
        user_id: "u1",
        status: "pending",
      }),
    );
    expect(result?.job.$id).toBe("job-1");
    expect(result?.user.id).toBe("u1");
  });

  it("returns 403 when user does not own job", async () => {
    mockRequireUserBootstrap.mockResolvedValueOnce({ user: { id: "u2" } });
    const result = await requireJobOwner(
      {} as never,
      {} as never,
      "job-1",
      vi.fn().mockResolvedValueOnce({
        $id: "job-1",
        user_id: "u1",
        status: "pending",
      }),
    );
    expect(result).toBeNull();
    expect(mockSendJson).toHaveBeenCalledWith(
      expect.anything(),
      403,
      expect.objectContaining({ error: expect.stringContaining("Forbidden") }),
    );
  });

  it("returns 403 when job has no owner (fail-closed)", async () => {
    mockRequireUserBootstrap.mockResolvedValueOnce({ user: { id: "u1" } });
    const result = await requireJobOwner(
      {} as never,
      {} as never,
      "job-1",
      vi.fn().mockResolvedValueOnce({
        $id: "job-1",
        user_id: undefined,
        status: "pending",
      }),
    );
    expect(result).toBeNull();
    expect(mockSendJson).toHaveBeenCalledWith(
      expect.anything(),
      403,
      expect.objectContaining({ error: expect.stringContaining("Forbidden") }),
    );
  });

  it("returns 404 when job not found", async () => {
    mockRequireUserBootstrap.mockResolvedValueOnce({ user: { id: "u1" } });
    const result = await requireJobOwner(
      {} as never,
      {} as never,
      "missing",
      vi.fn().mockResolvedValueOnce(null),
    );
    expect(result).toBeNull();
    expect(mockSendNotFound).toHaveBeenCalledWith(
      expect.anything(),
      "Job not found",
    );
  });
});
