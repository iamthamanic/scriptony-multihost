import { describe, expect, it } from "vitest";
import {
  getTimelineClipImageLayout,
  timelineClipPreviewUrl,
} from "../timeline-clip-preview-url";

describe("timelineClipPreviewUrl", () => {
  it("prefers camelCase then snake_case fields", () => {
    expect(timelineClipPreviewUrl({ imageUrl: "a" })).toBe("a");
    expect(timelineClipPreviewUrl({ image_url: "b" })).toBe("b");
    expect(timelineClipPreviewUrl({ thumbnailUrl: "c" })).toBe("c");
  });
});

describe("getTimelineClipImageLayout", () => {
  it("uses full bleed for narrow and wide clips when image exists", () => {
    expect(getTimelineClipImageLayout(30, "x")).toEqual({
      fullBleed: true,
      sideThumb: false,
      showPlaceholder: false,
    });
    expect(getTimelineClipImageLayout(120, "x")).toEqual({
      fullBleed: true,
      sideThumb: false,
      showPlaceholder: false,
    });
  });

  it("uses side thumb for medium widths", () => {
    expect(getTimelineClipImageLayout(60, "x")).toEqual({
      fullBleed: false,
      sideThumb: true,
      showPlaceholder: false,
    });
  });

  it("shows placeholder when no image and clip is wide enough", () => {
    expect(getTimelineClipImageLayout(80, "")).toEqual({
      fullBleed: false,
      sideThumb: false,
      showPlaceholder: true,
    });
  });
});
