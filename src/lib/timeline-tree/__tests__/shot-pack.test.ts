import { describe, expect, it } from "vitest";
import { packShotsInSceneFrames, readShotDurationSec } from "../shot-pack";
import { DEFAULT_FRAME_RATE, DEFAULT_MIN_ITEM_DURATION_FRAMES } from "../types";

describe("packShotsInSceneFrames", () => {
  it("reads shot duration from duration string", () => {
    expect(readShotDurationSec({ id: "s1", duration: "12s" })).toBe(12);
  });

  it("packs multiple shots to fill scene hull", () => {
    const sceneStartFrame = 0;
    const sceneEndFrame = 900;
    const packed = packShotsInSceneFrames({
      sceneId: "scene-1",
      sceneStartFrame,
      sceneEndFrame,
      shots: [
        { id: "sh-1", orderIndex: 0, duration: "10s" },
        { id: "sh-2", orderIndex: 1, duration: "20s" },
      ],
      frameRate: DEFAULT_FRAME_RATE,
      minDurationFrames: DEFAULT_MIN_ITEM_DURATION_FRAMES,
    });

    expect(packed).toHaveLength(2);
    expect(packed[0]!.startFrame).toBe(sceneStartFrame);
    expect(packed[1]!.endFrame).toBe(sceneEndFrame);
    expect(packed[0]!.endFrame).toBe(packed[1]!.startFrame);
    const total = packed[packed.length - 1]!.endFrame - packed[0]!.startFrame;
    expect(total).toBe(sceneEndFrame - sceneStartFrame);
  });

  it("uses equal slots when durations missing", () => {
    const packed = packShotsInSceneFrames({
      sceneId: "scene-1",
      sceneStartFrame: 0,
      sceneEndFrame: 300,
      shots: [
        { id: "sh-1", orderIndex: 0 },
        { id: "sh-2", orderIndex: 1 },
      ],
      frameRate: DEFAULT_FRAME_RATE,
      minDurationFrames: DEFAULT_MIN_ITEM_DURATION_FRAMES,
    });
    expect(packed[0]!.endFrame - packed[0]!.startFrame).toBe(
      packed[1]!.endFrame - packed[1]!.startFrame,
    );
  });
});
