import { describe, expect, it } from "vitest";
import { buildTimelineTree, treeToTimelineData } from "../buildTree";
import { validateTimelineTree } from "../invariants";
import {
  makeFilmTimelineData,
  buildTestTree,
  projectFrames,
} from "./test-helpers";
import { DEFAULT_FRAME_RATE } from "../types";

describe("buildTimelineTree", () => {
  it("dedupes duplicate act ids", () => {
    const td = makeFilmTimelineData();
    td.acts = [...td.acts!, { ...td.acts![0]!, id: td.acts![0]!.id }];
    const tree = buildTimelineTree({
      timelineData: td,
      projectDurationSec: 120,
    });
    const roots = tree.childrenOf.get(null) ?? [];
    const ids = roots.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("repairs overlapping act pct into packed spans", () => {
    const td = makeFilmTimelineData();
    td.acts![0]!.metadata = { pct_from: 0, pct_to: 80 };
    td.acts![1]!.metadata = { pct_from: 40, pct_to: 100 };
    const tree = buildTimelineTree({
      timelineData: td,
      projectDurationSec: 100,
    });
    const acts = tree.childrenOf.get(null) ?? [];
    for (let i = 1; i < acts.length; i++) {
      expect(acts[i]!.startFrame).toBeGreaterThanOrEqual(
        acts[i - 1]!.endFrame - 1,
      );
    }
  });

  it("packs act gaps from pct metadata via enforceParentShells", () => {
    const td = makeFilmTimelineData();
    td.acts![0]!.metadata = { pct_from: 0, pct_to: 20 };
    td.acts![1]!.metadata = { pct_from: 40, pct_to: 60 };
    const tree = buildTimelineTree({
      timelineData: td,
      projectDurationSec: 100,
    });
    const acts = (tree.childrenOf.get(null) ?? []).sort(
      (a, b) => a.orderIndex - b.orderIndex,
    );
    expect(acts[1]!.startFrame).toBe(acts[0]!.endFrame);
  });

  it("quantizes to integer frames", () => {
    const tree = buildTestTree(100);
    for (const item of tree.items.values()) {
      expect(Number.isInteger(item.startFrame)).toBe(true);
      expect(Number.isInteger(item.endFrame)).toBe(true);
    }
  });

  it("childrenOf is sorted by orderIndex", () => {
    const tree = buildTestTree();
    const seqs = tree.childrenOf.get("act-1") ?? [];
    for (let i = 1; i < seqs.length; i++) {
      expect(seqs[i]!.orderIndex).toBeGreaterThanOrEqual(
        seqs[i - 1]!.orderIndex,
      );
    }
  });

  it("includes shots in tree", () => {
    const tree = buildTestTree();
    expect(tree.items.has("shot-1")).toBe(true);
    expect(tree.items.get("shot-1")?.kind).toBe("shot");
  });

  it("includes newly added scene when sequence is in tree", () => {
    const td = makeFilmTimelineData();
    const sequenceId = td.sequences![0]!.id;
    td.scenes = [
      {
        id: "scene-new",
        projectId: td.acts![0]!.projectId,
        sequenceId,
        sceneNumber: 99,
        title: "New Scene",
        orderIndex: 99,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    const tree = buildTimelineTree({
      timelineData: td,
      projectDurationSec: 120,
    });
    expect(tree.items.has("scene-new")).toBe(true);
    const sceneItem = tree.items.get("scene-new")!;
    expect(sceneItem.parentId).toBe(sequenceId);
    expect(sceneItem.endFrame).toBeGreaterThan(sceneItem.startFrame);
  });

  it("packs shots from scene hull not legacy block geometry", () => {
    const td = makeFilmTimelineData();
    td.shots = [
      ...(td.shots ?? []),
      {
        id: "shot-1b",
        projectId: "p1",
        sceneId: "scene-1",
        orderIndex: 1,
        shotNumber: "2",
        shotlengthSeconds: 20,
        shotlengthMinutes: 0,
        duration: "20s",
      } as NonNullable<typeof td.shots>[number],
    ];
    const tree = buildTimelineTree({
      timelineData: td,
      projectDurationSec: 120,
      frameRate: DEFAULT_FRAME_RATE,
    });
    const scene = tree.items.get("scene-1")!;
    const sh1 = tree.items.get("shot-1")!;
    const sh2 = tree.items.get("shot-1b")!;
    expect(sh1.startFrame).toBe(scene.startFrame);
    expect(sh2.endFrame).toBe(scene.endFrame);
    expect(sh1.endFrame).toBe(sh2.startFrame);
  });

  it("round-trips multi-shot frames without drift", () => {
    const td = makeFilmTimelineData();
    td.shots = [
      ...(td.shots ?? []),
      {
        id: "shot-1b",
        projectId: "p1",
        sceneId: "scene-1",
        orderIndex: 1,
        shotNumber: "2",
        shotlengthSeconds: 15,
        shotlengthMinutes: 0,
        duration: "15s",
      } as NonNullable<typeof td.shots>[number],
    ];
    const tree1 = buildTimelineTree({
      timelineData: td,
      projectDurationSec: 120,
      frameRate: DEFAULT_FRAME_RATE,
    });
    const out = treeToTimelineData(tree1, td);
    const tree2 = buildTimelineTree({
      timelineData: out,
      projectDurationSec: 120,
      frameRate: DEFAULT_FRAME_RATE,
    });
    for (const id of ["shot-1", "shot-1b", "scene-1"]) {
      const a = tree1.items.get(id)!;
      const b = tree2.items.get(id)!;
      expect(b.startFrame).toBe(a.startFrame);
      expect(b.endFrame).toBe(a.endFrame);
    }
  });

  it("round-trips pct via treeToTimelineData", () => {
    const td = makeFilmTimelineData();
    const tree = buildTimelineTree({
      timelineData: td,
      projectDurationSec: 120,
      frameRate: DEFAULT_FRAME_RATE,
    });
    const out = treeToTimelineData(tree, td);
    const tree2 = buildTimelineTree({
      timelineData: out,
      projectDurationSec: 120,
      frameRate: DEFAULT_FRAME_RATE,
    });
    const errors = validateTimelineTree(tree2, { minItemDurationFrames: 30 });
    expect(errors).toHaveLength(0);
  });

  it("satisfies invariants after build", () => {
    const tree = buildTestTree();
    const errors = validateTimelineTree(tree, { minItemDurationFrames: 30 });
    expect(errors).toHaveLength(0);
  });

  it("project duration frames matches duration sec", () => {
    const tree = buildTestTree(120);
    expect(tree.projectDurationFrames).toBe(projectFrames(120));
  });
});
