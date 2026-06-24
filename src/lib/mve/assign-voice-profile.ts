/**
 * Upsert MVE VoiceProfile for a project character (local Kokoro MVP).
 * Location: src/lib/mve/assign-voice-profile.ts
 */

import {
  createMveVoiceProfile,
  updateMveVoiceProfile,
} from "@/lib/api-adapter/mve-adapter";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import { mveDefaultPreviewForCharacter } from "./default-preview-text";

export interface AssignMveVoiceParams {
  projectId: string;
  characterId: string;
  characterName: string;
  voiceId: string;
  engine?: string;
  previewText?: string;
  existingProfile?: MveVoiceProfile | null;
}

export async function assignMveVoiceToCharacter(
  params: AssignMveVoiceParams,
): Promise<MveVoiceProfile> {
  const previewText =
    params.previewText?.trim() ||
    params.existingProfile?.previewText ||
    mveDefaultPreviewForCharacter(params.characterName);

  if (params.existingProfile) {
    return updateMveVoiceProfile(params.existingProfile.id, {
      baseVoiceId: params.voiceId,
      engine: params.engine ?? "kokoro",
      status: "ready",
      previewText,
    });
  }

  return createMveVoiceProfile(params.projectId, {
    name: `${params.characterName.trim() || "Charakter"} — Stimme`,
    characterId: params.characterId,
    engine: params.engine ?? "kokoro",
    baseVoiceId: params.voiceId,
    previewText,
    status: "ready",
    language: "de",
  });
}
