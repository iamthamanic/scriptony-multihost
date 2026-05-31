import { describe, it, expect } from "vitest";
import {
  mergeVisibleLaneIndices,
  DEFAULT_VISIBLE_LANE_INDICES,
  getTimelineLaneLabel,
  getPanFillVars,
} from "../../lib/audio-lane";
import {
  groupClipsByLane,
  sortedLaneIndicesFromGroups,
} from "../useProjectClipLanes";
import type { AudioClip } from "../../lib/types";

function clip(
  id: string,
  laneIndex: number,
  startSec = 0,
  endSec = 5,
): AudioClip {
  return {
    id,
    projectId: "proj-1",
    sceneId: "scene-1",
    trackId: "track-1",
    laneIndex,
    startSec,
    endSec,
    orderIndex: 0,
    trackType: "dialog",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

describe("useProjectClipLanes helpers", () => {
  it("groups clips by lane index", () => {
    const groups = groupClipsByLane([clip("a", 0), clip("b", 2), clip("c", 0)]);
    expect(groups[0]).toHaveLength(2);
    expect(groups[2]).toHaveLength(1);
    expect(groups[1]).toBeUndefined();
  });

  it("returns sorted lane indices", () => {
    const indices = sortedLaneIndicesFromGroups({
      2: [clip("b", 2)],
      0: [clip("a", 0)],
      5: [clip("c", 5)],
    });
    expect(indices).toEqual([0, 2, 5]);
  });

  it("handles empty clip list", () => {
    expect(groupClipsByLane([])).toEqual({});
    expect(sortedLaneIndicesFromGroups({})).toEqual([]);
  });

  it("merges default lanes when no clips exist", () => {
    expect(mergeVisibleLaneIndices([])).toEqual([
      ...DEFAULT_VISIBLE_LANE_INDICES,
    ]);
  });

  it("merges default lanes with clip lanes without duplicates", () => {
    expect(mergeVisibleLaneIndices([0, 110], true, [0, 1])).toEqual([
      0, 1, 100, 110,
    ]);
  });

  it("formats timeline lane labels for mockup", () => {
    expect(getTimelineLaneLabel(0)).toBe("Audio Dialog");
    expect(getTimelineLaneLabel(100)).toBe("Audio SFX");
    expect(getTimelineLaneLabel(101)).toBe("Audio SFX 2");
  });

  it("builds pan fill vars from center to thumb", () => {
    expect(getPanFillVars(0)).toEqual({
      "--pan-fill-start": "50%",
      "--pan-fill-end": "50%",
    });
    expect(getPanFillVars(-1)["--pan-fill-start"]).toBe("0%");
    expect(getPanFillVars(-1)["--pan-fill-end"]).toBe("50%");
    expect(getPanFillVars(1)["--pan-fill-start"]).toBe("50%");
    expect(getPanFillVars(1)["--pan-fill-end"]).toBe("100%");
  });
});
