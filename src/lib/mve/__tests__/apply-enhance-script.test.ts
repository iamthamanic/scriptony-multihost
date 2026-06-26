/**
 * Tests for applyEnhanceScriptResult.
 * Location: src/lib/mve/__tests__/apply-enhance-script.test.ts
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { applyEnhanceScriptResult } from "../apply-enhance-script";

vi.mock("@/lib/api-adapter/characters-adapter", () => ({
  createCharacter: vi.fn(
    async (_projectId: string, payload: { name: string }) => ({
      id: `char_${payload.name.toLowerCase()}`,
      name: payload.name,
      projectId: "proj_1",
    }),
  ),
}));

vi.mock("@/lib/api-adapter/mve-adapter", () => ({
  createMveLine: vi.fn(async () => ({
    id: "mve_line_new",
    sceneId: "scene_1",
    orderIndex: 0,
    type: "dialogue",
    status: "draft",
    createdAt: "2026-06-14T12:00:00.000Z",
    updatedAt: "2026-06-14T12:00:00.000Z",
  })),
}));

import { createCharacter } from "@/lib/api-adapter/characters-adapter";
import { createMveLine } from "@/lib/api-adapter/mve-adapter";

describe("applyEnhanceScriptResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates characters and lines from enhance result", async () => {
    const output = await applyEnhanceScriptResult({
      projectId: "proj_1",
      sceneId: "scene_1",
      existingCharacters: [],
      result: {
        characters: [{ tempId: "t1", name: "Mara", roleType: "character" }],
        lines: [
          {
            orderIndex: 0,
            type: "dialogue",
            characterTempId: "t1",
            text: "Hallo.",
          },
        ],
      },
    });

    expect(output.charactersCreated).toBe(1);
    expect(output.linesCreated).toBe(1);
    expect(createCharacter).toHaveBeenCalledOnce();
    expect(createMveLine).toHaveBeenCalledOnce();
  });

  it("reuses existing character by name", async () => {
    const output = await applyEnhanceScriptResult({
      projectId: "proj_1",
      sceneId: "scene_1",
      existingCharacters: [
        {
          id: "char_existing",
          name: "Mara",
          projectId: "proj_1",
        } as never,
      ],
      result: {
        characters: [{ tempId: "t1", name: "Mara", roleType: "character" }],
        lines: [
          {
            orderIndex: 0,
            type: "dialogue",
            characterTempId: "t1",
            text: "Hi.",
          },
        ],
      },
    });

    expect(output.charactersCreated).toBe(0);
    expect(createCharacter).not.toHaveBeenCalled();
  });
});
