/**
 * Unit tests for extend-scene-for-audio (T29).
 */

import { describe, it, expect } from "vitest";
import { computeSceneExtendDelta } from "../extend-scene-for-audio";
import { buildRippleContainersFromTree } from "../ripple-containers-from-tree";
import { calculateRipple } from "../../ripple-engine";
import {
  buildTimelineTree,
  type BuildTimelineTreeInput,
} from "../../timeline-tree/buildTree";
import type { TimelineData } from "@/lib/timeline-data";
import { DEFAULT_FRAME_RATE } from "../../timeline-tree/types";

function makeFilmTimeline(): TimelineData {
  return {
    acts: [
      {
        id: "act-1",
        projectId: "p1",
        actNumber: 1,
        title: "Act 1",
        orderIndex: 0,
        metadata: { pct_from: 0, pct_to: 100 },
      },
    ],
    sequences: [
      {
        id: "seq-1",
        projectId: "p1",
        actId: "act-1",
        sequenceNumber: 1,
        title: "Seq 1",
        orderIndex: 0,
        metadata: { pct_from: 0, pct_to: 100 },
      },
    ],
    scenes: [
      {
        id: "scene-1",
        projectId: "p1",
        sequenceId: "seq-1",
        sceneNumber: 1,
        title: "Scene 1",
        orderIndex: 0,
        metadata: { pct_from: 0, pct_to: 50 },
      },
      {
        id: "scene-2",
        projectId: "p1",
        sequenceId: "seq-1",
        sceneNumber: 2,
        title: "Scene 2",
        orderIndex: 1,
        metadata: { pct_from: 50, pct_to: 100 },
      },
    ],
    shots: [],
    clips: [],
  } as unknown as TimelineData;
}

describe("computeSceneExtendDelta", () => {
  it("returns 0 when audio fits within scene", () => {
    expect(computeSceneExtendDelta(10, 8)).toBe(0);
    expect(computeSceneExtendDelta(10, 10)).toBe(0);
  });

  it("returns positive delta when audio exceeds scene", () => {
    expect(computeSceneExtendDelta(10, 12.3)).toBeCloseTo(2.3);
  });
});

describe("extend scene ripple preview", () => {
  it("shifts following scene when clip extends past scene boundary", () => {
    const timelineData = makeFilmTimeline();
    const buildInput: BuildTimelineTreeInput = {
      timelineData,
      projectDurationSec: 100,
      frameRate: DEFAULT_FRAME_RATE,
    };
    const tree = buildTimelineTree(buildInput);
    const containers = buildRippleContainersFromTree(tree);

    const scene1 = containers.scenes.find((s) => s.id === "scene-1");
    const scene2 = containers.scenes.find((s) => s.id === "scene-2");
    expect(scene1).toBeDefined();
    expect(scene2).toBeDefined();

    const scene1End = scene1!.endSec;
    const newClipEnd = scene1End + 5;

    const result = calculateRipple({
      changedClipId: "clip-1",
      newEndSec: newClipEnd,
      allClips: [
        {
          id: "clip-1",
          sceneId: "scene-1",
          startSec: 0,
          endSec: scene1End,
        },
        {
          id: "clip-2",
          sceneId: "scene-2",
          startSec: scene2!.startSec,
          endSec: scene2!.endSec,
        },
      ],
      allScenes: containers.scenes,
      allSequences: containers.sequences,
      allActs: containers.acts,
    });

    expect(result.stats.deltaSec).toBe(5);
    expect(result.updatedScenes.find((s) => s.id === "scene-2")!.startSec).toBe(
      scene2!.startSec + 5,
    );
    expect(result.updatedClips.find((c) => c.id === "clip-2")!.startSec).toBe(
      scene2!.startSec + 5,
    );
  });
});
