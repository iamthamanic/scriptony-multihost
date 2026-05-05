/**
 * T17 Tests fuer scriptony-worldbuilding entrypoint und handlers
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestLike, ResponseLike } from "../../_shared/http";

const { mockRequestGraphql, mockRequireUserBootstrap } = vi.hoisted(() => ({
  mockRequestGraphql: vi.fn(),
  mockRequireUserBootstrap: vi.fn(),
}));

vi.mock("../../_shared/graphql-compat", () => ({
  requestGraphql: (...args: unknown[]) => mockRequestGraphql(...args),
}));

vi.mock("../../_shared/auth", () => ({
  requireUserBootstrap: (...args: unknown[]) =>
    mockRequireUserBootstrap(...args),
}));

const { default: worldCategoriesHandler } =
  await import("../worlds/[id]/categories/index");

function makeReq(
  params: Record<string, string>,
  method = "GET",
  body?: unknown,
): RequestLike {
  return { params, method, body } as RequestLike;
}

const mockRes = {
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
} as unknown as ResponseLike;

describe("worldCategoriesHandler", () => {
  beforeEach(() => {
    mockRequestGraphql.mockReset();
    mockRequireUserBootstrap.mockReset();
    (mockRes.status as ReturnType<typeof vi.fn>).mockClear();
    (mockRes.json as ReturnType<typeof vi.fn>).mockClear();
  });

  it("returns categories for GET (T17 BUGFIX — Route existiert)", async () => {
    mockRequireUserBootstrap.mockResolvedValueOnce({
      user: { id: "u1" },
      organizationId: "o1",
    });
    mockRequestGraphql.mockResolvedValueOnce({
      world_categories: [
        {
          id: "c1",
          world_id: "w1",
          name: "Flora",
          world_items: [],
        },
      ],
    });

    await worldCategoriesHandler(makeReq({ id: "w1" }), mockRes);
    expect(mockRes.status as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      200,
    );
    expect(mockRes.json as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      expect.objectContaining({ categories: expect.any(Array) }),
    );
  });

  it("creates category for POST", async () => {
    mockRequireUserBootstrap.mockResolvedValueOnce({
      user: { id: "u1" },
      organizationId: "o1",
    });
    mockRequestGraphql.mockResolvedValueOnce({
      insert_world_categories_one: {
        id: "c2",
        world_id: "w1",
        name: "Fauna",
      },
    });

    await worldCategoriesHandler(
      makeReq({ id: "w1" }, "POST", { name: "Fauna" }),
      mockRes,
    );
    expect(mockRes.status as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      201,
    );
    expect(mockRes.json as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      expect.objectContaining({ category: expect.any(Object) }),
    );
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireUserBootstrap.mockResolvedValueOnce(null);
    const req = makeReq({ id: "w1" });
    (req as Record<string, unknown>).headers = {};
    await worldCategoriesHandler(req, mockRes);
    expect(mockRes.status as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      401,
    );
  });
});
