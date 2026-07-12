/**
 * Audio playback engine — active clip detection (Epic T55).
 */

import { describe, expect, it } from "vitest";
import type { AudioClip } from "@/lib/types";
import {
  clipLocalOffsetSec,
  findActiveAudioClips,
} from "../useTimelinePlaybackAudioEngine";

const clip = (id: string, start: number, end: number): AudioClip =>
  ({
    id,
    startSec: start,
    endSec: end,
    audioFileId: `file-${id}`,
    projectId: "p1",
    laneIndex: 0,
  }) as AudioClip;

describe("useTimelinePlaybackAudioEngine helpers", () => {
  it("findActiveAudioClips returns clips covering time", () => {
    const clips = [clip("a", 0, 5), clip("b", 5, 10)];
    expect(findActiveAudioClips(clips, 2).map((c) => c.id)).toEqual(["a"]);
    expect(findActiveAudioClips(clips, 5).map((c) => c.id)).toEqual(["b"]);
    expect(findActiveAudioClips(clips, 10)).toEqual([]);
  });

  it("clipLocalOffsetSec returns offset from clip start", () => {
    expect(clipLocalOffsetSec(clip("a", 10, 20), 15)).toBe(5);
    expect(clipLocalOffsetSec(clip("a", 10, 20), 8)).toBe(0);
  });
});
