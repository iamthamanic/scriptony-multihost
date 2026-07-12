/**
 * Unit tests for in-scene text block reorder persistence.
 * Location: src/lib/mve/__tests__/reorder-text-block-in-scene.test.ts
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";

vi.mock("@/lib/api-adapter/mve-adapter", () => ({
  getMveLines: vi.fn(),
  updateMveLine: vi.fn(),
}));

import { getMveLines, updateMveLine } from "@/lib/api-adapter/mve-adapter";
import { reorderTextBlockInScene } from "../reorder-text-block-in-scene";

function line(id: string, orderIndex: number): MveLine {
  return {
    id,
    sceneId: "scene-1",
    orderIndex,
    type: "dialogue",
    status: "draft",
    characterId: "char-1",
    text: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("reorderTextBlockInScene", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists only the lines whose orderIndex changed", async () => {
    const lines = [line("l1", 0), line("l2", 1), line("l3", 2)];
    vi.mocked(getMveLines).mockResolvedValue(lines);
    vi.mocked(updateMveLine).mockImplementation(
      async (id: string, patch) =>
        ({ ...lines.find((l) => l.id === id)!, ...patch }) as MveLine,
    );

    const result = await reorderTextBlockInScene({
      projectId: "proj-1",
      lineId: "l3",
      sceneId: "scene-1",
      targetIndex: 0,
    });

    expect(result.reordered).toBe(true);
    expect(updateMveLine).toHaveBeenCalledTimes(3);
    expect(updateMveLine).toHaveBeenCalledWith(
      "l3",
      expect.objectContaining({ orderIndex: 0 }),
    );
    expect(updateMveLine).toHaveBeenCalledWith(
      "l1",
      expect.objectContaining({ orderIndex: 1 }),
    );
    expect(updateMveLine).toHaveBeenCalledWith(
      "l2",
      expect.objectContaining({ orderIndex: 2 }),
    );
  });

  it("is a no-op when the line is already at the target position", async () => {
    const lines = [line("l1", 0), line("l2", 1)];
    vi.mocked(getMveLines).mockResolvedValue(lines);

    const result = await reorderTextBlockInScene({
      projectId: "proj-1",
      lineId: "l1",
      sceneId: "scene-1",
      targetIndex: 0,
    });

    expect(result.reordered).toBe(false);
    expect(updateMveLine).not.toHaveBeenCalled();
  });

  it("throws when the line does not belong to the given scene", async () => {
    vi.mocked(getMveLines).mockResolvedValue([
      { ...line("l1", 0), sceneId: "other-scene" },
    ]);

    await expect(
      reorderTextBlockInScene({
        projectId: "proj-1",
        lineId: "l1",
        sceneId: "scene-1",
        targetIndex: 0,
      }),
    ).rejects.toThrow();
  });
});
