import { describe, expect, it } from "vitest";
import { buildTimelineTree } from "../../timeline-tree/buildTree";
import { validateTimelineTree } from "../../timeline-tree/invariants";
import { makeJourney121TimelineData } from "../../timeline-tree/__tests__/test-helpers";
import { DEFAULT_MIN_ITEM_DURATION_FRAMES } from "../../timeline-tree/types";
import {
  moveStructureItem,
  reparentStructureItem,
  resolveStructureMoveOperation,
} from "../hierarchical-move";

const MIN = DEFAULT_MIN_ITEM_DURATION_FRAMES;
const DURATION_SEC = 2700;

function buildJourneyTree() {
  return buildTimelineTree({
    timelineData: makeJourney121TimelineData(),
    projectDurationSec: DURATION_SEC,
  });
}

describe("moveStructureItem (packed reorder)", () => {
  it("small drag without crossing sibling midpoint is a no-op", () => {
    const tree = buildJourneyTree();
    const result = moveStructureItem({
      tree,
      itemId: "act-1",
      deltaFrames: 5,
      minItemDurationFrames: MIN,
    });
    expect(result.blocked).toBe(false);
    expect(result.changedIds.size).toBe(0);
  });

  it("dragging act-1 past act-2 midpoint swaps order and repacks", () => {
    const tree = buildJourneyTree();
    const act1 = tree.items.get("act-1")!;
    const act2 = tree.items.get("act-2")!;
    // Center of act-1 must cross act-2's midpoint: delta > (d1 + d2) / 2.
    const crossingDelta = Math.ceil(
      (act1.durationFrames + act2.durationFrames) / 2 + 1,
    );
    const result = moveStructureItem({
      tree,
      itemId: "act-1",
      deltaFrames: crossingDelta,
      minItemDurationFrames: MIN,
    });
    expect(result.blocked).toBe(false);
    expect(result.changedIds.size).toBeGreaterThan(0);

    const nextAct1 = result.next.items.get("act-1")!;
    const nextAct2 = result.next.items.get("act-2")!;
    expect(nextAct2.startFrame).toBe(act1.startFrame);
    expect(nextAct1.startFrame).toBe(act1.startFrame + act2.durationFrames);
    expect(nextAct1.orderIndex).toBeGreaterThan(nextAct2.orderIndex);
    expect(nextAct1.durationFrames).toBe(act1.durationFrames);
    expect(
      validateTimelineTree(result.next, { minItemDurationFrames: MIN }),
    ).toEqual([]);
  });

  it("small left drag on act-2 without midpoint cross is a no-op (no roll on body-drag)", () => {
    const tree = buildJourneyTree();
    const act1 = tree.items.get("act-1")!;
    const act2 = tree.items.get("act-2")!;
    const result = moveStructureItem({
      tree,
      itemId: "act-2",
      deltaFrames: -120,
      minItemDurationFrames: MIN,
    });
    expect(result.blocked).toBe(false);
    expect(result.changedIds.size).toBe(0);
    expect(result.next.items.get("act-1")!.endFrame).toBe(act1.endFrame);
    expect(result.next.items.get("act-2")!.startFrame).toBe(act2.startFrame);
  });

  it("dragging act-2 left past act-1 midpoint swaps order", () => {
    const tree = buildJourneyTree();
    const act1 = tree.items.get("act-1")!;
    const act2 = tree.items.get("act-2")!;
    const result = moveStructureItem({
      tree,
      itemId: "act-2",
      deltaFrames: -act1.durationFrames,
      minItemDurationFrames: MIN,
    });
    expect(result.blocked).toBe(false);
    expect(result.next.items.get("act-2")!.startFrame).toBe(act1.startFrame);
    expect(
      validateTimelineTree(result.next, { minItemDurationFrames: MIN }),
    ).toEqual([]);
  });

  it("moves children with the reordered act (subtree shift)", () => {
    const tree = buildJourneyTree();
    const act1 = tree.items.get("act-1")!;
    const act2 = tree.items.get("act-2")!;
    const childBefore = [...tree.items.values()].find(
      (i) => i.kind === "sequence" && i.parentId === "act-1",
    );
    const crossingDelta = Math.ceil(
      (act1.durationFrames + act2.durationFrames) / 2 + 1,
    );
    const result = moveStructureItem({
      tree,
      itemId: "act-1",
      deltaFrames: crossingDelta,
      minItemDurationFrames: MIN,
    });
    expect(result.blocked).toBe(false);
    if (childBefore) {
      const childAfter = result.next.items.get(childBefore.id)!;
      expect(childAfter.startFrame).toBe(
        childBefore.startFrame + act2.durationFrames,
      );
    }
    expect(result.next.items.get("act-1")!.durationFrames).toBe(
      act1.durationFrames,
    );
  });
});

describe("reparentStructureItem", () => {
  it("moves sequence to another act at drop frame", () => {
    const tree = buildJourneyTree();
    const act2 = tree.items.get("act-2");
    const seq = tree.items.get("seq-1");
    if (!act2 || !seq) return;

    const targetStart = act2.startFrame + 30;
    const result = reparentStructureItem({
      tree,
      itemId: "seq-1",
      newParentId: "act-2",
      targetStartFrame: targetStart,
      minItemDurationFrames: MIN,
    });
    expect(result.blocked).toBe(false);
    expect(result.next.items.get("seq-1")!.parentId).toBe("act-2");
    expect(
      validateTimelineTree(result.next, { minItemDurationFrames: MIN }),
    ).toEqual([]);
  });
});

describe("resolveStructureMoveOperation", () => {
  it("reparents sequence when drop frame lands in another act", () => {
    const tree = buildJourneyTree();
    const act2 = tree.items.get("act-2");
    if (!act2) return;

    const dropFrame = act2.startFrame + 60;
    const result = resolveStructureMoveOperation({
      tree,
      itemId: "seq-1",
      deltaFrames: dropFrame - tree.items.get("seq-1")!.startFrame,
      dropFrame,
      minItemDurationFrames: MIN,
    });
    expect(result.blocked).toBe(false);
    expect(result.next.items.get("seq-1")!.parentId).toBe("act-2");
  });

  it("reparents scene-3 into seq-1 when drop frame lands in target sequence", () => {
    const tree = buildJourneyTree();
    const scene3 = tree.items.get("scene-3")!;
    const seq1 = tree.items.get("seq-1")!;
    const dropFrame = seq1.startFrame + Math.floor(seq1.durationFrames / 2);

    const result = resolveStructureMoveOperation({
      tree,
      itemId: "scene-3",
      deltaFrames: dropFrame - scene3.startFrame,
      dropFrame,
      minItemDurationFrames: MIN,
    });

    expect(result.blocked).toBe(false);
    expect(result.invariantErrors ?? []).toEqual([]);
    expect(result.next.items.get("scene-3")!.parentId).toBe("seq-1");
    expect(
      validateTimelineTree(result.next, { minItemDurationFrames: MIN }),
    ).toEqual([]);
  });
});
