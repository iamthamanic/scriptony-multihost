/**
 * Unit tests for structure-picker-tree (T30 lane-link modal).
 */

import { describe, expect, it } from "vitest";
import {
  buildStructurePickerTree,
  findSceneLabelInTree,
  isSceneInTree,
} from "./structure-picker-tree";
import type { Act, Scene, Sequence } from "../types";

const act: Act = {
  id: "act-1",
  projectId: "p1",
  actNumber: 1,
  title: "Setup",
  orderIndex: 0,
  createdAt: "",
  updatedAt: "",
};

const seq: Sequence = {
  id: "seq-1",
  actId: "act-1",
  sequenceNumber: 1,
  title: "Intro",
  orderIndex: 0,
  createdAt: "",
  updatedAt: "",
};

const scene: Scene = {
  id: "scene-1",
  projectId: "p1",
  sequenceId: "seq-1",
  sceneNumber: 3,
  title: "Meeting",
  orderIndex: 0,
  createdAt: "",
  updatedAt: "",
};

describe("buildStructurePickerTree", () => {
  it("builds act → sequence → scene hierarchy", () => {
    const tree = buildStructurePickerTree([act], [seq], [scene]);
    expect(tree).toHaveLength(1);
    expect(tree[0].label).toContain("Setup");
    expect(tree[0].sequences[0].scenes[0].id).toBe("scene-1");
    expect(tree[0].sequences[0].scenes[0].label).toContain("Meeting");
  });

  it("places scenes without sequence under orphan bucket", () => {
    const orphan: Scene = {
      ...scene,
      id: "scene-orphan",
      sequenceId: undefined,
    };
    const tree = buildStructurePickerTree([act], [seq], [orphan]);
    const orphanAct = tree.find((a) => a.id === "__orphan__");
    expect(orphanAct).toBeDefined();
    expect(
      orphanAct?.sequences.some((s) =>
        s.scenes.some((sc) => sc.id === "scene-orphan"),
      ),
    ).toBe(true);
  });
});

describe("findSceneLabelInTree / isSceneInTree", () => {
  it("finds scene label and detects membership", () => {
    const tree = buildStructurePickerTree([act], [seq], [scene]);
    expect(findSceneLabelInTree(tree, "scene-1")).toContain("Meeting");
    expect(isSceneInTree(tree, "scene-1")).toBe(true);
    expect(isSceneInTree(tree, "missing")).toBe(false);
  });
});
