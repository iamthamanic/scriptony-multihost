/**
 * Submit verified voice-clone consent + reference upload for a profile.
 * Location: src/lib/mve/safety/submit-voice-clone-consent.ts
 */

import {
  createMveVoiceConsent,
  updateMveVoiceProfile,
} from "@/lib/api-adapter/mve-adapter";
import type { MveVoiceConsent } from "@/lib/multi-voice-engine/schema/voice-consent";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import { CONSENT_TEXT_VERSION } from "./consent-text";
import { persistVoiceRefAudio } from "./persist-voice-ref-audio";
import { sha256HexFromFile } from "./sha256-hex";

export interface SubmitVoiceCloneConsentParams {
  projectId: string;
  voiceProfileId: string;
  file: File;
  consentConfirmed: boolean;
  commercialUseAllowed: boolean;
}

export interface SubmitVoiceCloneConsentResult {
  consent: MveVoiceConsent;
  profile: MveVoiceProfile;
}

export async function submitVoiceCloneConsent(
  params: SubmitVoiceCloneConsentParams,
): Promise<SubmitVoiceCloneConsentResult> {
  if (!params.consentConfirmed) {
    throw new Error("Bitte den Consent-Text bestätigen.");
  }

  const sourceAudioHash = await sha256HexFromFile(params.file);
  const { relativePath } = await persistVoiceRefAudio(params.file);

  const consent = await createMveVoiceConsent(params.projectId, {
    voiceId: params.voiceProfileId,
    consentTextVersion: CONSENT_TEXT_VERSION,
    sourceAudioHash,
    commercialUseAllowed: params.commercialUseAllowed,
    status: "verified",
  });

  const profile = await updateMveVoiceProfile(params.voiceProfileId, {
    type: "cloned",
    consentStatus: "verified",
    referenceAudioUrl: relativePath,
    commercialUseAllowed: params.commercialUseAllowed,
    status: "ready",
  });

  return { consent, profile };
}

export async function revokeVoiceCloneConsent(
  projectId: string,
  voiceProfileId: string,
): Promise<MveVoiceProfile> {
  await createMveVoiceConsent(projectId, {
    voiceId: voiceProfileId,
    consentTextVersion: CONSENT_TEXT_VERSION,
    status: "blocked",
    commercialUseAllowed: false,
  });

  return updateMveVoiceProfile(voiceProfileId, {
    consentStatus: "blocked",
    status: "blocked",
  });
}
