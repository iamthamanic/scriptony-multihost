/**
 * Persist a chosen voice design candidate to MVE + Voicebox.
 * Location: src/lib/mve/casting/save-voice-design-candidate.ts
 */

import { updateMveVoiceProfile } from "@/lib/api-adapter/mve-adapter";
import { updateVoiceboxProfile } from "@/lib/api/voicebox-api";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import type { MveVoiceDesignSpec } from "@/lib/multi-voice-engine/schema/voice-design-spec";
import { isDesktopShell } from "@/runtime/detect-runtime";
import { assignMveVoiceToCharacter } from "../assign-voice-profile";
import { mveDefaultPreviewForCharacter } from "../default-preview-text";
import { discardVoiceDesignCandidatesExcept } from "./preview-voice-design-candidates";
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

  await updateVoiceboxProfile(params.candidate.voiceboxProfileId, {
    name: voiceName,
    designPrompt,
    description: designPrompt.slice(0, 500),
    language: "de",
  });

  await discardVoiceDesignCandidatesExcept(
    params.session,
    params.candidate.voiceboxProfileId,
  );

  const previewText =
    params.previewText?.trim() ||
    params.existingProfile?.previewText ||
    mveDefaultPreviewForCharacter(params.characterName);

  const assigned = await assignMveVoiceToCharacter({
    projectId: params.projectId,
    characterId: params.characterId,
    characterName: params.characterName,
    voiceId: params.candidate.voiceboxProfileId,
    engine: "voicebox",
    previewText,
    existingProfile: params.existingProfile,
  });

  const profile = await updateMveVoiceProfile(assigned.id, {
    name: `${params.characterName.trim() || "Charakter"} — ${voiceName}`,
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
