/**
 * Tests for T14 job-auth ownership helper (thin wrapper around _shared)
 */

import { describe, expect, it, vi } from "vitest";

const mockBaseRequireJobOwner = vi.fn();

vi.mock("../../_shared/job-auth", () => ({
  requireJobOwner: (...args: unknown[]) => mockBaseRequireJobOwner(...args),
}));

const { requireJobOwner } = await import("../_shared/job-auth");

describe("requireJobOwner wrapper", () => {
  it("forwards to _shared requireJobOwner with local getJobById", async () => {
    mockBaseRequireJobOwner.mockResolvedValueOnce({
      user: { id: "u1" },
      job: { $id: "job-1" },
    });
    const result = await requireJobOwner(
      "req" as never,
      "res" as never,
      "job-1",
    );
    expect(result?.user.id).toBe("u1");
    expect(mockBaseRequireJobOwner).toHaveBeenCalledWith(
      "req",
      "res",
      "job-1",
      expect.any(Function), // getJobById
    );
  });
});
