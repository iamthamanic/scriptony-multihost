import { describe, expect, it, vi, beforeEach } from "vitest";
import { persistRipplePatches } from "../persist";
import * as TimelineAPI from "../../api/timeline-api";
import * as ShotsAdapter from "../../api-adapter/shots-adapter";

vi.mock("../../api/timeline-api", () => ({
  updateAct: vi.fn(),
  updateSequence: vi.fn(),
  updateScene: vi.fn(),
}));

vi.mock("../../api-adapter/shots-adapter", () => ({
  updateShot: vi.fn(),
}));

describe("persistRipplePatches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists in topological order", async () => {
    vi.mocked(TimelineAPI.updateAct).mockResolvedValue({} as never);
    vi.mocked(TimelineAPI.updateSequence).mockResolvedValue({} as never);
    vi.mocked(TimelineAPI.updateScene).mockResolvedValue({} as never);
    vi.mocked(ShotsAdapter.updateShot).mockResolvedValue({} as never);

    const patches = [
      {
        id: "act-1",
        kind: "act" as const,
        parentId: null,
        orderIndex: 0,
        startFrame: 0,
        endFrame: 1800,
        durationFrames: 1800,
        startSec: 0,
        endSec: 60,
        durationSec: 60,
        pct_from: 0,
        pct_to: 50,
      },
      {
        id: "shot-1",
        kind: "shot" as const,
        parentId: "scene-1",
        orderIndex: 0,
        startFrame: 0,
        endFrame: 300,
        durationFrames: 300,
        startSec: 0,
        endSec: 10,
        durationSec: 10,
      },
    ];

    const result = await persistRipplePatches({
      patches,
      token: "tok",
    });

    expect(result.ok).toBe(true);
    expect(TimelineAPI.updateAct).toHaveBeenCalled();
    expect(ShotsAdapter.updateShot).toHaveBeenCalled();
    const actOrder = vi.mocked(TimelineAPI.updateAct).mock
      .invocationCallOrder[0];
    const shotOrder = vi.mocked(ShotsAdapter.updateShot).mock
      .invocationCallOrder[0];
    expect(actOrder).toBeLessThan(shotOrder);
  });

  it("partial_api_failure_returns_failed", async () => {
    vi.mocked(TimelineAPI.updateAct).mockRejectedValue(new Error("fail"));
    const result = await persistRipplePatches({
      patches: [
        {
          id: "act-1",
          kind: "act",
          parentId: null,
          orderIndex: 0,
          startFrame: 0,
          endFrame: 100,
          durationFrames: 100,
          startSec: 0,
          endSec: 1,
          durationSec: 1,
          pct_from: 0,
          pct_to: 50,
        },
      ],
      token: "tok",
    });
    expect(result.ok).toBe(false);
    expect(result.failed).toContain("act-1");
  });

  it("skips temp ids", async () => {
    const result = await persistRipplePatches({
      patches: [
        {
          id: "temp-act-1",
          kind: "act",
          parentId: null,
          orderIndex: 0,
          startFrame: 0,
          endFrame: 100,
          durationFrames: 100,
          startSec: 0,
          endSec: 1,
          durationSec: 1,
        },
      ],
      token: "tok",
    });
    expect(result.ok).toBe(true);
    expect(TimelineAPI.updateAct).not.toHaveBeenCalled();
  });
});
