import { describe, expect, it } from "vitest";
import { buildJourney121Tree } from "../../timeline-tree/__tests__/test-helpers";
import {
  resolveStructureMoveCommitDelta,
  resolveStructureMovePointerDelta,
} from "../structure-move-gesture";

describe("resolveStructureMovePointerDelta", () => {
  it("maps pointer motion to frames and matching dragLeftPx", () => {
    const result = resolveStructureMovePointerDelta({
      startFrame: 1000,
      startClientX: 200,
      clientX: 250,
      pxPerFrame: 2,
      viewStartFrame: 900,
    });
    expect(result.deltaFrames).toBe(25);
    expect(result.dropFrame).toBe(1025);
    expect(result.dragLeftPx).toBe((1000 - 900) * 2 + 25 * 2);
  });
});

describe("resolveStructureMoveCommitDelta", () => {
  it("keeps raw delta when reorder already valid", () => {
    const tree = buildJourney121Tree();
    const act2 = tree.items.get("act-2")!;
    const act1 = tree.items.get("act-1")!;
    const deltaFrames = -act1.durationFrames;
    const result = resolveStructureMoveCommitDelta({
      tree,
      itemId: act2.id,
      startFrame: act2.startFrame,
      durationFrames: act2.durationFrames,
      deltaFrames,
      dropFrame: act2.startFrame + deltaFrames,
      snapThresholdFrames: 5,
    });
    expect(result.deltaFrames).toBe(deltaFrames);
  });

  it("snaps center to sibling midpoint when close enough to reorder", () => {
    const tree = buildJourney121Tree();
    const act2 = tree.items.get("act-2")!;
    const act1 = tree.items.get("act-1")!;
    const act1Mid = Math.round((act1.startFrame + act1.endFrame) / 2);
    const targetCenter = act1Mid + 3;
    const deltaFrames = Math.round(
      targetCenter - act2.durationFrames / 2 - act2.startFrame,
    );
    const result = resolveStructureMoveCommitDelta({
      tree,
      itemId: act2.id,
      startFrame: act2.startFrame,
      durationFrames: act2.durationFrames,
      deltaFrames,
      dropFrame: act2.startFrame + deltaFrames,
      snapThresholdFrames: 5,
    });
    expect(result.deltaFrames).not.toBe(deltaFrames);
    expect(
      resolveStructureMoveCommitDelta({
        tree,
        itemId: act2.id,
        startFrame: act2.startFrame,
        durationFrames: act2.durationFrames,
        deltaFrames: result.deltaFrames,
        dropFrame: result.dropFrame,
        snapThresholdFrames: 5,
      }).deltaFrames,
    ).toBe(result.deltaFrames);
  });

  it("does not snap when still far from reorder threshold", () => {
    const tree = buildJourney121Tree();
    const act2 = tree.items.get("act-2")!;
    const deltaFrames = -120;
    const result = resolveStructureMoveCommitDelta({
      tree,
      itemId: act2.id,
      startFrame: act2.startFrame,
      durationFrames: act2.durationFrames,
      deltaFrames,
      dropFrame: act2.startFrame + deltaFrames,
      snapThresholdFrames: 5,
    });
    expect(result.deltaFrames).toBe(deltaFrames);
  });
});
