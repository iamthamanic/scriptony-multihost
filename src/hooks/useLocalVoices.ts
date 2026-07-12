/**
 * useLocalVoices — React Query hook fuer lokale Kokoro-Stimmen.
 *
 * Location: src/hooks/useLocalVoices.ts
 */

import { useQuery } from "@tanstack/react-query";
import { listLocalVoices } from "../lib/api/local-tts-api";
import { isDesktopShell } from "../runtime/detect-runtime";
import { queryKeys } from "../lib/react-query";
import type { VoiceEntry } from "../lib/api/local-tts-api";
import { useGlobalLoadingProgress } from "./useGlobalLoadingProgress";

export interface UseLocalVoicesOptions {
  enabled?: boolean;
  projectDir?: string;
}

export interface UseLocalVoicesData {
  voices: VoiceEntry[];
  sidecarReady: boolean;
  kokoroReady: boolean;
  kokoroError?: string;
  usedCatalogFallback: boolean;
}

export function useLocalVoices(options: UseLocalVoicesOptions = {}) {
  const { runWithProgress } = useGlobalLoadingProgress();
  const queryEnabled =
    options.enabled !== false &&
    isDesktopShell() &&
    Boolean(options.projectDir);

  return useQuery<UseLocalVoicesData, Error>({
    queryKey: [...queryKeys.audio.localVoices(), options.projectDir ?? ""],
    queryFn: async () => {
      const dir = options.projectDir!;
      return runWithProgress({
        id: `kokoro-voices-${dir}`,
        title: "Kokoro Stimmen",
        initialMessage: "Kokoro Sidecar wird gestartet…",
        initialPercent: 5,
        run: (report) => listLocalVoices(dir, report),
      });
    },
    enabled: queryEnabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 2000,
  });
}
