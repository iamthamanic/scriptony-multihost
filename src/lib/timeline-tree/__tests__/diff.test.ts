import { describe, expect, it } from "vitest";
import { diffTreeToPatches } from "../diff";
import { cloneTimelineTree, mutateItemFrames } from "../tree-utils";
import { buildTestTree } from "./test-helpers";

describe("diffTreeToPatches", () => {
  it("sorts patches act → sequence → scene → shot", () => {
    const before = buildTestTree();
    const next = cloneTimelineTree(before);
    mutateItemFrames(
      next.items.get("act-1")!,
      0,
      next.items.get("act-1")!.endFrame + 30,
    );
    mutateItemFrames(
      next.items.get("seq-1")!,
      next.items.get("seq-1")!.startFrame,
      next.items.get("seq-1")!.endFrame + 30,
    );
    const patches = diffTreeToPatches(before, next);
    const kinds = patches.map((p) => p.kind);
    const actIdx = kinds.indexOf("act");
    const seqIdx = kinds.indexOf("sequence");
    const sceneIdx = kinds.indexOf("scene");
    if (actIdx >= 0 && seqIdx >= 0) expect(actIdx).toBeLessThan(seqIdx);
    if (seqIdx >= 0 && sceneIdx >= 0) expect(seqIdx).toBeLessThan(sceneIdx);
  });

  it("includes legacy pct for act", () => {
    const before = buildTestTree();
    const next = cloneTimelineTree(before);
    const act = next.items.get("act-1")!;
    mutateItemFrames(act, act.startFrame, act.endFrame + 30);
    const patches = diffTreeToPatches(before, next);
    const actPatch = patches.find((p) => p.id === "act-1");
    expect(actPatch?.pct_from).toBeDefined();
    expect(actPatch?.pct_to).toBeDefined();
  });

  it("includes durationSec for shot", () => {
    const before = buildTestTree();
    const next = cloneTimelineTree(before);
    const shot = next.items.get("shot-1")!;
    mutateItemFrames(shot, shot.startFrame, shot.endFrame + 60);
    const patches = diffTreeToPatches(before, next);
    const shotPatch = patches.find((p) => p.id === "shot-1");
    expect(shotPatch?.durationSec).toBeGreaterThan(0);
  });
});
