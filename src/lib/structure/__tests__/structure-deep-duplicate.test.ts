import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  duplicateActDeep,
  duplicateSceneDeep,
  duplicateSequenceDeep,
} from "../structure-deep-duplicate";

vi.mock("@/lib/api-adapter/timeline-structure-adapter", () => ({
  getActs: vi.fn(),
  createAct: vi.fn(),
  createSequence: vi.fn(),
  createScene: vi.fn(),
}));

vi.mock("@/lib/api/shots-api", () => ({
  createShot: vi.fn(),
}));

import * as TimelineAPI from "@/lib/api-adapter/timeline-structure-adapter";
import * as ShotsAPI from "@/lib/api/shots-api";

const token = "tok";

describe("structure-deep-duplicate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("duplicateSceneDeep copies shots under the new scene", async () => {
    (TimelineAPI.createScene as any).mockResolvedValue({
      id: "scene-new",
      sequenceId: "seq-1",
    });
    (ShotsAPI.createShot as any).mockResolvedValue({ id: "shot-new" });

    const result = await duplicateSceneDeep({
      sceneId: "scene-1",
      projectId: "proj-1",
      token,
      scenes: [
        {
          id: "scene-1",
          sequenceId: "seq-1",
          sceneNumber: 1,
          title: "Scene A",
          projectId: "proj-1",
          createdAt: "",
          updatedAt: "",
        },
      ],
      shots: [
        {
          id: "shot-1",
          sceneId: "scene-1",
          shotNumber: "1",
          projectId: "proj-1",
        } as any,
        {
          id: "shot-2",
          sceneId: "scene-1",
          shotNumber: "2",
          projectId: "proj-1",
        } as any,
      ],
    });

    expect(result.shotsCreated).toBe(2);
    expect(ShotsAPI.createShot).toHaveBeenCalledTimes(2);
    expect(TimelineAPI.createScene).toHaveBeenCalledWith(
      "seq-1",
      expect.objectContaining({ title: "Scene A (Kopie)" }),
      token,
    );
  });

  it("duplicateSequenceDeep copies scenes and shots", async () => {
    (TimelineAPI.createSequence as any).mockResolvedValue({
      id: "seq-new",
      actId: "act-1",
    });
    (TimelineAPI.createScene as any).mockResolvedValue({ id: "scene-new" });
    (ShotsAPI.createShot as any).mockResolvedValue({ id: "shot-new" });

    const result = await duplicateSequenceDeep({
      sequenceId: "seq-1",
      projectId: "proj-1",
      token,
      sequences: [
        {
          id: "seq-1",
          actId: "act-1",
          sequenceNumber: 1,
          title: "Seq A",
          projectId: "proj-1",
          orderIndex: 0,
          createdAt: "",
          updatedAt: "",
        },
      ],
      scenes: [
        {
          id: "scene-1",
          sequenceId: "seq-1",
          sceneNumber: 1,
          title: "Scene A",
          projectId: "proj-1",
          createdAt: "",
          updatedAt: "",
        },
      ],
      shots: [
        {
          id: "shot-1",
          sceneId: "scene-1",
          shotNumber: "1",
          projectId: "proj-1",
        } as any,
      ],
    });

    expect(result.sequencesCreated).toBe(1);
    expect(result.scenesCreated).toBe(1);
    expect(result.shotsCreated).toBe(1);
  });

  it("duplicateActDeep copies full subtree", async () => {
    (TimelineAPI.getActs as any).mockResolvedValue([
      { id: "act-1", actNumber: 1 },
    ]);
    (TimelineAPI.createAct as any).mockResolvedValue({ id: "act-new" });
    (TimelineAPI.createSequence as any).mockResolvedValue({ id: "seq-new" });
    (TimelineAPI.createScene as any).mockResolvedValue({ id: "scene-new" });
    (ShotsAPI.createShot as any).mockResolvedValue({ id: "shot-new" });

    const result = await duplicateActDeep({
      actId: "act-1",
      projectId: "proj-1",
      token,
      acts: [
        {
          id: "act-1",
          actNumber: 1,
          title: "Act 1",
          projectId: "proj-1",
          orderIndex: 0,
          createdAt: "",
          updatedAt: "",
        },
      ],
      sequences: [
        {
          id: "seq-1",
          actId: "act-1",
          sequenceNumber: 1,
          title: "Seq",
          projectId: "proj-1",
          orderIndex: 0,
          createdAt: "",
          updatedAt: "",
        },
      ],
      scenes: [
        {
          id: "scene-1",
          sequenceId: "seq-1",
          sceneNumber: 1,
          title: "Scene",
          projectId: "proj-1",
          createdAt: "",
          updatedAt: "",
        },
      ],
      shots: [
        {
          id: "shot-1",
          sceneId: "scene-1",
          shotNumber: "1",
          projectId: "proj-1",
        } as any,
      ],
    });

    expect(result.sequencesCreated).toBe(1);
    expect(result.scenesCreated).toBe(1);
    expect(result.shotsCreated).toBe(1);
    expect(TimelineAPI.createAct).toHaveBeenCalled();
    expect(TimelineAPI.createSequence).toHaveBeenCalled();
    expect(TimelineAPI.createScene).toHaveBeenCalled();
    expect(ShotsAPI.createShot).toHaveBeenCalled();
  });
});
