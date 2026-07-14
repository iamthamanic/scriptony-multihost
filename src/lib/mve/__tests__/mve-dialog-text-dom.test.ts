/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildMveDialogTextFragment,
  getCaretTextOffset,
  replaceMveDialogTextDom,
  serializeMveDialogText,
  setCaretTextOffset,
} from "../mve-dialog-text-dom";

describe("mve-dialog-text-dom", () => {
  let root: HTMLDivElement;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
  });

  afterEach(() => {
    root.remove();
  });

  it("round-trips plain text and tags", () => {
    const text = "--sad Hallo Welt";
    replaceMveDialogTextDom(root, text);
    expect(serializeMveDialogText(root)).toBe(text);
    expect(root.querySelector("[data-mve-tag='sad']")).toBeTruthy();
  });

  it("serializes multiline text", () => {
    replaceMveDialogTextDom(root, "Zeile 1\nZeile 2");
    expect(serializeMveDialogText(root)).toBe("Zeile 1\nZeile 2");
  });

  it("restores caret offset after tag chip", () => {
    replaceMveDialogTextDom(root, "--sad Hallo");
    root.focus();
    setCaretTextOffset(root, "--sad ".length + "Ha".length);
    expect(getCaretTextOffset(root)).toBe("--sad Ha".length);
  });

  it("builds chip with label and remove control", () => {
    const frag = buildMveDialogTextFragment("--happy");
    root.appendChild(frag);
    expect(root.textContent).toContain("Fröhlich");
    expect(root.querySelector("[data-mve-tag-remove='happy']")).toBeTruthy();
  });
});
