/**
 * Tests for TTS voice profile hook helpers.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, type QueryObserverResult } from "@tanstack/react-query";
import {
  isVoiceboxBackedProvider,
  VOICE_PROVIDER_OPTIONS,
} from "@/lib/config/voice-providers";
import {
  clearVoiceboxLaunchFailure,
  recordVoiceboxLaunchFailure,
  voiceboxLaunchFailureMessage,
} from "@/lib/voicebox/voicebox-launch-guard";
import {
  prefetchAllVoiceboxVoiceProfiles,
  retryVoiceboxConnection,
  ttsVoiceProfilesQueryKey,
  type TtsVoiceProfilesData,
} from "../useTtsVoiceProfiles";

vi.mock("@/runtime/detect-runtime", () => ({
  isDesktopShell: () => true,
}));

describe("retryVoiceboxConnection", () => {
  afterEach(() => {
    clearVoiceboxLaunchFailure();
  });

  it("clears launch failure cache before refetch", async () => {
    recordVoiceboxLaunchFailure("Voicebox-Verbindung fehlgeschlagen");
    expect(voiceboxLaunchFailureMessage()).toMatch(/fehlgeschlagen/);

    const refetch = vi.fn(
      async (): Promise<QueryObserverResult<TtsVoiceProfilesData, Error>> =>
        ({ data: undefined }) as QueryObserverResult<
          TtsVoiceProfilesData,
          Error
        >,
    );

    await retryVoiceboxConnection(refetch);

    expect(voiceboxLaunchFailureMessage()).toBeNull();
    expect(refetch).toHaveBeenCalledOnce();
  });
});

describe("prefetchAllVoiceboxVoiceProfiles", () => {
  it("prefetches every Voicebox-backed provider for the project", async () => {
    const queryClient = new QueryClient();
    const prefetchSpy = vi
      .spyOn(queryClient, "prefetchQuery")
      .mockResolvedValue(undefined);

    await prefetchAllVoiceboxVoiceProfiles(queryClient, "/tmp/project");

    const voiceboxProviders = VOICE_PROVIDER_OPTIONS.filter((option) =>
      isVoiceboxBackedProvider(option.id),
    );

    expect(prefetchSpy).toHaveBeenCalledTimes(voiceboxProviders.length);
    for (const provider of voiceboxProviders) {
      expect(prefetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ttsVoiceProfilesQueryKey(provider.id, "/tmp/project"),
        }),
      );
    }
  });

  it("skips prefetch when projectDir is empty", async () => {
    const queryClient = new QueryClient();
    const prefetchSpy = vi
      .spyOn(queryClient, "prefetchQuery")
      .mockResolvedValue(undefined);

    await prefetchAllVoiceboxVoiceProfiles(queryClient, "  ");

    expect(prefetchSpy).not.toHaveBeenCalled();
  });
});
