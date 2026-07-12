import { describe, it, expect } from "vitest";
import {
  mveDialogClipLayoutTier,
  mveEmotionDisplayLabel,
  maxVisualContentEndSecInScene,
  resolveMveDialogClipWidthPx,
  resolveMveLineVisualSpanMap,
  resolveMveLineVisualSpanMapWithDraft,
} from "@/lib/mve/mve-dialog-clip-layout";
import { resolveLaneHeightPx, LANE_UI } from "@/lib/audio-lane";
import { LANE_SCHEMA } from "@/lib/types";

describe("mve-dialog-clip-layout", () => {
  it("classifies width tiers", () => {
    expect(mveDialogClipLayoutTier(80)).toBe("compact");
    expect(mveDialogClipLayoutTier(200)).toBe("medium");
    expect(mveDialogClipLayoutTier(400)).toBe("full");
  });

  it("maps emotion labels for display", () => {
    expect(mveEmotionDisplayLabel("serious")).toBe("sachlich");
    expect(mveEmotionDisplayLabel(undefined)).toBeNull();
  });

  it("caps clip width to scene bounds", () => {
    const pxPerSec = 100;
    const sceneBlock = { startSec: 10, endSec: 14 };
    expect(resolveMveDialogClipWidthPx(10, 20, pxPerSec, sceneBlock)).toBe(400);
  });

  it("does not exceed a narrow scene width", () => {
    const pxPerSec = 100;
    const sceneBlock = { startSec: 10, endSec: 10.5 };
    expect(resolveMveDialogClipWidthPx(10, 11, pxPerSec, sceneBlock)).toBe(50);
  });

  it("respects min width when scene is wide enough", () => {
    const pxPerSec = 10;
    const sceneBlock = { startSec: 0, endSec: 60 };
    expect(resolveMveDialogClipWidthPx(0, 1, pxPerSec, sceneBlock)).toBe(220);
  });

  it("keeps full clip width when scene shell moved away (orphan clip)", () => {
    const pxPerSec = 100;
    const sceneBlock = { startSec: 600, endSec: 700 };
    expect(resolveMveDialogClipWidthPx(0, 10, pxPerSec, sceneBlock)).toBe(1000);
  });
});

describe("resolveMveLineVisualSpanMap", () => {
  const sceneBlock = { id: "scene-1", startSec: 10, endSec: 40 };
  const pxPerSec = 20;

  it("stacks second block after min-width of WPM text block", () => {
    const tenWords = "one two three four five six seven eight nine ten";
    const lines = [
      {
        id: "l1",
        sceneId: "scene-1",
        orderIndex: 0,
        text: tenWords,
      },
      {
        id: "l2",
        sceneId: "scene-1",
        orderIndex: 1,
        text: "",
      },
    ] as import("@/lib/multi-voice-engine/schema/line").MveLine[];

    const map = resolveMveLineVisualSpanMap(lines, [sceneBlock], pxPerSec);
    const first = map.get("l1")!;
    const second = map.get("l2")!;
    expect(second.startSec).toBeGreaterThanOrEqual(first.endSec - 1e-6);
  });

  it("maxVisualContentEndSecInScene includes min-width stacking", () => {
    const tightScene = {
      id: "scene-1",
      startSec: 10,
      endSec: 15,
    };
    const lines = [
      {
        id: "l1",
        sceneId: "scene-1",
        orderIndex: 0,
        text: "",
      },
      {
        id: "l2",
        sceneId: "scene-1",
        orderIndex: 1,
        text: "",
      },
    ] as import("@/lib/multi-voice-engine/schema/line").MveLine[];
    const end = maxVisualContentEndSecInScene(tightScene, lines, 20);
    expect(end).toBeGreaterThan(15);
  });

  it("caps stacked visual spans to scene end for render", () => {
    const tightScene = {
      id: "scene-1",
      startSec: 10,
      endSec: 15,
    };
    const lines = [
      { id: "l1", sceneId: "scene-1", orderIndex: 0, text: "" },
      { id: "l2", sceneId: "scene-1", orderIndex: 1, text: "" },
      { id: "l3", sceneId: "scene-1", orderIndex: 2, text: "" },
    ] as import("@/lib/multi-voice-engine/schema/line").MveLine[];
    const map = resolveMveLineVisualSpanMap(lines, [tightScene], 20);
    for (const span of map.values()) {
      expect(span.endSec).toBeLessThanOrEqual(15 + 1e-6);
      expect(span.startSec).toBeGreaterThanOrEqual(10 - 1e-6);
    }
  });

  it("extends scene end at low pxPerSec when min-width blocks exceed shell pixels", () => {
    const scene = { id: "scene-1", startSec: 100, endSec: 120 };
    const lines = [
      { id: "l1", sceneId: "scene-1", orderIndex: 0, text: "" },
      { id: "l2", sceneId: "scene-1", orderIndex: 1, text: "" },
      { id: "l3", sceneId: "scene-1", orderIndex: 2, text: "" },
    ] as import("@/lib/multi-voice-engine/schema/line").MveLine[];
    const pxPerSec = 2;
    const requiredEnd = maxVisualContentEndSecInScene(scene, lines, pxPerSec);
    expect(requiredEnd).toBeGreaterThan(120);
    expect((requiredEnd - 100) * pxPerSec).toBeGreaterThanOrEqual(220 * 3 - 1);
  });
});

describe("resolveLaneHeightPx", () => {
  it("uses taller height for character dialog lanes by default", () => {
    expect(resolveLaneHeightPx(0, null)).toBe(LANE_UI.heightDialogCompact);
    expect(resolveLaneHeightPx(0, 0)).toBe(LANE_UI.heightDialogExpanded);
  });

  it("uses standard height for sfx lanes", () => {
    expect(resolveLaneHeightPx(LANE_SCHEMA.sfx.base, null)).toBe(
      LANE_UI.heightCompact,
    );
  });

  it("shrinks empty dialog lanes to the compact standard height", () => {
    expect(resolveLaneHeightPx(0, null, false)).toBe(LANE_UI.heightDialogEmpty);
  });

  it("keeps full compact height once a dialog lane has content", () => {
    expect(resolveLaneHeightPx(0, null, true)).toBe(
      LANE_UI.heightDialogCompact,
    );
  });

  it("expanded dialog lane ignores hasContent", () => {
    expect(resolveLaneHeightPx(0, 0, false)).toBe(LANE_UI.heightDialogExpanded);
  });

  it("non-dialog lanes ignore hasContent", () => {
    expect(resolveLaneHeightPx(LANE_SCHEMA.sfx.base, null, false)).toBe(
      LANE_UI.heightCompact,
    );
  });
});
