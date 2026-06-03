import { beforeEach, describe, expect, it, vi } from "vitest";

const mockList = vi.fn(
  async (_projectId: string) => [] as import("@/lib/types").Character[],
);

vi.mock("./runtime-dispatch", () => ({
  dispatchByRuntime: vi.fn(
    (_cloud: () => Promise<unknown>, local: () => Promise<unknown>) => local(),
  ),
}));

vi.mock("./characters-local", () => ({
  localGetCharacters: (projectId: string) => mockList(projectId),
  localGetCharacter: vi.fn(),
  localCreateCharacter: vi.fn(),
  localUpdateCharacter: vi.fn(),
  localDeleteCharacter: vi.fn(),
}));

import { getCharacters } from "./characters-adapter";

describe("characters-adapter", () => {
  beforeEach(() => {
    mockList.mockClear();
  });

  it("getCharacters uses local path when dispatch selects local", async () => {
    mockList.mockResolvedValueOnce([
      {
        id: "c1",
        projectId: "proj_1",
        name: "Hero",
        role: "protagonist",
        createdAt: "",
        updatedAt: "",
      },
    ]);
    const chars = await getCharacters("proj_1");
    expect(mockList).toHaveBeenCalledWith("proj_1");
    expect(chars).toHaveLength(1);
  });
});
