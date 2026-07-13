/**
 * useLocalVoices — delegates to Voicebox voice list (profiles + presets).
 * Location: src/hooks/useLocalVoices.ts
 */

import { useTtsVoiceProfiles } from "./useTtsVoiceProfiles";

export type { VoiceEntry } from "@/lib/api/voice-entry";

export interface UseLocalVoicesOptions {
  enabled?: boolean;
  projectDir?: string;
}

export function useLocalVoices(options: UseLocalVoicesOptions = {}) {
  const query = useTtsVoiceProfiles({
    enabled: options.enabled,
    projectDir: options.projectDir,
    engine: "voicebox",
  });

  return {
    ...query,
    data: query.data
      ? {
          voices: query.data.voices,
          sidecarReady: query.data.engineReady,
          voiceboxReady: query.data.engineReady,
          voiceboxError: query.data.engineError,
          usedCatalogFallback: false,
        }
      : undefined,
  };
}
