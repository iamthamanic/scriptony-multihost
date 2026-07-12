/**
 * Beat move preview vs React reconcile — selective reset regression.
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import {
  applyBeatDragFollow,
  resetBeatMovePreviewStyles,
} from "../beat-move-preview";

describe("beat move preview vs React reconcile", () => {
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

  it("selective_reset_leaves_unchanged_sibling_left_intact", () => {
    act(() => {
      root.render(
        <div>
          <div data-beat-id="a" style={{ left: "100px", width: "80px" }}>
            A
          </div>
          <div data-beat-id="b" style={{ left: "200px", width: "80px" }}>
            B
          </div>
        </div>,
      );
    });

    const elA = container.querySelector("[data-beat-id='a']") as HTMLElement;
    const elB = container.querySelector("[data-beat-id='b']") as HTMLElement;

    applyBeatDragFollow(container, "a", 150);
    expect(elA.style.transform).toContain("translateX(150px)");

    resetBeatMovePreviewStyles(container, new Set(["a"]));

    expect(elA.style.transform).toBe("");
    expect(elB.style.left).toBe("200px");
  });
});
