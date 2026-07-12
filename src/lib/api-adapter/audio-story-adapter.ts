/**
 * Runtime-aware audio-story + clip batch API (Tauri local vs scriptony-audio-story).
 *
 * Location: src/lib/api-adapter/audio-story-adapter.ts
 */

import * as CloudClip from "@/lib/api/audio-clip-api";
import * as CloudStory from "@/lib/api/audio-story-api";
import type {
  AudioClip,
  AudioTrack,
  CharacterVoiceAssignment,
} from "@/lib/types";
import { dispatchByRuntime } from "./runtime-dispatch";
import {
  localAssignVoice,
  localCreateAudioTrack,
  localDeleteAudioTrack,
  localGetClipsByScene,
  localGetProjectAudioClips,
  localGetProjectAudioTracks,
  localGetProjectVoiceAssignments,
  localGetSceneAudioTracks,
  localUpdateAudioTrack,
} from "./audio-story-local";

export function getSceneAudioTracks(sceneId: string): Promise<AudioTrack[]> {
  return dispatchByRuntime(
    () => CloudStory.getSceneAudioTracks(sceneId),
    () => localGetSceneAudioTracks(sceneId),
  );
}

export function getProjectAudioTracks(
  projectId: string,
): Promise<AudioTrack[]> {
  return dispatchByRuntime(
    () => CloudStory.getProjectAudioTracks(projectId),
    () => localGetProjectAudioTracks(projectId),
  );
}

export function getProjectAudioClips(
  projectId: string,
  accessToken?: string,
): Promise<AudioClip[]> {
  return dispatchByRuntime(
    () => CloudClip.getProjectAudioClips(projectId, accessToken),
    () => localGetProjectAudioClips(projectId),
  );
}

export function getClipsByScene(
  sceneId: string,
  accessToken?: string,
): Promise<AudioClip[]> {
  return dispatchByRuntime(
    () => CloudClip.getClipsByScene(sceneId, accessToken),
    () => localGetClipsByScene(sceneId),
  );
}

export function getVoiceAssignments(
  projectId: string,
): Promise<CharacterVoiceAssignment[]> {
  return dispatchByRuntime(
    () => CloudStory.getVoiceAssignments(projectId),
    () => localGetProjectVoiceAssignments(projectId),
  );
}

export function createAudioTrack(
  sceneId: string,
  projectId: string,
  trackData: Partial<AudioTrack> & { laneIndex?: number },
): Promise<{ track: AudioTrack; clip: AudioClip }> {
  return dispatchByRuntime(
    () => CloudStory.createAudioTrack(sceneId, projectId, trackData),
    () => localCreateAudioTrack(sceneId, projectId, trackData),
  );
}

export function updateAudioTrack(
  trackId: string,
  trackData: Partial<AudioTrack>,
): Promise<AudioTrack> {
  return dispatchByRuntime(
    () => CloudStory.updateAudioTrack(trackId, trackData),
    () => localUpdateAudioTrack(trackId, trackData),
  );
}

export function deleteAudioTrack(trackId: string): Promise<void> {
  return dispatchByRuntime(
    () => CloudStory.deleteAudioTrack(trackId),
    () => localDeleteAudioTrack(trackId),
  );
}

export function assignVoice(
  projectId: string,
  characterId: string,
  voiceActorType: "human" | "tts",
  assignmentData: Partial<CharacterVoiceAssignment>,
): Promise<CharacterVoiceAssignment> {
  return dispatchByRuntime(
    () =>
      CloudStory.assignVoice(
        projectId,
        characterId,
        voiceActorType,
        assignmentData,
      ),
    () =>
      localAssignVoice(projectId, characterId, voiceActorType, assignmentData),
  );
}
