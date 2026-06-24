/**
 * Local MVE CRUD via MveRepository.
 * Location: src/lib/api-adapter/mve-local.ts
 */

import type {
  MveLineCreatePayload,
  MveLineUpdatePayload,
  MveVoiceProfileCreatePayload,
  MveVoiceProfileUpdatePayload,
} from "@/backend/ScriptonyBackend";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import { requireLocalBackend } from "./runtime-dispatch";

export async function localListMveLines(projectId: string): Promise<MveLine[]> {
  const backend = requireLocalBackend(projectId);
  return backend.mve.listLines(projectId);
}

export async function localListMveLinesByScene(
  sceneId: string,
): Promise<MveLine[]> {
  const backend = requireLocalBackend();
  return backend.mve.listLinesByScene(sceneId);
}

export async function localGetMveLine(lineId: string): Promise<MveLine | null> {
  const backend = requireLocalBackend();
  return backend.mve.getLine(lineId);
}

export async function localGetMveLineByAudioClipId(
  clipId: string,
): Promise<MveLine | null> {
  const backend = requireLocalBackend();
  return backend.mve.getLineByAudioClipId(clipId);
}

export async function localCreateMveLine(
  projectId: string,
  payload: MveLineCreatePayload,
): Promise<MveLine> {
  const backend = requireLocalBackend(projectId);
  return backend.mve.createLine(projectId, payload);
}

export async function localUpdateMveLine(
  lineId: string,
  patch: MveLineUpdatePayload,
): Promise<MveLine> {
  const backend = requireLocalBackend();
  return backend.mve.updateLine(lineId, patch);
}

export async function localDeleteMveLine(lineId: string): Promise<void> {
  const backend = requireLocalBackend();
  await backend.mve.deleteLine(lineId);
}

export async function localListMveVoiceProfiles(
  projectId: string,
): Promise<MveVoiceProfile[]> {
  const backend = requireLocalBackend(projectId);
  return backend.mve.listVoiceProfiles(projectId);
}

export async function localGetMveVoiceProfile(
  profileId: string,
): Promise<MveVoiceProfile | null> {
  const backend = requireLocalBackend();
  return backend.mve.getVoiceProfile(profileId);
}

export async function localGetMveVoiceProfileForCharacter(
  projectId: string,
  characterId: string,
): Promise<MveVoiceProfile | null> {
  const backend = requireLocalBackend(projectId);
  return backend.mve.getVoiceProfileForCharacter(projectId, characterId);
}

export async function localCreateMveVoiceProfile(
  projectId: string,
  payload: MveVoiceProfileCreatePayload,
): Promise<MveVoiceProfile> {
  const backend = requireLocalBackend(projectId);
  return backend.mve.createVoiceProfile(projectId, payload);
}

export async function localUpdateMveVoiceProfile(
  profileId: string,
  patch: MveVoiceProfileUpdatePayload,
): Promise<MveVoiceProfile> {
  const backend = requireLocalBackend();
  return backend.mve.updateVoiceProfile(profileId, patch);
}

export async function localDeleteMveVoiceProfile(
  profileId: string,
): Promise<void> {
  const backend = requireLocalBackend();
  await backend.mve.deleteVoiceProfile(profileId);
}
