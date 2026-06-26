/**
 * Unit tests for audio ripple local persistence (T29).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RippleOutput } from "../../ripple-engine-types";
import type { TreePatch } from "../../timeline-tree/diff";
import type { AudioClip } from "../../types";

vi.mock("../../api-adapter/clips-local", () => ({
  localUpdateClip: vi.fn(),
}));

vi.mock("../../api-adapter/runtime-dispatch", () => ({
  requireLocalBackend: vi.fn(),
}));

import { localUpdateClip } from "../../api-adapter/clips-local";
import { requireLocalBackend } from "../../api-adapter/runtime-dispatch";
import {
  mergeStructurePatchMetadata,
  persistAudioRippleWithRollback,
} from "../persist-audio-ripple-local";

const patch: TreePatch = {
  id: "scene-1",
  kind: "scene",
  parentId: "seq-1",
  orderIndex: 0,
  startFrame: 0,
  endFrame: 100,
  durationFrames: 100,
  startSec: 0,
  endSec: 10,
  durationSec: 10,
  pct_from: 0,
  pct_to: 60,
};

describe("mergeStructurePatchMetadata", () => {
  it("preserves non-pct metadata keys", () => {
    const merged = mergeStructurePatchMetadata(
      { locked: true, pct_from: 0, custom_tag: "intro" },
      { pct_from: 10, pct_to: 60 },
    );
    expect(merged).toEqual({
      locked: true,
      custom_tag: "intro",
      pct_from: 10,
      pct_to: 60,
    });
  });
});

describe("persistAudioRippleWithRollback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rolls back structure when clip persist fails mid-way", async () => {
    const structureUpdate = vi.fn();
    vi.mocked(requireLocalBackend).mockReturnValue({
      structure: {
        getNode: vi.fn(async () => ({
          id: "scene-1",
          orderIndex: 0,
          metadata: { pct_from: 0, pct_to: 50, note: "keep" },
        })),
        update: structureUpdate,
      },
    } as never);

    vi.mocked(localUpdateClip)
      .mockResolvedValueOnce({} as AudioClip)
      .mockRejectedValueOnce(new Error("clip fail"));

    const originalClips: AudioClip[] = [
      {
        id: "c1",
        sceneId: "scene-1",
        startSec: 0,
        endSec: 5,
      } as AudioClip,
      {
        id: "c2",
        sceneId: "scene-2",
        startSec: 10,
        endSec: 15,
      } as AudioClip,
    ];

    const clipRipple: RippleOutput = {
      updatedClips: [
        { id: "c1", sceneId: "scene-1", startSec: 0, endSec: 6 },
        { id: "c2", sceneId: "scene-2", startSec: 11, endSec: 16 },
      ],
      updatedScenes: [],
      updatedSequences: [],
      updatedActs: [],
      stats: {
        affectedClips: 2,
        affectedScenes: 0,
        affectedSequences: 0,
        affectedActs: 0,
        deltaSec: 1,
      },
    };

    await expect(
      persistAudioRippleWithRollback([patch], originalClips, clipRipple),
    ).rejects.toThrow("clip fail");

    expect(structureUpdate).toHaveBeenCalledWith(
      "scene-1",
      expect.objectContaining({
        metadata: expect.objectContaining({ note: "keep", pct_to: 60 }),
      }),
    );
    expect(structureUpdate).toHaveBeenCalledWith(
      "scene-1",
      expect.objectContaining({
        metadata: expect.objectContaining({ note: "keep", pct_to: 50 }),
      }),
    );
    expect(localUpdateClip).toHaveBeenCalledWith("c1", {
      startSec: 0,
      endSec: 5,
    });
  });
});
