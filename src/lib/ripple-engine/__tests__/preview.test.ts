/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  applyStructurePreviewToDOM,
  resetStructurePreviewStyles,
} from "../preview";
import { buildTestTree } from "../../timeline-tree/__tests__/test-helpers";

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
