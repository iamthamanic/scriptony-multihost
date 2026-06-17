import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  addClipToAudioTimelineCache,
  removeClipsFromAudioTimelineCache,
} from "../../lib/audio-timeline-cache";
import { queryKeys } from "../../lib/react-query";
import type { AudioTimelineData } from "../../lib/types/audio-timeline";
import type { AudioClip } from "../../lib/types";

function clip(id: string, laneIndex: number): AudioClip {
  return {
    id,
    trackId: "t1",
    sceneId: "s1",
    projectId: "p1",
    startSec: 0,
    endSec: 1,
    laneIndex,
    orderIndex: 0,
    createdAt: "",
    updatedAt: "",
  };
}

describe("audio-timeline-cache", () => {
  it("addClipToAudioTimelineCache appends clip to scene bucket", () => {
    const qc = new QueryClient();
    const data: AudioTimelineData = {
      acts: [],
      sequences: [],
      scenes: [],
      tracksByScene: {},
      clipsByScene: { s1: [clip("c1", 100)] },
      voiceAssignments: {},
    };
    qc.setQueryData(queryKeys.timeline.audioByProject("p1"), data);

    addClipToAudioTimelineCache(qc, "p1", clip("c2", 101));

    const next = qc.getQueryData<AudioTimelineData>(
      queryKeys.timeline.audioByProject("p1"),
    );
    expect(next?.clipsByScene.s1?.map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  it("removeClipsFromAudioTimelineCache drops empty scene buckets", () => {
    const qc = new QueryClient();
    const data: AudioTimelineData = {
      acts: [],
      sequences: [],
      scenes: [],
      tracksByScene: {},
      clipsByScene: { s1: [clip("c1", 100)] },
      voiceAssignments: {},
    };
    qc.setQueryData(queryKeys.timeline.audioByProject("p1"), data);

    removeClipsFromAudioTimelineCache(qc, "p1", new Set(["c1"]));

    const next = qc.getQueryData<AudioTimelineData>(
      queryKeys.timeline.audioByProject("p1"),
    );
    expect(next?.clipsByScene.s1).toBeUndefined();
  });
});
