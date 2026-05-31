import { describe, it, expect } from "vitest";
import {
  buildDialogLaneOrder,
  laneIndexForCharacter,
  characterIdForLaneIndex,
  reorderDialogLanes,
  remapClipsAfterReorder,
  appendCharacterToOrder,
  CharacterLaneCapError,
  MAX_CHARACTER_LANES,
} from "../character-lane-map";
import {
  migrateLegacyLaneIndex,
  needsLegacyLaneMigration,
} from "../lane-index-migration";
import type { AudioClip, Character } from "../types";

function char(id: string, name: string, createdAt: string): Character {
  return {
    id,
    projectId: "p1",
    name,
    createdAt,
    updatedAt: createdAt,
  };
}

describe("character-lane-map", () => {
  it("builds order by createdAt when no saved order", () => {
    const order = buildDialogLaneOrder([
      char("b", "B", "2026-01-02T00:00:00Z"),
      char("a", "A", "2026-01-01T00:00:00Z"),
    ]);
    expect(order).toEqual(["a", "b"]);
  });

  it("merges saved order with new characters and drops deleted ids", () => {
    const order = buildDialogLaneOrder(
      [
        char("a", "A", "2026-01-01T00:00:00Z"),
        char("c", "C", "2026-01-03T00:00:00Z"),
      ],
      ["b", "a"],
    );
    expect(order).toEqual(["a", "c"]);
  });

  it("maps character to lane index", () => {
    const order = ["a", "b", "c"];
    expect(laneIndexForCharacter("b", order)).toBe(1);
    expect(characterIdForLaneIndex(2, order)).toBe("c");
  });

  it("reorders and remaps clips", () => {
    const oldOrder = ["a", "b"];
    const newOrder = reorderDialogLanes(oldOrder, 0, 1);
    expect(newOrder).toEqual(["b", "a"]);

    const clips: AudioClip[] = [
      {
        id: "c1",
        trackId: "t1",
        sceneId: "s1",
        projectId: "p1",
        startSec: 0,
        endSec: 1,
        laneIndex: 0,
        orderIndex: 0,
        characterId: "a",
        createdAt: "",
        updatedAt: "",
      },
    ];
    const updates = remapClipsAfterReorder(oldOrder, newOrder, clips);
    expect(updates).toEqual([{ clipId: "c1", laneIndex: 1, characterId: "a" }]);
  });

  it("throws at cap", () => {
    const order = Array.from({ length: MAX_CHARACTER_LANES }, (_, i) =>
      String(i),
    );
    expect(() => appendCharacterToOrder(order, "new")).toThrow(
      CharacterLaneCapError,
    );
  });

  it("migrates legacy lane indices to v2 ranges", () => {
    expect(needsLegacyLaneMigration(10)).toBe(true);
    expect(needsLegacyLaneMigration(0)).toBe(false);
    expect(migrateLegacyLaneIndex(10)).toBe(100);
    expect(migrateLegacyLaneIndex(20)).toBe(110);
    expect(migrateLegacyLaneIndex(30)).toBe(120);
    expect(migrateLegacyLaneIndex(95)).toBe(195);
  });
});
