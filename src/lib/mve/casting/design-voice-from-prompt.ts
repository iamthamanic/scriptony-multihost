/**
 * Create MVE voice assignment from a Voicebox designed (prompt-to-voice) profile.
 * Location: src/lib/mve/casting/design-voice-from-prompt.ts
 *
 * Legacy one-shot API — prefer preview + save flow in Voice Studio.
 */

import type { LoadingProgressReporter } from "@/lib/loading/global-loading-progress";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import type { MveVoiceDesignSpec } from "@/lib/multi-voice-engine/schema/voice-design-spec";
import { isDesktopShell } from "@/runtime/detect-runtime";
import { compileVoiceDesignPrompt } from "./compile-voice-design-prompt";
import { previewVoiceDesignCandidates } from "./preview-voice-design-candidates";
import { saveVoiceDesignCandidate } from "./save-voice-design-candidate";

export interface DesignVoiceFromPromptParams {
  projectId: string;
  projectDir: string;
  characterId: string;
  characterName: string;
  description: string;
  designSpec?: MveVoiceDesignSpec | null;
  existingProfile?: MveVoiceProfile | null;
  previewText?: string;
  onProgress?: LoadingProgressReporter;
}

export interface DesignVoiceFromPromptResult {
  profile: MveVoiceProfile;
  voiceboxProfileName: string;
  hint: string;
}

export async function designVoiceFromPrompt(
  params: DesignVoiceFromPromptParams,
): Promise<DesignVoiceFromPromptResult> {
  if (!isDesktopShell()) {
    throw new Error("Prompt-to-Voice nur in der Desktop-App verfügbar.");
  }

  const designPrompt = compileVoiceDesignPrompt({
    basicDescription: params.description,
    designSpec: params.designSpec,
  });
  if (!designPrompt.trim()) {
    throw new Error("Bitte zuerst eine Stimmbeschreibung eingeben.");
  }

  const session = await previewVoiceDesignCandidates({
    characterName: params.characterName,
    basicDescription: params.description,
    designSpec: params.designSpec,
    previewText: params.previewText,
    projectDir: params.projectDir,
    count: 1,
    onProgress: params.onProgress,
  });

  const candidate = session.candidates[0];
  if (!candidate) {
    throw new Error("Stimme konnte nicht erzeugt werden.");
  }

  const characterLabel = params.characterName.trim() || "Charakter";
  return saveVoiceDesignCandidate({
    projectId: params.projectId,
    characterId: params.characterId,
    characterName: params.characterName,
    voiceName: `${characterLabel} — designt`,
    candidate,
    session,
    designPrompt: session.designPrompt,
    designSpec: params.designSpec,
    existingProfile: params.existingProfile,
    previewText: params.previewText,
  });
}
