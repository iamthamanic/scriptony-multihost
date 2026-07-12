import { describe, expect, it } from "vitest";
import { buildTimelineTree } from "../../timeline-tree/buildTree";
import { validateTimelineTree } from "../../timeline-tree/invariants";
import {
  makeJourney121TimelineData,
  projectFrames,
} from "../../timeline-tree/__tests__/test-helpers";
import { DEFAULT_MIN_ITEM_DURATION_FRAMES } from "../../timeline-tree/types";
import { resizeStructureItem } from "../hierarchical";

const MIN = DEFAULT_MIN_ITEM_DURATION_FRAMES;
const DURATION_SEC = 2700;

function treeAfterActShellGrow(frames: number) {
  const tree = buildTimelineTree({
    timelineData: makeJourney121TimelineData(),
    projectDurationSec: DURATION_SEC,
  });
  const act = tree.items.get("act-1")!;
  const shell = resizeStructureItem({
    tree,
    itemId: "act-1",
    side: "right",
    operation: "shell-resize",
    newBoundaryFrame: act.endFrame + frames,
    minItemDurationFrames: MIN,
  });
  expect(shell.blocked).toBe(false);
  return shell.next;
}

describe("act shell-gap then seq/scene left trim", () => {
  it("baseline tree is valid after act shell grow", () => {
    const tree = treeAfterActShellGrow(60);
    const act = tree.items.get("act-1")!;
    const seq2 = tree.items.get("seq-2")!;
    expect(act.endFrame).toBeGreaterThan(seq2.endFrame);
    expect(validateTimelineTree(tree, { minItemDurationFrames: MIN })).toEqual(
      [],
    );
  });

  it("seq-2 right grow after act shell gap", () => {
    const tree = treeAfterActShellGrow(60);
    const seq = tree.items.get("seq-2")!;
    const r = resizeStructureItem({
      tree,
      itemId: "seq-2",
      side: "right",
      newBoundaryFrame: seq.endFrame + 30,
      minItemDurationFrames: MIN,
    });
    expect(r.blocked).toBe(false);
    expect(
      validateTimelineTree(r.next, { minItemDurationFrames: MIN }),
    ).toEqual([]);
  });

  it("seq-2 left grow after act shell gap", () => {
    const tree = treeAfterActShellGrow(60);
    const seq = tree.items.get("seq-2")!;
    const r = resizeStructureItem({
      tree,
      itemId: "seq-2",
      side: "left",
      newBoundaryFrame: seq.startFrame - 30,
      minItemDurationFrames: MIN,
    });
    if (r.blocked) {
      console.log(
        "blocked",
        r.blockReason,
        validateTimelineTree(r.next, { minItemDurationFrames: MIN }),
      );
    }
    expect(r.blocked).toBe(false);
  });

  it("seq-2 left shrink after act shell gap", () => {
    const tree = treeAfterActShellGrow(60);
    const seq = tree.items.get("seq-2")!;
    const r = resizeStructureItem({
      tree,
      itemId: "seq-2",
      side: "left",
      newBoundaryFrame: seq.startFrame + 30,
      minItemDurationFrames: MIN,
    });
    if (r.blocked) {
      console.log(
        "blocked",
        r.blockReason,
        validateTimelineTree(r.next, { minItemDurationFrames: MIN }),
      );
    }
    expect(r.blocked).toBe(false);
  });

  it("scene-3 left grow after act shell gap", () => {
    const tree = treeAfterActShellGrow(60);
    const scene = tree.items.get("scene-3")!;
    const r = resizeStructureItem({
      tree,
      itemId: "scene-3",
      side: "left",
      newBoundaryFrame: scene.startFrame - 20,
      minItemDurationFrames: MIN,
    });
    if (r.blocked) {
      console.log(
        "blocked",
        r.blockReason,
        validateTimelineTree(r.next, { minItemDurationFrames: MIN }),
      );
    }
    expect(r.blocked).toBe(false);
  });

  it("act left shell grow keeps valid tree", () => {
    const tree = buildTimelineTree({
      timelineData: makeJourney121TimelineData(),
      projectDurationSec: DURATION_SEC,
    });
    const act = tree.items.get("act-1")!;
    const r = resizeStructureItem({
      tree,
      itemId: "act-1",
      side: "left",
      operation: "shell-resize",
      newBoundaryFrame: act.startFrame - 30,
      minItemDurationFrames: MIN,
    });
    if (r.blocked) {
      console.log(
        "act left shell blocked",
        r.blockReason,
        validateTimelineTree(r.next, { minItemDurationFrames: MIN }),
      );
    }
    expect(r.blocked).toBe(false);
  });

  it("seq left trim after act left shell grow", () => {
    const tree = buildTimelineTree({
      timelineData: makeJourney121TimelineData(),
      projectDurationSec: DURATION_SEC,
    });
    const act = tree.items.get("act-1")!;
    const shell = resizeStructureItem({
      tree,
      itemId: "act-1",
      side: "left",
      operation: "shell-resize",
      newBoundaryFrame: act.startFrame - 30,
      minItemDurationFrames: MIN,
    });
    if (!shell.blocked) {
      const seq = shell.next.items.get("seq-2")!;
      const r = resizeStructureItem({
        tree: shell.next,
        itemId: "seq-2",
        side: "left",
        newBoundaryFrame: seq.startFrame - 20,
        minItemDurationFrames: MIN,
      });
      if (r.blocked) {
        console.log(
          "seq left after act left shell",
          r.blockReason,
          validateTimelineTree(r.next, { minItemDurationFrames: MIN }),
        );
      }
      expect(r.blocked).toBe(false);
    }
  });

  it("overlapping siblings from corrupt state blocks with invariant", () => {
    const tree = treeAfterActShellGrow(60);
    const seq1 = tree.items.get("seq-1")!;
    const seq2 = tree.items.get("seq-2")!;
    seq2.startFrame = seq1.startFrame;
    seq2.endFrame = seq1.endFrame + MIN;
    const errors = validateTimelineTree(tree, { minItemDurationFrames: MIN });
    expect(errors.some((e) => e.code === "sibling_overlap")).toBe(true);
    const r = resizeStructureItem({
      tree,
      itemId: "seq-2",
      side: "right",
      newBoundaryFrame: seq2.endFrame + 30,
      minItemDurationFrames: MIN,
    });
    expect(r.blocked).toBe(true);
    expect(r.blockReason).toBe("would_violate_invariant");
  });

  it("seq-1 right grow into tail gap after act shell grow", () => {
    const tree = treeAfterActShellGrow(projectFrames(120));
    const seq = tree.items.get("seq-1")!;
    const act = tree.items.get("act-1")!;
    const gap = act.endFrame - tree.items.get("seq-2")!.endFrame;
    expect(gap).toBeGreaterThan(MIN);
    const r = resizeStructureItem({
      tree,
      itemId: "seq-1",
      side: "right",
      newBoundaryFrame: seq.endFrame + Math.min(gap - 1, 90),
      minItemDurationFrames: MIN,
    });
    if (r.blocked) {
      console.log(
        "blocked",
        r.blockReason,
        validateTimelineTree(r.next, { minItemDurationFrames: MIN }),
      );
    }
    expect(r.blocked).toBe(false);
  });
});
