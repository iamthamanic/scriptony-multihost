/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMveTextBlockAudioClip } from "../useMveTextBlockAudioClip";

const createAudioTrackMock = vi.fn();

vi.mock("@/lib/api-adapter/audio-story-adapter", () => ({
  createAudioTrack: (...args: unknown[]) => createAudioTrackMock(...args),
}));

vi.mock("@/lib/api-adapter/runtime-dispatch", () => ({
  requireLocalBackend: () => ({
    localProject: { projectId: "proj-1" },
  }),
}));

vi.mock("@/runtime", () => ({
  useRuntime: () => ({ profile: "local" as const }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useMveTextBlockAudioClip", () => {
  beforeEach(() => {
    createAudioTrackMock.mockReset();
    createAudioTrackMock.mockResolvedValue({
      clip: {
        id: "clip-1",
        startSec: 42,
        endSec: 45,
        sceneId: "scene-1",
      },
    });
  });

  it("createClipShell uses timelineStartSec for clip placement", async () => {
    const { result } = renderHook(
      () =>
        useMveTextBlockAudioClip({
          enabled: true,
          projectId: "proj-1",
          lineId: "line-1",
          characterId: "char-1",
          effectiveSceneId: "scene-1",
          text: "Test",
          timelineStartSec: 42,
          onBindAudioClip: vi.fn(),
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.createClipShell();
    });

    expect(createAudioTrackMock).toHaveBeenCalledWith(
      "scene-1",
      "proj-1",
      expect.objectContaining({ startTime: 42 }),
    );
  });
});
