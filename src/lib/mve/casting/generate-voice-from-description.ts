/**
 * Create or update a generated MVE VoiceProfile from a natural-language description.
 * Location: src/lib/mve/casting/generate-voice-from-description.ts
 */

import {
  createMveVoiceProfile,
  updateMveVoiceProfile,
} from "@/lib/api-adapter/mve-adapter";
import type { VoiceEntry } from "@/lib/api/voice-entry";
import {
  DEFAULT_VOICE_ENGINE,
  localVoiceEngineLabel,
} from "@/lib/config/voice-engine";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import { mveDefaultPreviewForCharacter } from "@/lib/mve/default-preview-text";
import { matchVoiceFromDescription } from "./match-voice-from-description";

export interface GenerateVoiceFromDescriptionParams {
  projectId: string;
  characterId: string;
  characterName: string;
  description: string;
  voices: VoiceEntry[];
  providerLabel?: string;
  existingProfile?: MveVoiceProfile | null;
  previewText?: string;
}

export interface GenerateVoiceFromDescriptionResult {
  profile: MveVoiceProfile;
  matchedVoice: VoiceEntry;
  weakMatch: boolean;
  hint?: string;
}

export async function generateVoiceFromDescription(
  params: GenerateVoiceFromDescriptionParams,
): Promise<GenerateVoiceFromDescriptionResult> {
  const description = params.description.trim();
  if (!description) {
    throw new Error("Bitte zuerst eine Stimmbeschreibung eingeben.");
  }
  if (params.voices.length === 0) {
    const catalogLabel =
      params.providerLabel?.trim() ||
      localVoiceEngineLabel(DEFAULT_VOICE_ENGINE);
    throw new Error(
      `Kein Stimmenkatalog für „${catalogLabel}“ — Provider wählen oder TTS-Dienst erneut verbinden.`,
    );
  }

  const match = matchVoiceFromDescription({
    description,
    voices: params.voices,
  });
  if (!match) {
    throw new Error("Stimme konnte nicht zugeordnet werden.");
  }

  const previewText =
    params.previewText?.trim() ||
    params.existingProfile?.previewText ||
    mveDefaultPreviewForCharacter(params.characterName);

  const hint = match.weakMatch
    ? `Kein exakter Treffer im Katalog „${params.providerLabel?.trim() || localVoiceEngineLabel(DEFAULT_VOICE_ENGINE)}“ — nächstbeste Stimme wurde gewählt.`
    : `Treffer im Katalog „${params.providerLabel?.trim() || localVoiceEngineLabel(DEFAULT_VOICE_ENGINE)}“.`;

  const patch = {
    name: `${params.characterName.trim() || "Charakter"} — generiert`,
    description,
    engine: DEFAULT_VOICE_ENGINE,
    type: "generated" as const,
    status: "ready" as const,
    baseVoiceId: match.voice.id,
    attributes: match.attributes,
    consentStatus: "not_required" as const,
    previewText,
  };

  const profile = params.existingProfile
    ? await updateMveVoiceProfile(params.existingProfile.id, patch)
    : await createMveVoiceProfile(params.projectId, {
        ...patch,
        characterId: params.characterId,
        language: "de",
      });

  return {
    profile,
    matchedVoice: match.voice,
    weakMatch: match.weakMatch,
    hint,
  };
}
