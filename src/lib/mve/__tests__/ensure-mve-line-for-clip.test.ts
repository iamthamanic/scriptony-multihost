/**
 * Tests for MVE line creation helper.
 * Location: src/lib/mve/__tests__/ensure-mve-line-for-clip.test.ts
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AudioClip } from "@/lib/types";

vi.mock("@/lib/api-adapter/runtime-dispatch", () => ({
  isLocalProfile: vi.fn(() => true),
}));

vi.mock("@/lib/api-adapter/mve-adapter", () => ({
  getMveLineByAudioClipId: vi.fn(),
  createMveLine: vi.fn(),
}));

import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import {
  createMveLine,
  getMveLineByAudioClipId,
} from "@/lib/api-adapter/mve-adapter";
import { ensureMveLineForClip } from "../ensure-mve-line-for-clip";

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
  content: "Hallo.",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("ensureMveLineForClip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isLocalProfile).mockReturnValue(true);
    vi.mocked(getMveLineByAudioClipId).mockResolvedValue(null);
    vi.mocked(createMveLine).mockResolvedValue({
      id: "line_1",
      sceneId: "scene_1",
      orderIndex: 0,
      type: "dialogue",
      text: "Hallo.",
      status: "draft",
      audioClipId: "clip_1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("creates a line for dialog clips", async () => {
    const line = await ensureMveLineForClip({
      projectId: "proj_1",
      clip: baseClip,
    });
    expect(line?.audioClipId).toBe("clip_1");
    expect(createMveLine).toHaveBeenCalledWith(
      "proj_1",
      expect.objectContaining({
        audioClipId: "clip_1",
        text: "Hallo.",
      }),
    );
  });

  it("skips sfx clips", async () => {
    const line = await ensureMveLineForClip({
      projectId: "proj_1",
      clip: { ...baseClip, trackType: "sfx" },
    });
    expect(line).toBeNull();
    expect(createMveLine).not.toHaveBeenCalled();
  });

  it("returns existing line without create", async () => {
    vi.mocked(getMveLineByAudioClipId).mockResolvedValue({
      id: "existing",
      sceneId: "scene_1",
      orderIndex: 0,
      type: "dialogue",
      status: "draft",
      audioClipId: "clip_1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const line = await ensureMveLineForClip({
      projectId: "proj_1",
      clip: baseClip,
    });
    expect(line?.id).toBe("existing");
    expect(createMveLine).not.toHaveBeenCalled();
  });
});
