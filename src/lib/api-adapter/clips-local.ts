/**
 * Local audio clip CRUD via AudioRepository.
 */

import type { AudioClipUpdatePayload } from "@/lib/api/audio-clip-api";
import type { AudioClip } from "@/lib/types";
import { requireLocalBackend } from "./runtime-dispatch";

export async function localGetProjectAudioClips(
  projectId: string,
): Promise<AudioClip[]> {
  const backend = requireLocalBackend(projectId);
  return backend.audio.getClips(projectId);
}

export async function localGetClipsByScene(
  sceneId: string,
): Promise<AudioClip[]> {
  const backend = requireLocalBackend();
  const projectId = backend.localProject.projectId;
  const clips = await backend.audio.getClips(projectId);
  return clips.filter((c) => c.sceneId === sceneId);
}

export async function localCreateClip(
  sceneId: string,
  projectId: string,
  clipData: Partial<AudioClip>,
): Promise<AudioClip> {
  const backend = requireLocalBackend(projectId);
  return backend.audio.createClip(sceneId, projectId, clipData);
}

export async function localUpdateClip(
  clipId: string,
  updates: AudioClipUpdatePayload,
): Promise<AudioClip> {
  const backend = requireLocalBackend();
  return backend.audio.updateClip(clipId, updates);
}

export async function localDeleteClip(clipId: string): Promise<void> {
  const backend = requireLocalBackend();
  await backend.audio.deleteClip(clipId);
}
