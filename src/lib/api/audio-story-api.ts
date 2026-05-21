/**
 * Audio Story API Client
 * Verbindung zu scriptony-audio-story Function
 */

import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  unwrapApiResult,
} from "../api-client";
import type {
  AudioTrack,
  RecordingSession,
  CharacterVoiceAssignment,
} from "../types";

// =============================================================================
// AUDIO TRACKS
// =============================================================================

export async function getSceneAudioTracks(
  sceneId: string,
): Promise<AudioTrack[]> {
  const result = await apiGet(`/tracks?sceneId=${encodeURIComponent(sceneId)}`);
  const data = unwrapApiResult(result);
  return data?.tracks || [];
}

export async function createAudioTrack(
  sceneId: string,
  projectId: string,
  trackData: Partial<AudioTrack> & { laneIndex?: number },
): Promise<{ track: AudioTrack; clip: import("../types").AudioClip }> {
  const { laneIndex, ...rest } = trackData;
  const result = await apiPost("/tracks", {
    sceneId,
    projectId,
    ...rest,
    ...(laneIndex !== undefined ? { laneIndex, lane_index: laneIndex } : {}),
  });
  const data = unwrapApiResult(result);
  if (!data?.track) throw new Error("Failed to create audio track");
  return { track: data.track, clip: data.clip };
}

export async function updateAudioTrack(
  trackId: string,
  trackData: Partial<AudioTrack>,
): Promise<AudioTrack> {
  const result = await apiPut(`/tracks/${trackId}`, trackData);
  const data = unwrapApiResult(result);
  return data?.track;
}

export async function deleteAudioTrack(trackId: string): Promise<void> {
  await apiDelete(`/tracks/${trackId}`);
}

// =============================================================================
// RECORDING SESSIONS
// =============================================================================

export async function getAudioSessions(
  sceneId: string,
): Promise<RecordingSession[]> {
  const result = await apiGet(
    `/sessions?sceneId=${encodeURIComponent(sceneId)}`,
  );
  const data = unwrapApiResult(result);
  return data?.sessions || [];
}

export async function createAudioSession(
  sceneId: string,
  title: string,
): Promise<RecordingSession> {
  const result = await apiPost("/sessions", {
    sceneId,
    title,
  });
  const data = unwrapApiResult(result);
  return data?.session;
}

// =============================================================================
// VOICE CASTING
// =============================================================================

export async function getVoiceAssignments(
  projectId: string,
): Promise<CharacterVoiceAssignment[]> {
  const result = await apiGet(
    `/voices?projectId=${encodeURIComponent(projectId)}`,
  );
  const data = unwrapApiResult(result);
  return data?.assignments || [];
}

export async function assignVoice(
  projectId: string,
  characterId: string,
  voiceActorType: "human" | "tts",
  assignmentData: Partial<CharacterVoiceAssignment>,
): Promise<CharacterVoiceAssignment> {
  const result = await apiPost("/voices/assign", {
    projectId,
    characterId,
    voiceActorType,
    ...assignmentData,
  });
  const data = unwrapApiResult(result);
  return data?.assignment;
}

export async function getTTSAvailableVoices(): Promise<
  Array<{ id: string; name: string; provider: string; language: string }>
> {
  const result = await apiGet("/voices/tts/voices");
  const data = unwrapApiResult(result);
  return data?.ttsVoices || [];
}

// =============================================================================
// MIXING & EXPORT
// =============================================================================

export async function createPreviewMix(
  sceneId: string,
  trackIds: string[],
): Promise<{ preview: { status: string; estimatedDuration: number } }> {
  const result = await apiPost("/mixing/preview", {
    sceneId,
    trackIds,
  });
  return unwrapApiResult(result);
}

export async function exportChapter(
  actId: string,
  format: "mp3" | "wav" | "flac" = "mp3",
): Promise<{ export: { status: string; downloadUrl: string | null } }> {
  const result = await apiPost("/mixing/export/chapter", {
    actId,
    format,
  });
  return unwrapApiResult(result);
}
