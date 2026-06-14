import { describe, expect, it } from "vitest";
import { buildTimelineTree } from "../buildTree";
import { validateTimelineTree } from "../invariants";
import { makeJourney121TimelineData } from "./test-helpers";
import { DEFAULT_MIN_ITEM_DURATION_FRAMES } from "../types";
import { diagnoseTimelineTree, repairTimelineTree } from "../repair";
import { cloneTimelineTree } from "../tree-utils";

describe("repairTimelineTree", () => {
  it("repairs overlapping siblings from corrupt layout", () => {
    const tree = buildTimelineTree({
      timelineData: makeJourney121TimelineData(),
      projectDurationSec: 2700,
    });
    const corrupt = cloneTimelineTree(tree);
    const seq1 = corrupt.items.get("seq-1")!;
    const seq2 = corrupt.items.get("seq-2")!;
    seq2.startFrame = seq1.startFrame;
    seq2.endFrame = seq1.endFrame + DEFAULT_MIN_ITEM_DURATION_FRAMES;

    const before = diagnoseTimelineTree(
      corrupt,
      DEFAULT_MIN_ITEM_DURATION_FRAMES,
    );
    expect(before.some((e) => e.code === "sibling_overlap")).toBe(true);

    const result = repairTimelineTree(corrupt, {
      minItemDurationFrames: DEFAULT_MIN_ITEM_DURATION_FRAMES,
    });
    expect(result.errorsAfter).toEqual([]);
    expect(
      validateTimelineTree(corrupt, {
        minItemDurationFrames: DEFAULT_MIN_ITEM_DURATION_FRAMES,
      }),
    ).toEqual([]);
  });

  it("syncs parent start when head-gap exists", () => {
    const tree = buildTimelineTree({
      timelineData: makeJourney121TimelineData(),
      projectDurationSec: 2700,
    });
    const corrupt = cloneTimelineTree(tree);
    const act2 = corrupt.items.get("act-2")!;
    act2.startFrame = act2.startFrame - 45;

    const result = repairTimelineTree(corrupt, {
      minItemDurationFrames: DEFAULT_MIN_ITEM_DURATION_FRAMES,
    });
    const act2After = corrupt.items.get("act-2")!;
    const seq3 = corrupt.items.get("seq-3")!;
    expect(act2After.startFrame).toBe(seq3.startFrame);
    expect(result.errorsAfter).toEqual([]);
  });
});
