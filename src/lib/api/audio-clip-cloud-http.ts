/**
 * Cloud audio clip API (scriptony-audio-story).
 */

import { apiRequest, unwrapApiResult } from "../api-client";
import type { RippleAct, RippleScene, RippleSequence } from "../ripple-engine";
import type { AudioClip } from "../types";
import type {
  AudioClipUpdatePayload,
  RipplePayload,
  RippleResult,
} from "./audio-clip-api";

const CAMEL_TO_SNAKE: Record<string, string> = {
  trackId: "track_id",
  sceneId: "scene_id",
  projectId: "project_id",
  startSec: "start_sec",
  endSec: "end_sec",
  laneIndex: "lane_index",
  orderIndex: "order_index",
  audioFileId: "audio_file_id",
  waveformData: "waveform_data",
  crossScene: "cross_scene",
  fxPresetId: "fx_preset_id",
  trackType: "track_type",
  content: "content",
  characterId: "character_id",
};

function mapKeysToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    out[CAMEL_TO_SNAKE[key] ?? key] = value;
  }
  return out;
}

export async function cloudGetProjectAudioClips(
  projectId: string,
): Promise<AudioClip[]> {
  const result = await apiRequest<{ clips: AudioClip[] }>(
    `/audio-clips?project_id=${encodeURIComponent(projectId)}`,
    { method: "GET", requireAuth: true },
  );
  const data = unwrapApiResult(result);
  return data?.clips || [];
}

export async function cloudGetClipsByScene(
  sceneId: string,
): Promise<AudioClip[]> {
  const result = await apiRequest<{ clips: AudioClip[] }>(
    `/clips?sceneId=${encodeURIComponent(sceneId)}`,
    { method: "GET", requireAuth: true },
  );
  const data = unwrapApiResult(result);
  return data?.clips || [];
}

export async function cloudCreateClip(
  sceneId: string,
  projectId: string,
  clipData: Partial<AudioClip>,
): Promise<AudioClip> {
  const payload = mapKeysToSnake({
    sceneId,
    projectId,
    ...clipData,
  });
  const result = await apiRequest<{ clip: AudioClip }>("/clips", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    requireAuth: true,
  });
  const data = unwrapApiResult(result);
  if (!data?.clip) throw new Error("Failed to create audio clip");
  return data.clip;
}

export async function cloudUpdateClip(
  clipId: string,
  updates: AudioClipUpdatePayload,
): Promise<AudioClip> {
  const result = await apiRequest<{ clip: AudioClip }>(`/clips/${clipId}`, {
    method: "PUT",
    body: JSON.stringify(mapKeysToSnake(updates)),
    headers: { "Content-Type": "application/json" },
    requireAuth: true,
  });
  const data = unwrapApiResult(result);
  if (!data?.clip) throw new Error("Failed to update audio clip");
  return data.clip;
}

export async function cloudRippleClips(
  payload: RipplePayload,
): Promise<RippleResult> {
  const snakePayload = {
    changedClipId: payload.changedClipId,
    newEndSec: payload.newEndSec,
    allClips: payload.allClips.map((c) =>
      mapKeysToSnake(c as unknown as Record<string, unknown>),
    ),
    allScenes: payload.allScenes,
    allSequences: payload.allSequences,
    allActs: payload.allActs,
  };
  const result = await apiRequest<RippleResult>("/clips/ripple", {
    method: "POST",
    body: JSON.stringify(snakePayload),
    headers: { "Content-Type": "application/json" },
    requireAuth: true,
  });
  const data = unwrapApiResult(result);
  if (!data) throw new Error("Failed to ripple clips");
  return data;
}

export async function cloudDeleteClip(clipId: string): Promise<void> {
  const result = await apiRequest<{ deleted: boolean }>(`/clips/${clipId}`, {
    method: "DELETE",
    requireAuth: true,
  });
  unwrapApiResult(result);
}

export type { RippleAct, RippleScene, RippleSequence };
