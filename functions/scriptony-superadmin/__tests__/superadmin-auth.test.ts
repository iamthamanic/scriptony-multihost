/**
 * T16 Tests fuer Superadmin Auth Guard
 */

import { describe, expect, it, vi } from "vitest";

const mockRequireUserBootstrap = vi.fn();
const mockSendJson = vi.fn();
const mockSendUnauthorized = vi.fn();
const mockSendForbidden = vi.fn();

vi.mock("../../_shared/auth", () => ({
  requireUserBootstrap: (...args: unknown[]) =>
    mockRequireUserBootstrap(...args),
}));

vi.mock("../../_shared/http", () => ({
  sendJson: (...args: unknown[]) => mockSendJson(...args),
  sendUnauthorized: (...args: unknown[]) => mockSendUnauthorized(...args),
  sendForbidden: (...args: unknown[]) => mockSendForbidden(...args),
}));

const { requireSuperadmin } = await import("../_shared");

describe("requireSuperadmin", () => {
  it("returns bootstrap for superadmin", async () => {
    mockRequireUserBootstrap.mockResolvedValueOnce({
      user: {
        id: "u1",
        metadata: { role: "superadmin" },
        defaultRole: "superadmin",
      },
    });
    const result = await requireSuperadmin({} as never, {} as never);
    expect(result?.user.id).toBe("u1");
  });

  it("returns null for non-superadmin (fail-closed)", async () => {
    mockRequireUserBootstrap.mockResolvedValueOnce({
      user: {
        id: "u2",
        metadata: {},
        defaultRole: "user",
      },
    });
    const result = await requireSuperadmin({} as never, {} as never);
    expect(result).toBeNull();
    expect(mockSendForbidden).toHaveBeenCalled();
  });

  it("returns null when not authenticated", async () => {
    mockRequireUserBootstrap.mockResolvedValueOnce(null);
    const result = await requireSuperadmin({} as never, {} as never);
    expect(result).toBeNull();
    expect(mockSendUnauthorized).toHaveBeenCalled();
  });
});
