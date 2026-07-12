import { describe, expect, it } from "vitest";
import {
  extractImageFileFromDataTransfer,
  findBlockAtTime,
  isTimelineExternalFileDrag,
  resolveSceneParentAtTime,
  resolveSequenceParentAtTime,
  shouldAllowTimelineFileDragOver,
} from "../timeline-image-drop";

describe("timeline-image-drop", () => {
  it("detects external file drag vs internal structure drag", () => {
    const external = {
      types: ["Files"],
    } as unknown as DataTransfer;
    const internal = {
      types: ["Files", "text/structure-move"],
    } as unknown as DataTransfer;
    expect(isTimelineExternalFileDrag(external)).toBe(true);
    expect(isTimelineExternalFileDrag(internal)).toBe(false);
  });

  it("extracts first image file from dataTransfer", () => {
    const png = new File(["x"], "a.png", { type: "image/png" });
    const dt = {
      files: [new File(["t"], "t.txt", { type: "text/plain" }), png],
    } as unknown as DataTransfer;
    expect(extractImageFileFromDataTransfer(dt)).toBe(png);
  });

  it("accepts image by extension when mime type is empty (macOS drops)", () => {
    const heic = new File(["x"], "photo.heic", { type: "" });
    const dt = { files: [heic] } as unknown as DataTransfer;
    expect(extractImageFileFromDataTransfer(dt)).toBe(heic);
  });

  it("allows dragover when types are empty (WebKit file drag)", () => {
    const dt = { types: [], files: [], items: [] } as unknown as DataTransfer;
    expect(shouldAllowTimelineFileDragOver(dt)).toBe(true);
    expect(isTimelineExternalFileDrag(dt)).toBe(false);
  });

  it("detects file drag via dataTransfer.items", () => {
    const dt = {
      types: [],
      files: [],
      items: [{ kind: "file" }],
    } as unknown as DataTransfer;
    expect(isTimelineExternalFileDrag(dt)).toBe(true);
  });

  it("findBlockAtTime returns covering block", () => {
    const blocks = [{ id: "a", startSec: 0, endSec: 10, title: "A" }];
    expect(findBlockAtTime(blocks, 5)?.id).toBe("a");
    expect(findBlockAtTime(blocks, 11)).toBeUndefined();
  });

  it("resolveSequenceParentAtTime picks exact or nearest", () => {
    const seqs = [
      { id: "s1", startSec: 0, endSec: 30, title: "Seq 1" },
      { id: "s2", startSec: 30, endSec: 60, title: "Seq 2" },
    ];
    expect(resolveSequenceParentAtTime(seqs, 40)?.id).toBe("s2");
    expect(resolveSequenceParentAtTime(seqs, 5)?.id).toBe("s1");
    expect(resolveSequenceParentAtTime([], 5)).toBeUndefined();
  });

  it("resolveSceneParentAtTime picks exact or nearest", () => {
    const scenes = [{ id: "sc1", startSec: 10, endSec: 20, title: "Scene" }];
    expect(resolveSceneParentAtTime(scenes, 15)?.id).toBe("sc1");
    expect(resolveSceneParentAtTime(scenes, 25)?.id).toBe("sc1");
  });
});
