import { describe, expect, it } from "vitest";
import {
  getSnapEdgesForStructureMove,
  getSnapEdgesForStructureOperation,
  snapBoundaryFrame,
} from "../snap";
import {
  buildTestTree,
  makeJourney121TimelineData,
} from "../../timeline-tree/__tests__/test-helpers";
import { buildTimelineTree } from "../../timeline-tree/buildTree";

describe("snap", () => {
  it("snaps within threshold to closest edge", () => {
    expect(snapBoundaryFrame(102, [100, 200], 5)).toBe(100);
    expect(snapBoundaryFrame(198, [100, 200], 5)).toBe(200);
  });

  it("leaves proposed when outside threshold", () => {
    expect(snapBoundaryFrame(150, [100, 200], 5)).toBe(150);
  });

  it("excludes moving boundary from trim snap (no cancel-back)", () => {
    const tree = buildTimelineTree({
      timelineData: makeJourney121TimelineData(),
      projectDurationSec: 2700,
    });
    const act1 = tree.items.get("act-1")!;
    const act2 = tree.items.get("act-2")!;
    const leftEdges = getSnapEdgesForStructureOperation({
      tree,
      itemId: act2.id,
      kind: "act",
      side: "left",
    });
    const rightEdges = getSnapEdgesForStructureOperation({
      tree,
      itemId: act1.id,
      kind: "act",
      side: "right",
    });
    expect(leftEdges).not.toContain(act2.startFrame);
    expect(rightEdges).not.toContain(act1.endFrame);
    expect(rightEdges).toContain(tree.items.get("act-2")!.endFrame);
  });

  it("move snap edges exclude gesture anchors (legacy helper)", () => {
    const tree = buildTimelineTree({
      timelineData: makeJourney121TimelineData(),
      projectDurationSec: 2700,
    });
    const act2 = tree.items.get("act-2")!;
    const edges = getSnapEdgesForStructureMove({
      tree,
      itemId: act2.id,
      playheadFrame: act2.startFrame,
    });
    expect(edges).not.toContain(act2.startFrame);
    expect(edges).not.toContain(act2.endFrame);
    const proposed = act2.startFrame - 3;
    expect(snapBoundaryFrame(proposed, edges, 5)).toBe(proposed);
  });

  it("left trim snap keeps small grow past frame grid anchor", () => {
    const tree = buildTimelineTree({
      timelineData: makeJourney121TimelineData(),
      projectDurationSec: 2700,
    });
    const act2 = tree.items.get("act-2")!;
    const edges = getSnapEdgesForStructureOperation({
      tree,
      itemId: act2.id,
      kind: "act",
      side: "left",
      playheadFrame: act2.startFrame,
      includeFrameGrid: true,
    });
    const proposed = act2.startFrame - 3;
    expect(edges).not.toContain(act2.startFrame);
    expect(snapBoundaryFrame(proposed, edges, 5)).toBe(proposed);
  });

  it("includes playhead when provided", () => {
    const tree = buildTestTree();
    const scene = tree.items.get("scene-1")!;
    const edges = getSnapEdgesForStructureOperation({
      tree,
      itemId: scene.id,
      kind: "scene",
      side: "left",
      playheadFrame: 42,
    });
    expect(edges).toContain(42);
  });
});
