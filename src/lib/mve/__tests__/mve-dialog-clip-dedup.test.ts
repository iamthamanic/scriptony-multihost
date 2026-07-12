/**
 * Tests for MVE dialog clip dedup helpers.
 * Location: src/lib/mve/__tests__/mve-dialog-clip-dedup.test.ts
 */

import { describe, expect, it } from "vitest";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { AudioClip } from "@/lib/types";
import {
  findBindableTextOnlyLine,
  shouldSkipMveDialogClipSegment,
} from "../mve-dialog-clip-dedup";

const ts = "2026-01-01T00:00:00.000Z";

function line(partial: Partial<MveLine> & Pick<MveLine, "id">): MveLine {
  return {
    sceneId: "scene_1",
    orderIndex: 0,
    type: "dialogue",
    status: "draft",
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

const baseClip: AudioClip = {
  id: "clip_1",
  trackId: "t1",
  sceneId: "scene_1",
  projectId: "proj_1",
  startSec: 0,
  endSec: 3,
  laneIndex: 10,
  orderIndex: 0,
  trackType: "dialog",
  characterId: "char_a",
  content: "Hallo.",
  createdAt: ts,
  updatedAt: ts,
};

describe("findBindableTextOnlyLine", () => {
  it("returns lowest orderIndex unbound line for character+scene", () => {
    const lines = [
      line({ id: "line_b", orderIndex: 2, characterId: "char_a" }),
      line({ id: "line_a", orderIndex: 0, characterId: "char_a" }),
      line({
        id: "line_bound",
        orderIndex: 1,
        characterId: "char_a",
        audioClipId: "clip_x",
      }),
    ];
    expect(findBindableTextOnlyLine(lines, baseClip)?.id).toBe("line_a");
  });

  it("returns undefined when all lines are bound or other character", () => {
    const lines = [
      line({
        id: "line_bound",
        characterId: "char_a",
        audioClipId: "clip_x",
      }),
      line({ id: "line_other", characterId: "char_b" }),
    ];
    expect(findBindableTextOnlyLine(lines, baseClip)).toBeUndefined();
  });
});

describe("shouldSkipMveDialogClipSegment", () => {
  it("skips when unbound text-only sibling exists for same character+scene", () => {
    const bound = line({
      id: "line_bound",
      characterId: "char_a",
      audioClipId: "clip_1",
    });
    const textOnly = [line({ id: "line_text", characterId: "char_a" })];
    expect(shouldSkipMveDialogClipSegment(baseClip, bound, textOnly)).toBe(
      true,
    );
  });

  it("does not skip when only bound line exists", () => {
    const bound = line({
      id: "line_bound",
      characterId: "char_a",
      audioClipId: "clip_1",
    });
    expect(shouldSkipMveDialogClipSegment(baseClip, bound, [])).toBe(false);
  });

  it("does not skip without bound line", () => {
    const textOnly = [line({ id: "line_text", characterId: "char_a" })];
    expect(shouldSkipMveDialogClipSegment(baseClip, undefined, textOnly)).toBe(
      false,
    );
  });
});
