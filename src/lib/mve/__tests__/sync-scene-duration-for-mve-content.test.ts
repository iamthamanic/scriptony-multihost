/**
 * Unit tests for sync-scene-duration-for-mve-content.
 */

import { describe, it, expect } from "vitest";
import {
  sceneNeedsContentDurationSync,
  SCENE_CONTENT_DURATION_EPS_SEC,
} from "../sync-scene-duration-for-mve-content";
import { resolveMveLineVisualSpanMapWithDraft } from "../mve-dialog-clip-layout";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";

describe("sceneNeedsContentDurationSync", () => {
  it("detects grow and shrink beyond frame epsilon", () => {
    expect(sceneNeedsContentDurationSync(40, 50)).toBe(true);
    expect(sceneNeedsContentDurationSync(50, 40)).toBe(true);
  });

  it("ignores sub-frame drift", () => {
    const eps = SCENE_CONTENT_DURATION_EPS_SEC / 2;
    expect(sceneNeedsContentDurationSync(40, 40 + eps)).toBe(false);
  });
});

describe("resolveMveLineVisualSpanMapWithDraft", () => {
  const sceneBlock = { id: "scene-1", startSec: 10, endSec: 40 };
  const line = {
    id: "l1",
    sceneId: "scene-1",
    orderIndex: 0,
    text: "",
    type: "dialogue",
    status: "draft",
    createdAt: "",
    updatedAt: "",
  } as MveLine;

  it("uses draft text for WPM span before save", () => {
    const tenWords = "one two three four five six seven eight nine ten";
    const emptyMap = resolveMveLineVisualSpanMapWithDraft(
      [line],
      [sceneBlock],
      20,
      line.id,
      "",
    );
    const draftMap = resolveMveLineVisualSpanMapWithDraft(
      [line],
      [sceneBlock],
      20,
      line.id,
      tenWords,
    );
    const emptySpan = emptyMap.get("l1")!;
    const draftSpan = draftMap.get("l1")!;
    expect(draftSpan.endSec - draftSpan.startSec).toBeLessThan(
      emptySpan.endSec - emptySpan.startSec,
    );
  });
});
