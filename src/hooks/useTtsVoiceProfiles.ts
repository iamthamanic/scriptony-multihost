/**
 * List TTS voices per UI provider (Eigene Stimmen, preset engines via Voicebox, ElevenLabs).
 * Location: src/hooks/useTtsVoiceProfiles.ts
 */

import { useEffect } from "react";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryObserverResult,
} from "@tanstack/react-query";
import {
  DEFAULT_VOICE_ENGINE,
  type LocalVoiceEngineId,
} from "@/lib/config/voice-engine";
import {
  isElevenLabsConfigured,
  isElevenLabsProviderReady,
  isVoiceboxBackedProvider,
  persistedEngineForProvider,
  resolveVoiceProviderId,
  VOICE_PROVIDER_OPTIONS,
  voiceProviderLabel,
  type VoiceProviderId,
} from "@/lib/config/voice-providers";
import { listElevenLabsVoices } from "@/lib/api/elevenlabs-api";
import type { VoiceEntry } from "@/lib/api/voice-entry";
import {
  getVoiceboxHealth,
  listVoiceboxUserProfileEntries,
  listVoiceboxPresetVoices,
  ensureVoiceboxSidecar,
} from "@/lib/api/voicebox-api";
import type { VoiceboxPresetEngine } from "@/lib/config/voicebox-preset-engines";
import { clearVoiceboxLaunchFailure } from "@/lib/voicebox/voicebox-launch-guard";
import {
  clearVoiceboxSessionReady,
  isVoiceboxSessionReady,
} from "@/lib/voicebox/voicebox-ready-cache";
import { isDesktopShell } from "@/runtime/detect-runtime";
import { queryKeys } from "@/lib/react-query";
import type { LoadingProgressReporter } from "@/lib/loading/global-loading-progress";
import { useGlobalLoadingProgress } from "./useGlobalLoadingProgress";
import { subscribeVoiceboxModelRefresh } from "@/lib/voicebox/voicebox-model-ready-signal";

export interface UseTtsVoiceProfilesOptions {
  enabled?: boolean;
  projectDir?: string;
  provider?: VoiceProviderId;
  /** @deprecated use provider — maps persisted SQLite engine to UI provider */
  engine?: string;
}

const TTS_VOICE_PROFILES_STALE_MS = 5 * 60 * 1000;

export function ttsVoiceProfilesQueryKey(
  provider: VoiceProviderId,
  projectDir: string,
) {
  return [
    ...queryKeys.audio.localVoices(),
    provider,
    projectDir,
    isElevenLabsProviderReady(),
  ] as const;
}

export interface TtsVoiceProfilesData {
  voices: VoiceEntry[];
  provider: VoiceProviderId;
  providerLabel: string;
  engine: LocalVoiceEngineId;
  engineReady: boolean;
  engineError?: string;
  voiceboxModelLoaded: boolean;
  voiceboxModelDownloaded: boolean | null;
}

function resolveProvider(options: UseTtsVoiceProfilesOptions): VoiceProviderId {
  if (options.provider) return options.provider;
  return resolveVoiceProviderId(options.engine);
}

async function loadVoiceboxProviderVoices(
  provider: VoiceProviderId,
  report?: LoadingProgressReporter,
): Promise<TtsVoiceProfilesData> {
  const engine = persistedEngineForProvider(provider);
  try {
    await ensureVoiceboxSidecar(report);
    const health = await getVoiceboxHealth();
    const voices =
      provider === "voicebox"
        ? await listVoiceboxUserProfileEntries()
        : await listVoiceboxPresetVoices(provider as VoiceboxPresetEngine);
    return {
      voices,
      provider,
      providerLabel: voiceProviderLabel(provider),
      engine,
      engineReady: health?.status === "healthy",
      voiceboxModelLoaded: Boolean(health?.model_loaded),
      voiceboxModelDownloaded: health?.model_downloaded ?? null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      voices: [],
      provider,
      providerLabel: voiceProviderLabel(provider),
      engine,
      engineReady: false,
      engineError: message,
      voiceboxModelLoaded: false,
      voiceboxModelDownloaded: null,
    };
  }
}

async function loadElevenLabsProfiles(): Promise<TtsVoiceProfilesData> {
  if (!isElevenLabsConfigured()) {
    return {
      voices: [],
      provider: "elevenlabs",
      providerLabel: voiceProviderLabel("elevenlabs"),
      engine: "elevenlabs",
      engineReady: false,
      engineError:
        "ElevenLabs API-Key fehlt (VITE_ELEVENLABS_API_KEY in .env.local).",
      voiceboxModelLoaded: false,
      voiceboxModelDownloaded: null,
    };
  }

  try {
    const voices = await listElevenLabsVoices();
    return {
      voices,
      provider: "elevenlabs",
      providerLabel: voiceProviderLabel("elevenlabs"),
      engine: "elevenlabs",
      engineReady: voices.length > 0,
      voiceboxModelLoaded: false,
      voiceboxModelDownloaded: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      voices: [],
      provider: "elevenlabs",
      providerLabel: voiceProviderLabel("elevenlabs"),
      engine: "elevenlabs",
      engineReady: false,
      engineError: message,
      voiceboxModelLoaded: false,
      voiceboxModelDownloaded: null,
    };
  }
}

function isVoiceboxBootTimeoutMessage(message: string): boolean {
  return message.includes("TTS-Dienst antwortet nicht");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadVoiceboxProviderVoicesWithRetry(
  provider: VoiceProviderId,
  report?: LoadingProgressReporter,
): Promise<TtsVoiceProfilesData> {
  const first = await loadVoiceboxProviderVoices(provider, report);
  if (
    first.engineReady ||
    !first.engineError ||
    !isVoiceboxBootTimeoutMessage(first.engineError)
  ) {
    return first;
  }

  await sleep(3_000);
  clearVoiceboxLaunchFailure();
  clearVoiceboxSessionReady();
  return loadVoiceboxProviderVoices(provider, report);
}

/** Clears Voicebox launch cooldown and re-runs the voice profiles query. */
export async function retryVoiceboxConnection(
  refetch: () => Promise<QueryObserverResult<TtsVoiceProfilesData, Error>>,
): Promise<QueryObserverResult<TtsVoiceProfilesData, Error>> {
  clearVoiceboxLaunchFailure();
  clearVoiceboxSessionReady();
  return refetch();
}

function hasFreshTtsVoiceProfilesCache(
  queryClient: QueryClient,
  queryKey: ReturnType<typeof ttsVoiceProfilesQueryKey>,
): boolean {
  const state = queryClient.getQueryState<TtsVoiceProfilesData>(queryKey);
  if (!state?.dataUpdatedAt) return false;
  return Date.now() - state.dataUpdatedAt < TTS_VOICE_PROFILES_STALE_MS;
}

/** Prefetch all Voicebox-backed voice catalogs in the background (no progress overlay). */
export function prefetchAllVoiceboxVoiceProfiles(
  queryClient: QueryClient,
  projectDir: string,
): Promise<void> {
  if (!isDesktopShell() || !projectDir.trim()) {
    return Promise.resolve();
  }

  const providers = VOICE_PROVIDER_OPTIONS.filter((option) =>
    isVoiceboxBackedProvider(option.id),
  ).map((option) => option.id);

  return Promise.all(
    providers.map((provider) =>
      queryClient.prefetchQuery({
        queryKey: ttsVoiceProfilesQueryKey(provider, projectDir),
        queryFn: () => loadVoiceboxProviderVoicesWithRetry(provider),
        staleTime: TTS_VOICE_PROFILES_STALE_MS,
      }),
    ),
  ).then(() => undefined);
}

export function useTtsVoiceProfiles(options: UseTtsVoiceProfilesOptions = {}) {
  const { runWithProgress } = useGlobalLoadingProgress();
  const queryClient = useQueryClient();
  const provider = resolveProvider(options);
  const projectDir = options.projectDir ?? "";
  const queryEnabled =
    options.enabled !== false &&
    (provider === "elevenlabs" ||
      (isDesktopShell() &&
        Boolean(projectDir) &&
        isVoiceboxBackedProvider(provider)));

  const queryKey =
    provider === "elevenlabs"
      ? ([
          ...queryKeys.audio.localVoices(),
          provider,
          projectDir,
          isElevenLabsProviderReady(),
        ] as const)
      : ttsVoiceProfilesQueryKey(provider, projectDir);

  useEffect(() => {
    if (!isVoiceboxBackedProvider(provider)) return undefined;
    return subscribeVoiceboxModelRefresh(() => {
      void queryClient.invalidateQueries({ queryKey });
    });
  }, [provider, queryClient, queryKey]);

  return useQuery<TtsVoiceProfilesData, Error>({
    queryKey,
    queryFn: async () => {
      if (provider === "elevenlabs") {
        return loadElevenLabsProfiles();
      }

      const loadSilently = () => loadVoiceboxProviderVoicesWithRetry(provider);

      if (
        hasFreshTtsVoiceProfilesCache(queryClient, queryKey) ||
        isVoiceboxSessionReady()
      ) {
        return loadSilently();
      }

      return runWithProgress({
        id: `voicebox-voices-${provider}-${projectDir}`,
        title: voiceProviderLabel(provider),
        initialMessage: "Lokaler TTS-Dienst wird verbunden…",
        initialPercent: 5,
        run: (report) => loadVoiceboxProviderVoicesWithRetry(provider, report),
      });
    },
    enabled: queryEnabled,
    staleTime: TTS_VOICE_PROFILES_STALE_MS,
    gcTime: 10 * 60 * 1000,
    retry: provider === "elevenlabs" ? 1 : 0,
    retryDelay: 2000,
    refetchOnWindowFocus: isVoiceboxBackedProvider(provider),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || !isVoiceboxBackedProvider(data.provider)) return false;
      if (!data.engineReady || data.voiceboxModelLoaded) return false;
      return 12_000;
    },
  });
}

export { DEFAULT_VOICE_ENGINE };
