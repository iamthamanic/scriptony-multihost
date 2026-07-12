/**
 * Local audio-story operations via AudioRepository (T55).
 *
 * Location: src/lib/api-adapter/audio-story-local.ts
 */

import type {
  AudioTrack,
  CharacterVoiceAssignment,
  RecordingSession,
} from "@/lib/types";
import { requireLocalBackend } from "./runtime-dispatch";

export async function localGetSceneAudioTracks(
  sceneId: string,
): Promise<AudioTrack[]> {
  const backend = requireLocalBackend();
  return backend.audio.getTracks(sceneId);
}

export async function localGetProjectAudioClips(
  projectId: string,
): Promise<import("@/lib/types").AudioClip[]> {
  const backend = requireLocalBackend(projectId);
  return backend.audio.getClips(projectId);
}

export async function localGetClipsByScene(
  sceneId: string,
): Promise<import("@/lib/types").AudioClip[]> {
  const backend = requireLocalBackend();
  const projectId = backend.localProject.projectId;
  const clips = await backend.audio.getClips(projectId);
  return clips.filter((c) => c.sceneId === sceneId);
}

export async function localGetProjectAudioTracks(
  projectId: string,
): Promise<AudioTrack[]> {
  const backend = requireLocalBackend(projectId);
  return backend.audio.getProjectTracks(projectId);
}

export async function localGetProjectVoiceAssignments(
  projectId: string,
): Promise<CharacterVoiceAssignment[]> {
  const backend = requireLocalBackend(projectId);
  return backend.audio.getVoiceAssignments(projectId);
}

export async function localCreateAudioTrack(
  sceneId: string,
  projectId: string,
  trackData: Partial<AudioTrack> & { laneIndex?: number },
): Promise<{ track: AudioTrack; clip: import("@/lib/types").AudioClip }> {
  const backend = requireLocalBackend();
  const tracks = await backend.audio.getTracks(sceneId);
  const laneIndex = trackData.laneIndex ?? tracks.length;
  const startSec = trackData.startTime ?? 0;
  const durationSec =
    trackData.duration && trackData.duration > 0 ? trackData.duration : 3;
  const clip = await backend.audio.createClip(sceneId, projectId, {
    trackType: trackData.type ?? "dialog",
    laneIndex,
    startSec,
    endSec: startSec + durationSec,
    content: trackData.content,
    characterId: trackData.characterId,
  });
  const track: AudioTrack = {
    id: clip.trackId || clip.id,
    sceneId,
    projectId,
    type: trackData.type ?? "dialog",
    content: trackData.content,
    characterId: trackData.characterId,
    createdAt: clip.createdAt,
    updatedAt: clip.updatedAt,
  };
  return { track, clip };
}

export async function localUpdateAudioTrack(
  trackId: string,
  trackData: Partial<AudioTrack>,
): Promise<AudioTrack> {
  const backend = requireLocalBackend();
  const clip = await backend.audio.updateClip(trackId, {
    orderIndex: trackData.startTime,
  });
  return {
    id: clip.trackId || clip.id,
    sceneId: clip.sceneId,
    projectId: clip.projectId,
    type: (clip.trackType as AudioTrack["type"]) ?? "dialog",
    content: clip.content,
    createdAt: clip.createdAt,
    updatedAt: clip.updatedAt,
  };
}

export async function localDeleteAudioTrack(trackId: string): Promise<void> {
  const backend = requireLocalBackend();
  await backend.audio.deleteClip(trackId);
}

export async function localGetAudioSessions(
  _sceneId: string,
): Promise<RecordingSession[]> {
  return [];
}

export async function localAssignVoice(
  projectId: string,
  characterId: string,
  voiceActorType: "human" | "tts",
  assignmentData?: Partial<CharacterVoiceAssignment>,
): Promise<CharacterVoiceAssignment> {
  const backend = requireLocalBackend();
  return backend.audio.assignVoice(
    projectId,
    characterId,
    voiceActorType,
    assignmentData,
  );
}
