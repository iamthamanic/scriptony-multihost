/**
 * Runtime-aware MVE API (local SQLite only in MVP).
 * Location: src/lib/api-adapter/mve-adapter.ts
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
import { dispatchByRuntime, localNotSupported } from "./runtime-dispatch";
import {
  localCreateMveLaneLink,
  localCreateMveLine,
  localCreateMveVoiceProfile,
  localDeleteMveLaneLink,
  localDeleteMveLine,
  localDeleteMveVoiceProfile,
  localGetMveLaneLinkForCharacter,
  localGetMveLine,
  localGetMveLineByAudioClipId,
  localGetMveVoiceProfile,
  localGetMveVoiceProfileForCharacter,
  localListMveLaneLinks,
  localListMveLines,
  localListMveLinesByScene,
  localListMveVoiceProfiles,
  localListMveVoiceConsents,
  localListMveVoiceConsentsByVoice,
  localGetMveVoiceConsent,
  localGetLatestVerifiedMveVoiceConsent,
  localCreateMveVoiceConsent,
  localCreateMveVoiceRequest,
  localUpdateMveVoiceRequest,
  localUpdateMveLaneLink,
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

export function getMveLaneLinks(projectId: string): Promise<MveLaneLink[]> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localListMveLaneLinks(projectId),
  );
}

export function getMveLaneLinkForCharacter(
  projectId: string,
  characterId: string,
): Promise<MveLaneLink | null> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localGetMveLaneLinkForCharacter(projectId, characterId),
  );
}

export function createMveLaneLink(
  projectId: string,
  payload: MveLaneLinkCreatePayload,
): Promise<MveLaneLink> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localCreateMveLaneLink(projectId, payload),
  );
}

export function updateMveLaneLink(
  linkId: string,
  patch: MveLaneLinkUpdatePayload,
): Promise<MveLaneLink> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localUpdateMveLaneLink(linkId, patch),
  );
}

export function deleteMveLaneLink(linkId: string): Promise<void> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localDeleteMveLaneLink(linkId),
  );
}

export function getMveVoiceConsents(
  projectId: string,
): Promise<MveVoiceConsent[]> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localListMveVoiceConsents(projectId),
  );
}

export function getMveVoiceConsentsByVoice(
  voiceId: string,
): Promise<MveVoiceConsent[]> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localListMveVoiceConsentsByVoice(voiceId),
  );
}

export function getMveVoiceConsent(
  consentId: string,
): Promise<MveVoiceConsent | null> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localGetMveVoiceConsent(consentId),
  );
}

export function getLatestVerifiedMveVoiceConsent(
  voiceId: string,
): Promise<MveVoiceConsent | null> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localGetLatestVerifiedMveVoiceConsent(voiceId),
  );
}

export function createMveVoiceConsent(
  projectId: string,
  payload: MveVoiceConsentCreatePayload,
): Promise<MveVoiceConsent> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localCreateMveVoiceConsent(projectId, payload),
  );
}

export function createMveVoiceRequest(
  projectId: string,
  payload: MveVoiceRequestCreatePayload,
): Promise<MveVoiceRequest> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localCreateMveVoiceRequest(projectId, payload),
  );
}

export function updateMveVoiceRequest(
  requestId: string,
  patch: MveVoiceRequestUpdatePayload,
): Promise<MveVoiceRequest> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_CLOUD_MSG),
    () => localUpdateMveVoiceRequest(requestId, patch),
  );
}
