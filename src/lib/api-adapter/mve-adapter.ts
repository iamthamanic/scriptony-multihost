/**
 * Runtime-aware MVE API (local SQLite only in MVP).
 * Location: src/lib/api-adapter/mve-adapter.ts
 */

import type {
  MveLineCreatePayload,
  MveLineUpdatePayload,
  MveVoiceProfileCreatePayload,
  MveVoiceProfileUpdatePayload,
} from "@/backend/ScriptonyBackend";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import { dispatchByRuntime, localNotSupported } from "./runtime-dispatch";
import {
  localCreateMveLine,
  localCreateMveVoiceProfile,
  localDeleteMveLine,
  localDeleteMveVoiceProfile,
  localGetMveLine,
  localGetMveLineByAudioClipId,
  localGetMveVoiceProfile,
  localGetMveVoiceProfileForCharacter,
  localListMveLines,
  localListMveLinesByScene,
  localListMveVoiceProfiles,
  localUpdateMveLine,
  localUpdateMveVoiceProfile,
} from "./mve-local";

const MVE_CLOUD_MSG =
  "Multi-Voice-Engine-Persistenz ist in der Cloud-Version noch nicht verfügbar.";

export function getMveLines(projectId: string): Promise<MveLine[]> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localListMveLines(projectId),
  );
}

export function getMveLinesByScene(sceneId: string): Promise<MveLine[]> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localListMveLinesByScene(sceneId),
  );
}

export function getMveLine(lineId: string): Promise<MveLine | null> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localGetMveLine(lineId),
  );
}

export function getMveLineByAudioClipId(
  clipId: string,
): Promise<MveLine | null> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localGetMveLineByAudioClipId(clipId),
  );
}

export function createMveLine(
  projectId: string,
  payload: MveLineCreatePayload,
): Promise<MveLine> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localCreateMveLine(projectId, payload),
  );
}

export function updateMveLine(
  lineId: string,
  patch: MveLineUpdatePayload,
): Promise<MveLine> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localUpdateMveLine(lineId, patch),
  );
}

export function deleteMveLine(lineId: string): Promise<void> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localDeleteMveLine(lineId),
  );
}

export function getMveVoiceProfiles(
  projectId: string,
): Promise<MveVoiceProfile[]> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localListMveVoiceProfiles(projectId),
  );
}

export function getMveVoiceProfile(
  profileId: string,
): Promise<MveVoiceProfile | null> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localGetMveVoiceProfile(profileId),
  );
}

export function getMveVoiceProfileForCharacter(
  projectId: string,
  characterId: string,
): Promise<MveVoiceProfile | null> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localGetMveVoiceProfileForCharacter(projectId, characterId),
  );
}

export function createMveVoiceProfile(
  projectId: string,
  payload: MveVoiceProfileCreatePayload,
): Promise<MveVoiceProfile> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localCreateMveVoiceProfile(projectId, payload),
  );
}

export function updateMveVoiceProfile(
  profileId: string,
  patch: MveVoiceProfileUpdatePayload,
): Promise<MveVoiceProfile> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localUpdateMveVoiceProfile(profileId, patch),
  );
}

export function deleteMveVoiceProfile(profileId: string): Promise<void> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localDeleteMveVoiceProfile(profileId),
  );
}
