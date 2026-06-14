import { describe, expect, it } from "vitest";
import { isImagePath } from "../tauri-timeline-image-drop-bridge";

describe("tauri-timeline-image-drop-bridge", () => {
  it("detects image paths by extension", () => {
    expect(isImagePath("/Users/x/photo.heic")).toBe(true);
    expect(isImagePath("/Users/x/doc.pdf")).toBe(false);
  });
});
