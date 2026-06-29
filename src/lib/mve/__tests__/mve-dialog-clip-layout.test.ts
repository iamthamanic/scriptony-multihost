import { describe, it, expect } from "vitest";
import {
  mveDialogClipLayoutTier,
  mveEmotionDisplayLabel,
  resolveMveDialogClipWidthPx,
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
});

describe("resolveLaneHeightPx", () => {
  it("uses taller height for character dialog lanes", () => {
    expect(resolveLaneHeightPx(0, null)).toBe(LANE_UI.heightDialogCompact);
    expect(resolveLaneHeightPx(0, 0)).toBe(LANE_UI.heightDialogExpanded);
  });

  it("uses standard height for sfx lanes", () => {
    expect(resolveLaneHeightPx(LANE_SCHEMA.sfx.base, null)).toBe(
      LANE_UI.heightCompact,
    );
  });
});
