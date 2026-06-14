import { describe, expect, it } from "vitest";
import { validateTimelineTree } from "../invariants";
import { cloneTimelineTree, mutateItemFrames } from "../tree-utils";
import { buildTestTree } from "./test-helpers";

describe("validateTimelineTree", () => {
  it("detects negative_duration", () => {
    const tree = cloneTimelineTree(buildTestTree());
    const item = tree.items.get("scene-1")!;
    mutateItemFrames(item, 100, 50);
    const errors = validateTimelineTree(tree);
    expect(errors.some((e) => e.code === "negative_duration")).toBe(true);
  });

  it("detects below_min_duration", () => {
    const tree = cloneTimelineTree(buildTestTree());
    const item = tree.items.get("shot-1")!;
    mutateItemFrames(item, item.startFrame, item.startFrame + 5);
    const errors = validateTimelineTree(tree, { minItemDurationFrames: 30 });
    expect(errors.some((e) => e.code === "below_min_duration")).toBe(true);
  });

  it("detects sibling_overlap", () => {
    const tree = cloneTimelineTree(buildTestTree());
    const acts = tree.childrenOf.get(null) ?? [];
    if (acts.length >= 2) {
      mutateItemFrames(acts[1]!, acts[0]!.startFrame, acts[1]!.endFrame);
    }
    const errors = validateTimelineTree(tree);
    expect(errors.some((e) => e.code === "sibling_overlap")).toBe(true);
  });

  it("detects implicit_gap", () => {
    const tree = cloneTimelineTree(buildTestTree());
    const acts = tree.childrenOf.get(null) ?? [];
    if (acts.length >= 2) {
      mutateItemFrames(
        acts[1]!,
        acts[0]!.endFrame + 50,
        acts[1]!.endFrame + 50,
      );
    }
    const errors = validateTimelineTree(tree);
    expect(errors.some((e) => e.code === "implicit_gap")).toBe(true);
  });

  it("detects child_outside_parent", () => {
    const tree = cloneTimelineTree(buildTestTree());
    const scene = tree.items.get("scene-1")!;
    const parent = tree.items.get("seq-1")!;
    mutateItemFrames(scene, parent.startFrame - 50, scene.endFrame);
    const errors = validateTimelineTree(tree);
    expect(errors.some((e) => e.code === "child_outside_parent")).toBe(true);
  });

  it("detects parent_hull_mismatch when parent end is below child hull", () => {
    const tree = cloneTimelineTree(buildTestTree());
    const act = tree.items.get("act-1")!;
    const seq = tree.items.get("seq-1")!;
    mutateItemFrames(act, act.startFrame, seq.endFrame - 10);
    const errors = validateTimelineTree(tree);
    expect(errors.some((e) => e.code === "parent_hull_mismatch")).toBe(true);
  });

  it("allows parent tail gap when shell is larger than child hull", () => {
    const tree = cloneTimelineTree(buildTestTree());
    const act = tree.items.get("act-1")!;
    mutateItemFrames(act, act.startFrame, act.endFrame + 500);
    const errors = validateTimelineTree(tree);
    expect(errors.some((e) => e.code === "parent_hull_mismatch")).toBe(false);
  });

  it("detects duplicate_id", () => {
    const tree = cloneTimelineTree(buildTestTree());
    const scene = tree.items.get("scene-1")!;
    tree.items.set("scene-1-dup", { ...scene, id: "scene-1" });
    const errors = validateTimelineTree(tree);
    expect(errors.some((e) => e.code === "duplicate_id")).toBe(true);
  });

  it("detects parent_cycle", () => {
    const tree = cloneTimelineTree(buildTestTree());
    const act = tree.items.get("act-1")!;
    const seq = tree.items.get("seq-1")!;
    act.parentId = seq.id;
    const errors = validateTimelineTree(tree);
    expect(errors.some((e) => e.code === "parent_cycle")).toBe(true);
  });
});
