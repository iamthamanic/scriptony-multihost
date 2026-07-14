/**
 * Persist a chosen voice design candidate via materialize + MVE profile update.
 * Location: src/lib/mve/casting/save-voice-design-candidate.ts
 */

import { updateMveVoiceProfile } from "@/lib/api-adapter/mve-adapter";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import type { MveVoiceDesignSpec } from "@/lib/multi-voice-engine/schema/voice-design-spec";
import { isDesktopShell } from "@/runtime/detect-runtime";
import { materializeDesignedVoice } from "../materialize/materialize-designed-voice";
import { mveDefaultPreviewForCharacter } from "../default-preview-text";
import type {
  VoiceDesignCandidate,
  VoiceDesignPreviewSession,
} from "./voice-design-candidate";

export interface SaveVoiceDesignCandidateParams {
  projectId: string;
  characterId: string;
  characterName: string;
  voiceName: string;
  candidate: VoiceDesignCandidate;
  session: VoiceDesignPreviewSession;
  designPrompt: string;
  designSpec?: MveVoiceDesignSpec | null;
  existingProfile?: MveVoiceProfile | null;
  previewText?: string;
}

export interface SaveVoiceDesignCandidateResult {
  profile: MveVoiceProfile;
  voiceboxProfileName: string;
  hint: string;
}

export async function saveVoiceDesignCandidate(
  params: SaveVoiceDesignCandidateParams,
): Promise<SaveVoiceDesignCandidateResult> {
  if (!isDesktopShell()) {
    throw new Error("Prompt-to-Voice nur in der Desktop-App verfügbar.");
  }

  const voiceName = params.voiceName.trim();
  if (!voiceName) {
    throw new Error("Bitte einen Namen für die Stimme eingeben.");
  }

  const designPrompt = params.designPrompt.trim();
  if (!designPrompt) {
    throw new Error("Design-Prompt fehlt.");
  }

  const providerSessionId = params.candidate.providerSessionId.trim();
  const providerCandidateId = params.candidate.providerCandidateId.trim();
  if (!providerSessionId || !providerCandidateId) {
    throw new Error("Kandidaten-Session fehlt — bitte erneut erzeugen.");
  }

  const previewText =
    params.previewText?.trim() ||
    params.existingProfile?.previewText ||
    mveDefaultPreviewForCharacter(params.characterName);

  const materialized = await materializeDesignedVoice({
    projectId: params.projectId,
    sessionId: providerSessionId,
    candidateId: providerCandidateId,
    name: voiceName,
    previewText,
    characterId: params.characterId,
    existingProfileId: params.existingProfile?.id,
  });

  const displayName = `${params.characterName.trim() || "Charakter"} — ${voiceName}`;
  const profile = await updateMveVoiceProfile(materialized.profile.id, {
    name: displayName,
    description: designPrompt,
    designSpec: params.designSpec ?? null,
    type: "generated",
    status: "ready",
    consentStatus: "not_required",
    attributes: null,
  });

  return {
    profile,
    voiceboxProfileName: voiceName,
    hint: "Stimme gespeichert — unter Eigene Stimmen verfügbar.",
  };
}
