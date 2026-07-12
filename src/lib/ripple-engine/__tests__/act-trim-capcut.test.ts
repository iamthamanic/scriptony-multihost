/**
 * VETILALORAPP — CapCut act/sequence trim: cascade shrink + elastic project end.
 */

import { describe, expect, it } from "vitest";
import { buildTimelineTree } from "../../timeline-tree/buildTree";
import {
  DEFAULT_MIN_ITEM_DURATION_FRAMES,
  type TimelineData,
} from "../../timeline-tree/types";
import { validateTimelineTree } from "../../timeline-tree/invariants";
import { minSubtreeDurationFrames } from "../../timeline-tree/tree-utils";
import {
  buildJourney121Tree,
  trimStructureRight,
} from "../../timeline-tree/__tests__/test-helpers";
import { resizeStructureItem } from "../hierarchical";

const MIN = DEFAULT_MIN_ITEM_DURATION_FRAMES;

// Journey 12.1 @200s/30fps: act-1 [0..3000], act-2 [3000..6000],
// seq-1 [0..1500], seq-2 [1500..3000], scene-3 [1500..3000].

describe("act right-trim shrink (cascade into children)", () => {
  it("shrinks act-1 with children and ripples act-2 left", () => {
    const tree = buildJourney121Tree();
    const result = trimStructureRight(tree, "act-1", -600);

    expect(result.blocked).toBe(false);
    const act1 = result.next.items.get("act-1")!;
    const act2 = result.next.items.get("act-2")!;
    const seq2 = result.next.items.get("seq-2")!;
    const scene3 = result.next.items.get("scene-3")!;

    expect(act1.endFrame).toBe(2400);
    expect(seq2.endFrame).toBe(2400);
    expect(scene3.endFrame).toBe(2400);
    expect(act2.startFrame).toBe(2400);
    expect(act2.durationFrames).toBe(3000);
    expect(
      validateTimelineTree(result.next, { minItemDurationFrames: MIN }),
    ).toEqual([]);
  });

  it("clamps shrink at the act's min subtree duration", () => {
    const tree = buildJourney121Tree();
    const minSubtree = minSubtreeDurationFrames(tree, "act-1", MIN);
    const result = trimStructureRight(tree, "act-1", -5000);

    expect(result.blocked).toBe(false);
    const act1 = result.next.items.get("act-1")!;
    expect(act1.endFrame).toBe(act1.startFrame + minSubtree);
    expect(
      validateTimelineTree(result.next, { minItemDurationFrames: MIN }),
    ).toEqual([]);
  });
});

describe("act right-trim grow (elastic project end)", () => {
  it("grows act-1 past project end and extends projectDurationFrames", () => {
    const tree = buildJourney121Tree();
    const result = trimStructureRight(tree, "act-1", 600);

    expect(result.blocked).toBe(false);
    const act1 = result.next.items.get("act-1")!;
    const act2 = result.next.items.get("act-2")!;
    expect(act1.endFrame).toBe(3600);
    expect(act2.startFrame).toBe(3600);
    expect(act2.endFrame).toBe(6600);
    expect(result.next.projectDurationFrames).toBe(6600);
    expect(
      validateTimelineTree(result.next, { minItemDurationFrames: MIN }),
    ).toEqual([]);
  });
});

describe("act left-trim grow (roll into act-1, pinned at 0)", () => {
  it("act-2 left grow shrinks act-1 without moving act-1 start", () => {
    const tree = buildJourney121Tree();
    const act1 = tree.items.get("act-1")!;
    const act2 = tree.items.get("act-2")!;
    const act2Before = tree.items.get("act-2")!;
    const result = resizeStructureItem({
      tree,
      itemId: "act-2",
      side: "left",
      newBoundaryFrame: act2Before.startFrame - 120,
      minItemDurationFrames: MIN,
    });

    expect(result.blocked).toBe(false);
    expect(result.changedIds.size).toBeGreaterThan(0);
    const nextAct1 = result.next.items.get("act-1")!;
    const nextAct2 = result.next.items.get("act-2")!;
    expect(nextAct1.startFrame).toBe(act1.startFrame);
    expect(nextAct1.endFrame).toBe(act2.startFrame - 120);
    expect(nextAct2.startFrame).toBe(act2.startFrame - 120);
    expect(nextAct2.durationFrames).toBe(act2.durationFrames);
    expect(
      validateTimelineTree(result.next, { minItemDurationFrames: MIN }),
    ).toEqual([]);
  });
});

describe("3-act left trim (pinned act-1 at frame 0)", () => {
  function buildThreeActTree() {
    return buildTimelineTree({
      timelineData: {
        acts: [
          {
            id: "act-1",
            projectId: "p1",
            actNumber: 1,
            title: "A1",
            orderIndex: 0,
            metadata: { pct_from: 0, pct_to: 33 },
          },
          {
            id: "act-2",
            projectId: "p1",
            actNumber: 2,
            title: "A2",
            orderIndex: 1,
            metadata: { pct_from: 33, pct_to: 66 },
          },
          {
            id: "act-3",
            projectId: "p1",
            actNumber: 3,
            title: "A3",
            orderIndex: 2,
            metadata: { pct_from: 66, pct_to: 100 },
          },
        ],
        sequences: [
          {
            id: "seq-1",
            projectId: "p1",
            actId: "act-1",
            sequenceNumber: 1,
            title: "S1",
            orderIndex: 0,
            metadata: { pct_from: 0, pct_to: 100 },
          },
          {
            id: "seq-2",
            projectId: "p1",
            actId: "act-2",
            sequenceNumber: 1,
            title: "S2",
            orderIndex: 0,
            metadata: { pct_from: 0, pct_to: 100 },
          },
          {
            id: "seq-3",
            projectId: "p1",
            actId: "act-3",
            sequenceNumber: 1,
            title: "S3",
            orderIndex: 0,
            metadata: { pct_from: 0, pct_to: 100 },
          },
        ],
        scenes: [
          {
            id: "sc-1",
            projectId: "p1",
            sequenceId: "seq-1",
            sceneNumber: 1,
            title: "C1",
            orderIndex: 0,
            metadata: { pct_from: 0, pct_to: 100 },
          },
          {
            id: "sc-2",
            projectId: "p1",
            sequenceId: "seq-2",
            sceneNumber: 1,
            title: "C2",
            orderIndex: 0,
            metadata: { pct_from: 0, pct_to: 100 },
          },
          {
            id: "sc-3",
            projectId: "p1",
            sequenceId: "seq-3",
            sceneNumber: 1,
            title: "C3",
            orderIndex: 0,
            metadata: { pct_from: 0, pct_to: 100 },
          },
        ],
        shots: [],
      } as unknown as TimelineData,
      projectDurationSec: 2700,
    });
  }

  it("act-2 left grow reports changedIds and keeps act-1 at 0", () => {
    const tree = buildThreeActTree();
    const act2 = tree.items.get("act-2")!;
    const result = resizeStructureItem({
      tree,
      itemId: "act-2",
      side: "left",
      newBoundaryFrame: act2.startFrame - 120,
      minItemDurationFrames: MIN,
    });
    expect(result.blocked).toBe(false);
    expect(result.changedIds.size).toBeGreaterThan(0);
    expect(result.next.items.get("act-1")!.startFrame).toBe(0);
    expect(result.next.items.get("act-2")!.startFrame).toBe(
      act2.startFrame - 120,
    );
  });
});

describe("sequence right-trim shrink (bubbles to act)", () => {
  it("shrinks seq-1, ripples seq-2 left, act-1 hull follows", () => {
    const tree = buildJourney121Tree();
    const result = trimStructureRight(tree, "seq-1", -300);

    expect(result.blocked).toBe(false);
    const seq1 = result.next.items.get("seq-1")!;
    const seq2 = result.next.items.get("seq-2")!;
    const act1 = result.next.items.get("act-1")!;
    const act2 = result.next.items.get("act-2")!;

    expect(seq1.endFrame).toBe(1200);
    expect(seq2.startFrame).toBe(1200);
    expect(act1.endFrame).toBe(seq2.endFrame);
    expect(act2.startFrame).toBe(act1.endFrame);
    expect(
      validateTimelineTree(result.next, { minItemDurationFrames: MIN }),
    ).toEqual([]);
  });
});
