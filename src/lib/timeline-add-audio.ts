/**
 * Timeline Add-Audio — create tracks/clips on a DAW lane at a timeline position.
 */

import * as ClipAPI from "./api/audio-clip-api";
import { assignLaneIndex, laneIndexToTrackType } from "./audio-lane";
import { isCharacterDialogLane } from "./character-lane-map";
import type { AudioClip, AudioTrackType } from "./types";
import { estimateDurationSec } from "./audio-utils";
import { createAudioTrack } from "@/lib/api-adapter/audio-story-adapter";
import { resolveDomainAuthTokenOrEmpty } from "./api-adapter/domain-access";
import { isFeatureEnabled } from "./feature-flags";
export interface TimelineSceneRef {
  id: string;
  orderIndex?: number;
}

export interface TimelineSceneTiming {
  id: string;
  startSec: number;
  endSec: number;
}

export function resolveSceneIdForTimeline(
  scenes: TimelineSceneRef[],
  timeSec: number,
  sceneTiming?: TimelineSceneTiming[],
): string | undefined {
  if (sceneTiming?.length) {
    const hit = sceneTiming.find(
      (s) => timeSec >= s.startSec && timeSec < s.endSec,
    );
    if (hit) return hit.id;
  }
  const sorted = [...scenes].sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
  );
  return sorted[0]?.id;
}

export interface CreateTimelineAudioParams {
  projectId: string;
  projectType?: string | null;
  sceneId: string;
  laneIndex: number;
  startSec: number;
  trackType?: AudioTrackType;
  content?: string;
  characterId?: string;
}

/** Create track (+ clip when clip system active) on the given lane. */
export async function createTimelineAudioOnLane(
  params: CreateTimelineAudioParams,
): Promise<{ trackId: string; clipId?: string }> {
  const {
    projectId,
    projectType,
    sceneId,
    laneIndex,
    startSec,
    content = "",
    characterId,
  } = params;
  const trackType = params.trackType ?? laneIndexToTrackType(laneIndex);

  let laneForTrack = laneIndex;
  if (isFeatureEnabled("audioClipSystem") && !characterId) {
    const token = await resolveDomainAuthTokenOrEmpty();
    const existingClips = await ClipAPI.getClipsByScene(sceneId, token);
    const wpmEstimate = estimateDurationSec(content, { type: trackType });
    const draft = {
      id: "pending",
      trackId: "pending",
      sceneId,
      projectId,
      startSec,
      endSec: startSec + wpmEstimate,
      laneIndex,
      orderIndex: existingClips.length,
      trackType,
      createdAt: "",
      updatedAt: "",
    } satisfies AudioClip;
    laneForTrack = assignLaneIndex(existingClips, draft);
  }

  const { track, clip } = await createAudioTrack(sceneId, projectId, {
    type: trackType === "narrator" ? "dialog" : trackType,
    content,
    characterId,
    startTime: startSec,
    duration: estimateDurationSec(content, { type: trackType }),
    ...(isFeatureEnabled("audioClipSystem") ? { laneIndex: laneForTrack } : {}),
  });

  if (isFeatureEnabled("audioClipSystem") && clip?.id) {
    await ClipAPI.updateClip(
      clip.id,
      {
        startSec,
        endSec: clip.endSec,
        laneIndex: laneForTrack,
        ...(characterId ? { characterId } : {}),
      },
      await resolveDomainAuthTokenOrEmpty(),
    );
  }

  return { trackId: track.id, clipId: clip?.id };
}

/** Attach uploaded/recorded blob URL to clip (local preview path). */
export async function attachAudioBlobToClip(
  clipId: string,
  audioFileId: string,
  waveformData?: number[],
): Promise<void> {
  const token = await resolveDomainAuthTokenOrEmpty();
  await ClipAPI.updateClip(
    clipId,
    { audioFileId, ...(waveformData ? { waveformData } : {}) },
    token,
  );
}

/** Simple peak envelope from AudioBuffer (for timeline waveform). */
export function peaksFromAudioBuffer(
  buffer: AudioBuffer,
  samples = 64,
): number[] {
  const data = buffer.getChannelData(0);
  const block = Math.max(1, Math.floor(data.length / samples));
  const peaks: number[] = [];
  for (let i = 0; i < samples; i++) {
    let max = 0;
    const start = i * block;
    const end = Math.min(start + block, data.length);
    for (let j = start; j < end; j++) {
      max = Math.max(max, Math.abs(data[j]));
    }
    peaks.push(max);
  }
  return peaks;
}

export async function decodeAudioFileToPeaks(file: File): Promise<{
  objectUrl: string;
  peaks: number[];
  durationSec: number;
}> {
  const objectUrl = URL.createObjectURL(file);
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    return {
      objectUrl,
      peaks: peaksFromAudioBuffer(audioBuffer),
      durationSec: audioBuffer.duration,
    };
  } finally {
    await ctx.close();
  }
}
