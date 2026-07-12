/**
 * List TTS voices/profiles for the active default engine (Voicebox or Kokoro).
 * Location: src/hooks/useTtsVoiceProfiles.ts
 */

import { useQuery } from "@tanstack/react-query";
import {
  DEFAULT_VOICE_ENGINE,
  isVoiceboxDefault,
  localVoiceEngineLabel,
} from "@/lib/config/voice-engine";
import {
  listVoiceboxProfiles,
  voiceboxProfilesAsVoiceEntries,
} from "@/lib/api/voicebox-api";
import { listLocalVoices, type VoiceEntry } from "@/lib/api/local-tts-api";
import { isDesktopShell } from "@/runtime/detect-runtime";
import { queryKeys } from "@/lib/react-query";
import { useGlobalLoadingProgress } from "./useGlobalLoadingProgress";

export interface UseTtsVoiceProfilesOptions {
  enabled?: boolean;
  projectDir?: string;
}

export interface TtsVoiceProfilesData {
  voices: VoiceEntry[];
  engine: typeof DEFAULT_VOICE_ENGINE;
  engineLabel: string;
  engineReady: boolean;
  engineError?: string;
  usedCatalogFallback: boolean;
  /** Kokoro-only: sidecar HTTP up */
  sidecarReady: boolean;
  /** Kokoro-only: model loaded */
  kokoroReady: boolean;
}

async function loadVoiceboxProfiles(): Promise<TtsVoiceProfilesData> {
  try {
    const profiles = await listVoiceboxProfiles();
    return {
      voices: voiceboxProfilesAsVoiceEntries(profiles),
      engine: "voicebox",
      engineLabel: localVoiceEngineLabel("voicebox"),
      engineReady: profiles.length > 0,
      usedCatalogFallback: false,
      sidecarReady: true,
      kokoroReady: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      voices: [],
      engine: "voicebox",
      engineLabel: localVoiceEngineLabel("voicebox"),
      engineReady: false,
      engineError: message,
      usedCatalogFallback: false,
      sidecarReady: false,
      kokoroReady: false,
    };
  }
}

export function useTtsVoiceProfiles(options: UseTtsVoiceProfilesOptions = {}) {
  const { runWithProgress } = useGlobalLoadingProgress();
  const queryEnabled =
    options.enabled !== false &&
    isDesktopShell() &&
    Boolean(options.projectDir);

  return useQuery<TtsVoiceProfilesData, Error>({
    queryKey: [
      ...queryKeys.audio.localVoices(),
      DEFAULT_VOICE_ENGINE,
      options.projectDir ?? "",
    ],
    queryFn: async () => {
      const dir = options.projectDir!;

      if (isVoiceboxDefault()) {
        return loadVoiceboxProfiles();
      }

      const kokoro = await runWithProgress({
        id: `kokoro-voices-${dir}`,
        title: "Kokoro Stimmen",
        initialMessage: "Kokoro Sidecar wird gestartet…",
        initialPercent: 5,
        run: (report) => listLocalVoices(dir, report),
      });

      return {
        voices: kokoro.voices,
        engine: "kokoro" as const,
        engineLabel: localVoiceEngineLabel("kokoro"),
        engineReady: kokoro.kokoroReady,
        engineError: kokoro.kokoroError,
        usedCatalogFallback: kokoro.usedCatalogFallback,
        sidecarReady: kokoro.sidecarReady,
        kokoroReady: kokoro.kokoroReady,
      };
    },
    enabled: queryEnabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: isVoiceboxDefault() ? 1 : 2,
    retryDelay: 2000,
  });
}
