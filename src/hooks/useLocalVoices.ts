/**
 * useLocalVoices — React Query hook fuer lokale Kokoro-Stimmen.
 *
 * Liefert Voice-Eintraege vom Kokoro Sidecar.
 * Cached fuer 5 Minuten (Stimmen aendern sich selten).
 */

import { useQuery } from "@tanstack/react-query";
import { listLocalVoices } from "../lib/api/local-tts-api";
import { isDesktopShell } from "../runtime/detect-runtime";
import { queryKeys } from "../lib/react-query";
import type { VoiceEntry } from "../lib/api/local-tts-api";

export interface UseLocalVoicesOptions {
  enabled?: boolean;
}

export function useLocalVoices(options: UseLocalVoicesOptions = {}) {
  const queryEnabled = options.enabled !== false && isDesktopShell();

  return useQuery<VoiceEntry[], Error>({
    queryKey: queryKeys.audio.localVoices(),
    queryFn: async () => {
      const voices = await listLocalVoices();
      return voices;
    },
    enabled: queryEnabled,
    staleTime: 5 * 60 * 1000, // 5 Minuten
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}
