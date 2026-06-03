/**
 * Runtime-aware audio clip CRUD (local SQLite vs cloud).
 */

import type {
  AudioClipUpdatePayload,
  RipplePayload,
  RippleResult,
} from "@/lib/api/audio-clip-api";
import type { AudioClip } from "@/lib/types";
import {
  cloudCreateClip,
  cloudDeleteClip,
  cloudGetClipsByScene,
  cloudGetProjectAudioClips,
  cloudRippleClips,
  cloudUpdateClip,
} from "@/lib/api/audio-clip-cloud-http";
import { dispatchByRuntime, localNotSupported } from "./runtime-dispatch";
import {
  localCreateClip,
  localDeleteClip,
  localGetClipsByScene,
  localGetProjectAudioClips,
  localUpdateClip,
} from "./clips-local";

export function getProjectAudioClips(
  projectId: string,
  _accessToken?: string,
): Promise<AudioClip[]> {
  return dispatchByRuntime(
    () => cloudGetProjectAudioClips(projectId),
    () => localGetProjectAudioClips(projectId),
  );
}

export function getClipsByScene(
  sceneId: string,
  _accessToken?: string,
): Promise<AudioClip[]> {
  return dispatchByRuntime(
    () => cloudGetClipsByScene(sceneId),
    () => localGetClipsByScene(sceneId),
  );
}

export function createClip(
  sceneId: string,
  projectId: string,
  clipData: Partial<AudioClip>,
  _accessToken?: string,
): Promise<AudioClip> {
  return dispatchByRuntime(
    () => cloudCreateClip(sceneId, projectId, clipData),
    () => localCreateClip(sceneId, projectId, clipData),
  );
}

export function updateClip(
  clipId: string,
  updates: AudioClipUpdatePayload,
  _accessToken?: string,
): Promise<AudioClip> {
  return dispatchByRuntime(
    () => cloudUpdateClip(clipId, updates),
    () => localUpdateClip(clipId, updates),
  );
}

export function rippleClips(
  payload: RipplePayload,
  _accessToken?: string,
): Promise<RippleResult> {
  return dispatchByRuntime(
    () => cloudRippleClips(payload),
    () =>
      localNotSupported(
        "Ripple-Bearbeitung ist in der lokalen Version noch nicht verfügbar.",
      ),
  );
}

export function deleteClip(
  clipId: string,
  _accessToken?: string,
): Promise<void> {
  return dispatchByRuntime(
    () => cloudDeleteClip(clipId),
    () => localDeleteClip(clipId),
  );
}
