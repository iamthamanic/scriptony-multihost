/**
 * Local MVE CRUD via MveRepository.
 * Location: src/lib/api-adapter/mve-local.ts
 */

import type {
  MveLaneLinkCreatePayload,
  MveLaneLinkUpdatePayload,
  MveLineCreatePayload,
  MveLineUpdatePayload,
  MveVoiceProfileCreatePayload,
  MveVoiceProfileUpdatePayload,
  MveVoiceConsentCreatePayload,
  MveVoiceRequestCreatePayload,
  MveVoiceRequestUpdatePayload,
} from "@/backend/ScriptonyBackend";
import type { MveLaneLink } from "@/lib/multi-voice-engine/schema/lane-link";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import type { MveVoiceConsent } from "@/lib/multi-voice-engine/schema/voice-consent";
import type { MveVoiceRequest } from "@/lib/multi-voice-engine/schema/voice-operations";
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

export async function localListMveLaneLinks(
  projectId: string,
): Promise<MveLaneLink[]> {
  const backend = requireLocalBackend(projectId);
  return backend.mve.listLaneLinks(projectId);
}

export async function localGetMveLaneLinkForCharacter(
  projectId: string,
  characterId: string,
): Promise<MveLaneLink | null> {
  const backend = requireLocalBackend(projectId);
  return backend.mve.getLaneLinkForCharacter(projectId, characterId);
}

export async function localCreateMveLaneLink(
  projectId: string,
  payload: MveLaneLinkCreatePayload,
): Promise<MveLaneLink> {
  const backend = requireLocalBackend(projectId);
  return backend.mve.createLaneLink(projectId, payload);
}

export async function localUpdateMveLaneLink(
  linkId: string,
  patch: MveLaneLinkUpdatePayload,
): Promise<MveLaneLink> {
  const backend = requireLocalBackend();
  return backend.mve.updateLaneLink(linkId, patch);
}

export async function localDeleteMveLaneLink(linkId: string): Promise<void> {
  const backend = requireLocalBackend();
  await backend.mve.deleteLaneLink(linkId);
}

export async function localListMveVoiceConsents(
  projectId: string,
): Promise<MveVoiceConsent[]> {
  const backend = requireLocalBackend(projectId);
  return backend.mve.listVoiceConsents(projectId);
}

export async function localListMveVoiceConsentsByVoice(
  voiceId: string,
): Promise<MveVoiceConsent[]> {
  const backend = requireLocalBackend();
  return backend.mve.listVoiceConsentsByVoice(voiceId);
}

export async function localGetMveVoiceConsent(
  consentId: string,
): Promise<MveVoiceConsent | null> {
  const backend = requireLocalBackend();
  return backend.mve.getVoiceConsent(consentId);
}

export async function localGetLatestVerifiedMveVoiceConsent(
  voiceId: string,
): Promise<MveVoiceConsent | null> {
  const backend = requireLocalBackend();
  return backend.mve.getLatestVerifiedVoiceConsent(voiceId);
}

export async function localCreateMveVoiceConsent(
  projectId: string,
  payload: MveVoiceConsentCreatePayload,
): Promise<MveVoiceConsent> {
  const backend = requireLocalBackend(projectId);
  return backend.mve.createVoiceConsent(projectId, payload);
}

export async function localCreateMveVoiceRequest(
  projectId: string,
  payload: MveVoiceRequestCreatePayload,
): Promise<MveVoiceRequest> {
  const backend = requireLocalBackend(projectId);
  return backend.mve.createVoiceRequest(projectId, payload);
}

export async function localUpdateMveVoiceRequest(
  requestId: string,
  patch: MveVoiceRequestUpdatePayload,
): Promise<MveVoiceRequest> {
  const backend = requireLocalBackend();
  return backend.mve.updateVoiceRequest(requestId, patch);
}
