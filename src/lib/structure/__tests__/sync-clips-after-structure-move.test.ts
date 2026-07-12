/**
 * Unit tests — shift dialog clips when structure move changes scene startSec.
 */

import { describe, expect, it } from "vitest";
import { buildTimelineTree } from "../../timeline-tree/buildTree";
import { makeJourney121TimelineData } from "../../timeline-tree/__tests__/test-helpers";
import { DEFAULT_MIN_ITEM_DURATION_FRAMES } from "../../timeline-tree/types";
import { resolveStructureMoveOperation } from "../../ripple-engine/hierarchical-move";
import { repairTimelineTree } from "../../timeline-tree/repair";
import { computeStructureMoveClipRipple } from "../sync-clips-after-structure-move";
import type { AudioClip } from "../../types";

const DURATION_SEC = 2700;

function buildJourneyTree() {
  const built = buildTimelineTree({
    timelineData: makeJourney121TimelineData(),
    projectDurationSec: DURATION_SEC,
  });
  repairTimelineTree(built, {
    minItemDurationFrames: DEFAULT_MIN_ITEM_DURATION_FRAMES,
  });
  return built;
}

describe("computeStructureMoveClipRipple", () => {
  it("shifts clips bound to a scene reparented into another sequence", () => {
    const before = buildJourneyTree();
    const scene3Before = before.items.get("scene-3")!;
    const seq1 = before.items.get("seq-1")!;
    const dropFrame = seq1.startFrame + Math.floor(seq1.durationFrames / 2);

    const move = resolveStructureMoveOperation({
      tree: before,
      itemId: "scene-3",
      deltaFrames: dropFrame - scene3Before.startFrame,
      dropFrame,
      minItemDurationFrames: DEFAULT_MIN_ITEM_DURATION_FRAMES,
    });
    expect(move.blocked).toBe(false);

    const clipStartSec = scene3Before.startFrame / before.frameRate;
    const clips: AudioClip[] = [
      {
        id: "clip-scene-3",
        sceneId: "scene-3",
        projectId: "p1",
        trackId: "track-1",
        startSec: clipStartSec,
        endSec: clipStartSec + 5,
        laneIndex: 0,
      } as AudioClip,
    ];

    const ripple = computeStructureMoveClipRipple(before, move.next, clips);
    const scene3After = move.next.items.get("scene-3")!;
    const expectedStart = scene3After.startFrame / move.next.frameRate;

    expect(ripple.stats.affectedClips).toBe(1);
    expect(ripple.updatedClips[0]?.startSec).toBeCloseTo(expectedStart, 3);
    expect(ripple.updatedClips[0]?.endSec).toBeCloseTo(expectedStart + 5, 3);
  });
});
