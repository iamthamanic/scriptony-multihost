import { describe, expect, it } from "vitest";
import { buildTimelineTree } from "../../timeline-tree/buildTree";
import { validateTimelineTree } from "../../timeline-tree/invariants";
import { makeJourney121TimelineData } from "../../timeline-tree/__tests__/test-helpers";
import { DEFAULT_MIN_ITEM_DURATION_FRAMES } from "../../timeline-tree/types";
import { resizeStructureItem } from "../hierarchical";

describe("act-2 left shell grow", () => {
  it("detects head-gap invariant risk", () => {
    const tree = buildTimelineTree({
      timelineData: makeJourney121TimelineData(),
      projectDurationSec: 2700,
    });
    const act2 = tree.items.get("act-2")!;
    const seq3StartBefore = tree.items.get("seq-3")!.startFrame;
    const r = resizeStructureItem({
      tree,
      itemId: "act-2",
      side: "left",
      operation: "shell-resize",
      newBoundaryFrame: act2.startFrame - 45,
      minItemDurationFrames: DEFAULT_MIN_ITEM_DURATION_FRAMES,
    });
    const act2After = r.next.items.get("act-2")!;
    const seq3After = r.next.items.get("seq-3")!;
    const errors = validateTimelineTree(r.next, {
      minItemDurationFrames: DEFAULT_MIN_ITEM_DURATION_FRAMES,
    });
    console.log({
      blocked: r.blocked,
      blockReason: r.blockReason,
      act2StartBefore: act2.startFrame,
      act2StartAfter: act2After.startFrame,
      seq3StartBefore,
      seq3StartAfter: seq3After.startFrame,
      errors,
    });
    expect(r.blocked).toBe(false);
    expect(act2After.startFrame).toBe(seq3After.startFrame);
    expect(errors).toEqual([]);
  });
});
