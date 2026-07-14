/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  applyStructureDropZoneAcrossLanes,
  applyStructurePreviewToDOM,
  clearStructureDropZonesForLanes,
  resetStructurePreviewStyles,
} from "../preview";
import { buildTestTree } from "../../timeline-tree/__tests__/test-helpers";

describe("applyStructureDropZoneAcrossLanes", () => {
  let actLane: HTMLDivElement;
  let sceneLane: HTMLDivElement;
  let audioLane: HTMLDivElement;

  beforeEach(() => {
    actLane = document.createElement("div");
    sceneLane = document.createElement("div");
    audioLane = document.createElement("div");
    audioLane.setAttribute("data-audio-lane-drop-stack", "true");
    document.body.append(actLane, sceneLane, audioLane);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("paints white insertion slot on structure and extra audio stacks", () => {
    applyStructureDropZoneAcrossLanes({
      containerByKind: { act: actLane, scene: sceneLane },
      startFrame: 10,
      endFrame: 14,
      viewStartFrame: 0,
      pxPerFrame: 2,
      extraDropZoneStacks: [audioLane],
    });

    const actZone = actLane.querySelector("[data-structure-drop-zone]");
    const audioZone = audioLane.querySelector("[data-structure-drop-zone]");
    expect(actZone).not.toBeNull();
    expect(audioZone).not.toBeNull();
    expect(actZone?.className).toContain("border-white");
    expect(audioZone?.className).toContain("border-white");
  });

  it("clears drop zones on structure lanes and extra stacks", () => {
    applyStructureDropZoneAcrossLanes({
      containerByKind: { act: actLane },
      startFrame: 0,
      endFrame: 4,
      viewStartFrame: 0,
      pxPerFrame: 1,
      extraDropZoneStacks: [audioLane],
    });
    clearStructureDropZonesForLanes({ act: actLane }, [audioLane]);
    expect(actLane.querySelector("[data-structure-drop-zone]")).toBeNull();
    expect(audioLane.querySelector("[data-structure-drop-zone]")).toBeNull();
  });
});

describe("applyStructurePreviewToDOM", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    const act = document.createElement("div");
    act.setAttribute("data-act-id", "act-1");
    act.style.left = "100px";
    act.style.width = "200px";
    container.appendChild(act);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("uses transform not left for changed act", () => {
    const tree = buildTestTree();
    const item = tree.items.get("act-1")!;
    item.startFrame = item.startFrame + 30;
    applyStructurePreviewToDOM({
      containerByKind: { act: container },
      tree,
      changedIds: new Set(["act-1"]),
      viewStartFrame: 0,
      pxPerFrame: 2,
    });
    const el = container.querySelector("[data-act-id='act-1']") as HTMLElement;
    expect(el.style.transform).toContain("translateX");
    expect(el.style.left).toBe("0px");
  });

  it("null container is no-op", () => {
    const tree = buildTestTree();
    expect(() =>
      applyStructurePreviewToDOM({
        containerByKind: { act: null },
        tree,
        changedIds: new Set(["act-1"]),
        viewStartFrame: 0,
        pxPerFrame: 1,
      }),
    ).not.toThrow();
  });

  it("reset clears transform", () => {
    const tree = buildTestTree();
    applyStructurePreviewToDOM({
      containerByKind: { act: container },
      tree,
      changedIds: new Set(["act-1"]),
      viewStartFrame: 0,
      pxPerFrame: 1,
    });
    resetStructurePreviewStyles({ act: container });
    const el = container.querySelector("[data-act-id='act-1']") as HTMLElement;
    expect(el.style.transform).toBe("");
  });
});
