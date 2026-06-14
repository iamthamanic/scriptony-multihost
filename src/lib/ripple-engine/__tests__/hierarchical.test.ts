import { describe, expect, it } from "vitest";
import { resizeStructureItem } from "../hierarchical";
import { validateTimelineTree } from "../../timeline-tree/invariants";
import {
  cloneTimelineTree,
  mutateItemFrames,
} from "../../timeline-tree/tree-utils";
import { buildTestTree } from "../../timeline-tree/__tests__/test-helpers";
import { DEFAULT_MIN_ITEM_DURATION_FRAMES } from "../../timeline-tree/types";

const MIN = DEFAULT_MIN_ITEM_DURATION_FRAMES;

function growRight(
  tree: ReturnType<typeof buildTestTree>,
  id: string,
  frames: number,
) {
  const item = tree.items.get(id)!;
  return resizeStructureItem({
    tree,
    itemId: id,
    side: "right",
    newBoundaryFrame: item.endFrame + frames,
    minItemDurationFrames: MIN,
  });
}

function shrinkRight(
  tree: ReturnType<typeof buildTestTree>,
  id: string,
  frames: number,
) {
  const item = tree.items.get(id)!;
  return resizeStructureItem({
    tree,
    itemId: id,
    side: "right",
    newBoundaryFrame: item.endFrame - frames,
    minItemDurationFrames: MIN,
  });
}

function growLeft(
  tree: ReturnType<typeof buildTestTree>,
  id: string,
  frames: number,
) {
  const item = tree.items.get(id)!;
  return resizeStructureItem({
    tree,
    itemId: id,
    side: "left",
    newBoundaryFrame: item.startFrame - frames,
    minItemDurationFrames: MIN,
  });
}

function shrinkLeft(
  tree: ReturnType<typeof buildTestTree>,
  id: string,
  frames: number,
) {
  const item = tree.items.get(id)!;
  return resizeStructureItem({
    tree,
    itemId: id,
    side: "left",
    newBoundaryFrame: item.startFrame + frames,
    minItemDurationFrames: MIN,
  });
}

describe("resizeStructureItem", () => {
  it("scene_right_grow_propagates_to_act", () => {
    const tree = buildTestTree(240);
    const actBefore = tree.items.get("act-1")!.endFrame;
    const r = growRight(tree, "scene-1", 60);
    expect(r.blocked).toBe(false);
    expect(r.next.items.get("act-1")!.endFrame).toBeGreaterThan(actBefore);
  });

  it("scene_right_shrink_propagates_to_act", () => {
    const tree = buildTestTree();
    const actBefore = tree.items.get("act-1")!.endFrame;
    const r = shrinkRight(tree, "scene-1", 30);
    expect(r.blocked).toBe(false);
    expect(r.next.items.get("act-1")!.endFrame).toBeLessThanOrEqual(actBefore);
  });

  it("shot_right_grow_propagates_to_act", () => {
    const tree = buildTestTree();
    const actBefore = tree.items.get("act-1")!.endFrame;
    const r = growRight(tree, "shot-1", 45);
    expect(r.blocked).toBe(false);
    expect(r.next.items.get("act-1")!.endFrame).toBeGreaterThanOrEqual(
      actBefore,
    );
  });

  it("sequence_right_grow_propagates_to_act", () => {
    const tree = buildTestTree();
    const actBefore = tree.items.get("act-1")!.endFrame;
    const r = growRight(tree, "seq-1", 60);
    expect(r.blocked).toBe(false);
    expect(r.next.items.get("act-1")!.endFrame).toBeGreaterThanOrEqual(
      actBefore,
    );
  });

  it("act_right_grow_moves_following_acts", () => {
    const tree = buildTestTree(240);
    const act2Before = tree.items.get("act-2")!.startFrame;
    const r = growRight(tree, "act-1", 5);
    expect(r.blocked).toBe(false);
    expect(r.next.items.get("act-2")!.startFrame).toBeGreaterThan(act2Before);
  });

  it("scene_left_grow_propagates_to_act", () => {
    const tree = buildTestTree();
    const actBefore = tree.items.get("act-1")!.startFrame;
    const r = growLeft(tree, "scene-1", 30);
    expect(r.blocked).toBe(false);
    expect(r.next.items.get("act-1")!.startFrame).toBeLessThanOrEqual(
      actBefore,
    );
  });

  it("shot_left_shrink_propagates_to_act", () => {
    const tree = buildTestTree();
    const actEndBefore = tree.items.get("act-1")!.endFrame;
    const r = shrinkLeft(tree, "shot-1", 15);
    expect(r.blocked).toBe(false);
    expect(r.changedIds.size).toBeGreaterThan(0);
    const actEndAfter = r.next.items.get("act-1")!.endFrame;
    expect(actEndAfter).toBeLessThanOrEqual(actEndBefore + 1);
  });

  it("locked_item_itself_blocks_operation", () => {
    const tree = buildTestTree();
    const shot = tree.items.get("shot-1")!;
    shot.locked = true;
    const r = growRight(tree, "shot-1", 30);
    expect(r.blocked).toBe(true);
    expect(r.blockReason).toBe("locked");
  });

  it("locked_following_sibling_blocks_operation", () => {
    const tree = cloneTimelineTree(buildTestTree());
    const acts = tree.childrenOf.get(null) ?? [];
    if (acts.length >= 2) acts[1]!.locked = true;
    const r = growRight(tree, acts[0]!.id, 120);
    expect(r.blocked).toBe(true);
  });

  it("parent_cannot_shrink_below_child_hull", () => {
    const tree = buildTestTree();
    const scene = tree.items.get("scene-1")!;
    const r = resizeStructureItem({
      tree,
      itemId: "scene-1",
      side: "right",
      newBoundaryFrame: scene.startFrame + 5,
      minItemDurationFrames: MIN,
    });
    const childEnd = r.next.items.get("shot-1")!.endFrame;
    expect(r.next.items.get("scene-1")!.endFrame).toBeGreaterThanOrEqual(
      childEnd,
    );
  });

  it("snap_before_ripple", () => {
    const tree = buildTestTree(240);
    const shot = tree.items.get("shot-1")!;
    const snapTarget = shot.endFrame + 10;
    const r = resizeStructureItem({
      tree,
      itemId: "shot-1",
      side: "right",
      newBoundaryFrame: shot.endFrame + 8,
      snapEdgesFrame: [snapTarget],
      snapThresholdFrames: 5,
      minItemDurationFrames: MIN,
    });
    expect(r.blocked).toBe(false);
    expect(r.next.items.get("shot-1")!.endFrame).toBe(snapTarget);
  });

  it("no_cumulative_drift", () => {
    const frozen = buildTestTree(240);
    const shot = frozen.items.get("shot-1")!;
    const r1 = growRight(frozen, "shot-1", 5);
    const r2 = growRight(frozen, "shot-1", 10);
    expect(r1.next.items.get("shot-1")!.endFrame).toBe(shot.endFrame + 5);
    expect(r2.next.items.get("shot-1")!.endFrame).toBe(shot.endFrame + 10);
  });

  it("packed_invariant_holds_after_operation", () => {
    const tree = buildTestTree();
    const r = growRight(tree, "scene-1", 45);
    const errors = validateTimelineTree(r.next, { minItemDurationFrames: MIN });
    expect(errors).toHaveLength(0);
  });

  it("zero_delta_returns_empty_changed", () => {
    const tree = buildTestTree();
    const scene = tree.items.get("scene-1")!;
    const r = resizeStructureItem({
      tree,
      itemId: "scene-1",
      side: "right",
      newBoundaryFrame: scene.endFrame,
      minItemDurationFrames: MIN,
    });
    expect(r.changedIds.size).toBe(0);
  });

  it("sequence_right_shrink_ripples_siblings_in_act", () => {
    const tree = buildTestTree();
    const r = shrinkRight(tree, "seq-1", 20);
    expect(r.blocked).toBe(false);
  });

  it("shot_right_shrink_updates_scene_hull", () => {
    const tree = buildTestTree();
    const r = shrinkRight(tree, "shot-1", 20);
    const scene = r.next.items.get("scene-1")!;
    const shot = r.next.items.get("shot-1")!;
    expect(scene.endFrame).toBeGreaterThanOrEqual(shot.endFrame);
  });

  it("roll_boundary_swaps_with_neighbor", () => {
    const tree = buildTestTree();
    const acts = tree.childrenOf.get(null) ?? [];
    if (acts.length < 2) return;
    const a0 = acts[0]!;
    const a1 = acts[1]!;
    const pairBudget =
      a0.endFrame - a0.startFrame + (a1.endFrame - a1.startFrame);
    const r = resizeStructureItem({
      tree,
      itemId: a0.id,
      side: "right",
      operation: "roll-boundary",
      newBoundaryFrame: a0.endFrame + 30,
      minItemDurationFrames: MIN,
    });
    const pairAfter =
      r.next.items.get(a0.id)!.endFrame -
      r.next.items.get(a0.id)!.startFrame +
      (r.next.items.get(a1.id)!.endFrame - r.next.items.get(a1.id)!.startFrame);
    expect(pairAfter).toBe(pairBudget);
  });

  it("shell_resize_changes_item_without_children_ripple", () => {
    const tree = buildTestTree();
    const act = tree.items.get("act-1")!;
    const childStartBefore = tree.items.get("seq-1")!.startFrame;
    const r = resizeStructureItem({
      tree,
      itemId: "act-1",
      side: "right",
      operation: "shell-resize",
      newBoundaryFrame: act.endFrame + 40,
      minItemDurationFrames: MIN,
    });
    expect(r.next.items.get("seq-1")!.startFrame).toBe(childStartBefore);
  });

  it("shell_resize_act_ripples_following_acts", () => {
    const tree = buildTestTree();
    const act = tree.items.get("act-1")!;
    const act2StartBefore = tree.items.get("act-2")!.startFrame;
    const r = resizeStructureItem({
      tree,
      itemId: "act-1",
      side: "right",
      operation: "shell-resize",
      newBoundaryFrame: act.endFrame + 30,
      minItemDurationFrames: MIN,
    });
    expect(r.blocked).toBe(false);
    expect(r.next.items.get("act-2")!.startFrame).toBe(act2StartBefore + 30);
  });

  it("would_violate_invariant_blocks", () => {
    const tree = cloneTimelineTree(buildTestTree());
    const scene = tree.items.get("scene-1")!;
    mutateItemFrames(scene, scene.startFrame, scene.startFrame + 5);
    const r = resizeStructureItem({
      tree,
      itemId: "scene-1",
      side: "right",
      newBoundaryFrame: scene.endFrame + 200,
      minItemDurationFrames: MIN,
    });
    if (
      validateTimelineTree(r.next, { minItemDurationFrames: MIN }).length > 0
    ) {
      expect(r.blocked).toBe(true);
    }
  });
});
