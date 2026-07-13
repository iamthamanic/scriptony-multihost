/**
 * Resolve display label for an assigned MVE voice when catalog lookup may fail.
 * Location: src/lib/mve/resolve-assigned-voice-label.ts
 */

import { parsePresetVoiceEntryId } from "@/lib/api/voicebox-api";
import type { VoiceEntry } from "@/lib/api/voice-entry";
import { voiceboxPresetEngineLabel } from "@/lib/config/voicebox-preset-engines";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import { resolveMveTtsVoiceId } from "./resolve-tts-voice-id";

export const ASSIGNED_VOICE_OTHER_PROVIDER_LABEL =
  "Zugewiesene Stimme (anderer Provider)";

export interface ResolveAssignedVoiceLabelParams {
  voiceId?: string;
  voices: VoiceEntry[];
  profile?: MveVoiceProfile | null;
}

export function resolveAssignedVoiceLabel(
  params: ResolveAssignedVoiceLabelParams,
): string {
  const voiceId =
    params.voiceId?.trim() || resolveMveTtsVoiceId(params.profile)?.trim();
  if (!voiceId) {
    return ASSIGNED_VOICE_OTHER_PROVIDER_LABEL;
  }

  const inCatalog = params.voices.find((voice) => voice.id === voiceId);
  if (inCatalog) {
    return inCatalog.name;
  }

  const preset = parsePresetVoiceEntryId(voiceId);
  if (preset) {
    return `${voiceboxPresetEngineLabel(preset.engine)} — ${preset.voiceId}`;
  }

  return ASSIGNED_VOICE_OTHER_PROVIDER_LABEL;
}

export function voiceEntriesForAssignedSelection(
  voices: VoiceEntry[],
  selectedVoiceId: string | undefined,
  profile: MveVoiceProfile | null | undefined,
): VoiceEntry[] {
  const voiceId = selectedVoiceId?.trim();
  if (!voiceId || voices.some((voice) => voice.id === voiceId)) {
    return voices;
  }

  return [
    ...voices,
    {
      id: voiceId,
      name: resolveAssignedVoiceLabel({ voiceId, voices, profile }),
      lang: "de",
      gender: "zugewiesen",
      isPreset: isPresetVoiceEntryId(voiceId),
    },
  ];
}

function isPresetVoiceEntryId(id: string): boolean {
  return id.startsWith("preset:");
}
