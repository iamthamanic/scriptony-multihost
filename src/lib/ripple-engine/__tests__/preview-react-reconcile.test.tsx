/**
 * Documents post-trim layout bug: resetStructurePreviewStyles + React style bailout.
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import {
  applyStructurePreviewToDOM,
  resetStructurePreviewStyles,
} from "../preview";
import { buildTestTree } from "../../timeline-tree/__tests__/test-helpers";

describe("preview vs React reconcile (post-trim regression)", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it("reset_after_preview_leaves_no_transform_when_React_props_unchanged", () => {
    const style = {
      left: 0,
      width: "200px",
      transform: "translateX(400px)",
    };

    act(() => {
      root.render(
        <div data-act-id="act-1" style={style}>
          Act A
        </div>,
      );
    });

    const el = container.querySelector("[data-act-id='act-1']") as HTMLElement;
    expect(el.style.transform).toContain("translateX(400px)");

    const tree = buildTestTree();
    applyStructurePreviewToDOM({
      containerByKind: { act: container },
      tree,
      changedIds: new Set(["act-1"]),
      viewStartFrame: 0,
      pxPerFrame: 2,
    });
    expect(el.style.transform).not.toBe("");

    resetStructurePreviewStyles({ act: container });
    expect(el.style.transform).toBe("");

    // React re-render with SAME style props (simulates seq/scene unchanged after act trim).
    act(() => {
      root.render(
        <div data-act-id="act-1" style={style}>
          Act A
        </div>,
      );
    });

    // React skips style update → transform stays empty → block sits at left:0.
    expect(el.style.transform).toBe("");
  });

  it("selective_reset_leaves_unchanged_sibling_transform_intact", () => {
    const styleA = {
      left: 0,
      width: "200px",
      transform: "translateX(0px)",
    };
    const styleB = {
      left: 0,
      width: "100px",
      transform: "translateX(400px)",
    };

    act(() => {
      root.render(
        <div>
          <div data-act-id="act-1" style={styleA}>
            Act A
          </div>
          <div data-act-id="act-2" style={styleB}>
            Act B
          </div>
        </div>,
      );
    });

    const elA = container.querySelector("[data-act-id='act-1']") as HTMLElement;
    const elB = container.querySelector("[data-act-id='act-2']") as HTMLElement;

    const tree = buildTestTree();
    applyStructurePreviewToDOM({
      containerByKind: { act: container },
      tree,
      changedIds: new Set(["act-1"]),
      viewStartFrame: 0,
      pxPerFrame: 2,
    });

    resetStructurePreviewStyles({ act: container }, new Set(["act-1"]));

    expect(elB.style.transform).toContain("translateX(400px)");
    expect(elA.style.transform).toBe("");
  });
});
