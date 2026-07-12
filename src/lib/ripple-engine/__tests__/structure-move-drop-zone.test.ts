import { describe, expect, it } from "vitest";
import { buildJourney121Tree } from "../../timeline-tree/__tests__/test-helpers";
import { getStructureMoveInsertionSlot } from "../structure-move-drop-zone";

describe("getStructureMoveInsertionSlot", () => {
  it("no midpoint crossed → slot at own position, wouldChange false", () => {
    const tree = buildJourney121Tree();
    const slot = getStructureMoveInsertionSlot({
      tree,
      itemId: "act-2",
      deltaFrames: -120,
      dropFrame: tree.items.get("act-2")!.startFrame - 120,
    });
    expect(slot?.mode).toBe("reorder");
    expect(slot?.wouldChange).toBe(false);
  });

  it("act-2 dragged past act-1 midpoint → junction band at lane start", () => {
    const tree = buildJourney121Tree();
    const act1 = tree.items.get("act-1")!;
    const slot = getStructureMoveInsertionSlot({
      tree,
      itemId: "act-2",
      deltaFrames: -act1.durationFrames,
      dropFrame: act1.startFrame,
    });
    expect(slot?.mode).toBe("reorder");
    expect(slot?.wouldChange).toBe(true);
    expect(slot?.startFrame).toBe(act1.startFrame);
    expect(slot?.endFrame).toBe(act1.startFrame);
  });

  it("act-1 dragged past act-2 midpoint → junction band at act-2 end", () => {
    const tree = buildJourney121Tree();
    const act1 = tree.items.get("act-1")!;
    const act2 = tree.items.get("act-2")!;
    const crossingDelta = Math.ceil(
      (act1.durationFrames + act2.durationFrames) / 2 + 1,
    );
    const slot = getStructureMoveInsertionSlot({
      tree,
      itemId: "act-1",
      deltaFrames: crossingDelta,
      dropFrame: act1.startFrame + crossingDelta,
    });
    expect(slot?.mode).toBe("reorder");
    expect(slot?.wouldChange).toBe(true);
    expect(slot?.startFrame).toBe(act2.endFrame);
  });

  it("sequence over foreign act → reparent slot spans full target act", () => {
    const tree = buildJourney121Tree();
    const act2 = tree.items.get("act-2")!;
    const dropFrame = act2.startFrame + 30;
    const slot = getStructureMoveInsertionSlot({
      tree,
      itemId: "seq-1",
      deltaFrames: dropFrame - tree.items.get("seq-1")!.startFrame,
      dropFrame,
    });
    expect(slot?.mode).toBe("reparent");
    expect(slot?.wouldChange).toBe(true);
    expect(slot?.startFrame).toBe(act2.startFrame);
    expect(slot?.endFrame).toBe(act2.endFrame);
  });
});
