/**
 * @vitest-environment jsdom
 */

/**
 * Tests for useMveTextBlockAudio (T28).
 * - returns inactive state when no onBindAudioClip is provided
 * - opens scene selection when sceneId is missing and generate/upload/record requested
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMveTextBlockAudio } from "../useMveTextBlockAudio";
import { GlobalLoadingProgressProvider } from "../useGlobalLoadingProgress";

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

const baseOptions = {
  projectId: "proj-1",
  lineId: "line-1",
  characterId: "char-1",
  sceneId: undefined as string | undefined,
  scenes: [{ id: "scene-1", name: "Scene 1" }],
  text: "Hallo",
};

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalLoadingProgressProvider>{children}</GlobalLoadingProgressProvider>
    </QueryClientProvider>
  );
}

describe("useMveTextBlockAudio", () => {
  it("is inactive when onBindAudioClip is missing", () => {
    const { result } = renderHook(
      () =>
        useMveTextBlockAudio({ ...baseOptions, onBindAudioClip: undefined }),
      { wrapper },
    );
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.isUploading).toBe(false);
    expect(result.current.isRecording).toBe(false);
    expect(result.current.pendingAction).toBe(null);
  });

  it("requestSceneForAction opens scene dialog when no scene linked", () => {
    const { result } = renderHook(
      () =>
        useMveTextBlockAudio({
          ...baseOptions,
          onBindAudioClip: vi.fn().mockResolvedValue(undefined),
        }),
      { wrapper },
    );
    act(() => {
      result.current.requestSceneForAction("generate");
    });
    expect(result.current.pendingAction).toBe("generate");
  });

  it("setSelectedSceneId updates selection", () => {
    const { result } = renderHook(
      () =>
        useMveTextBlockAudio({
          ...baseOptions,
          onBindAudioClip: vi.fn().mockResolvedValue(undefined),
        }),
      { wrapper },
    );
    act(() => {
      result.current.setSelectedSceneId("scene-1");
    });
    expect(result.current.selectedSceneId).toBe("scene-1");
  });

  it("queues file and opens dialog for upload when no scene linked", () => {
    const { result } = renderHook(
      () =>
        useMveTextBlockAudio({
          ...baseOptions,
          onBindAudioClip: vi.fn().mockResolvedValue(undefined),
        }),
      { wrapper },
    );
    const file = new File(["x"], "x.mp3", { type: "audio/mpeg" });
    act(() => {
      void result.current.uploadFile(file);
    });
    expect(result.current.pendingAction).toBe("upload");
    expect(result.current.queuedFile).toBe(file);
  });

  it("opens dialog for record when no scene linked", () => {
    const { result } = renderHook(
      () =>
        useMveTextBlockAudio({
          ...baseOptions,
          onBindAudioClip: vi.fn().mockResolvedValue(undefined),
        }),
      { wrapper },
    );
    act(() => {
      result.current.startRecord();
    });
    expect(result.current.pendingAction).toBe("record");
  });

  it("is inactive when projectId is missing", () => {
    const { result } = renderHook(
      () =>
        useMveTextBlockAudio({
          ...baseOptions,
          projectId: undefined,
          onBindAudioClip: vi.fn().mockResolvedValue(undefined),
        }),
      { wrapper },
    );
    act(() => {
      result.current.requestSceneForAction("generate");
    });
    expect(result.current.pendingAction).toBe("generate");
    act(() => {
      result.current.setSelectedSceneId("scene-1");
    });
    act(() => {
      void result.current.generate();
    });
    expect(result.current.isGenerating).toBe(false);
  });

  it("uses linked sceneId without pending action", () => {
    const { result } = renderHook(
      () =>
        useMveTextBlockAudio({
          ...baseOptions,
          sceneId: "scene-1",
          onBindAudioClip: vi.fn().mockResolvedValue(undefined),
        }),
      { wrapper },
    );
    expect(result.current.selectedSceneId).toBe("scene-1");
    act(() => {
      void result.current.generate();
    });
    expect(result.current.pendingAction).toBe(null);
  });
});
