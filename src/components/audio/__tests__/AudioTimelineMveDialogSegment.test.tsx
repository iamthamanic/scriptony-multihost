/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AudioTimelineMveDialogSegment } from "../AudioTimelineMveDialogSegment";
import { GlobalLoadingProgressProvider } from "@/hooks/useGlobalLoadingProgress";
import type { AudioClip } from "@/lib/types";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";

vi.mock("@/runtime", () => ({
  useRuntime: () => ({
    profile: "local" as const,
    isDesktop: true,
    isBrowser: false,
    isMobile: false,
  }),
}));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

const line: MveLine = {
  id: "line-1",
  sceneId: "scene-1",
  orderIndex: 0,
  type: "dialogue",
  status: "ready",
  text: "Hallo Audio",
  audioClipId: "clip-1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const clip: AudioClip = {
  id: "clip-1",
  trackId: "track-1",
  sceneId: "scene-1",
  projectId: "proj-1",
  startSec: 0,
  endSec: 5,
  laneIndex: 0,
  orderIndex: 0,
  trackType: "dialog",
  content: "Hallo Audio",
  audioFileId: "file-1",
  waveformData: [0.2, 0.8, 0.4],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
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

describe("AudioTimelineMveDialogSegment", () => {
  it("renders inline dialog card for bound MVE clip", () => {
    render(
      <AudioTimelineMveDialogSegment
        clip={clip}
        line={line}
        pxPerSec={20}
        projectId="proj-1"
        sceneLabel="Scene 01"
        onSaveText={vi.fn().mockResolvedValue(undefined)}
        onSaveDirection={vi.fn().mockResolvedValue(undefined)}
        onRenderLine={vi.fn().mockResolvedValue(undefined)}
      />,
      { wrapper },
    );
    expect(
      screen.getByTestId("audio-timeline-mve-dialog-segment"),
    ).toBeTruthy();
    expect(screen.getByTestId("mve-dialog-clip-card")).toBeTruthy();
    expect(screen.getByText("Scene 01")).toBeTruthy();
  });

  it("renders real waveform svg when waveformData present", () => {
    render(
      <AudioTimelineMveDialogSegment
        clip={{ ...clip, endSec: 12 }}
        line={line}
        pxPerSec={20}
        projectId="proj-1"
        onSaveText={vi.fn().mockResolvedValue(undefined)}
        onSaveDirection={vi.fn().mockResolvedValue(undefined)}
      />,
      { wrapper },
    );
    const footer = screen.getByTestId("mve-dialog-clip-waveform");
    expect(footer.querySelector("svg")).toBeTruthy();
    expect(footer.querySelectorAll("rect").length).toBe(3);
    expect(
      footer.querySelector("[data-testid='mve-dialog-clip-audio-duration']"),
    ).toBeNull();
    expect(screen.getByTestId("mve-dialog-clip-audio-duration")).toBeTruthy();
    expect(screen.getByText("00:00:12")).toBeTruthy();
  });

  it("uses full audio width when clip extends past scene shell", () => {
    render(
      <AudioTimelineMveDialogSegment
        clip={{ ...clip, startSec: 10, endSec: 37 }}
        line={line}
        pxPerSec={100}
        projectId="proj-1"
        sceneBlock={{ startSec: 10, endSec: 14 }}
        onSaveText={vi.fn().mockResolvedValue(undefined)}
        onSaveDirection={vi.fn().mockResolvedValue(undefined)}
      />,
      { wrapper },
    );
    const segment = screen.getByTestId("audio-timeline-mve-dialog-segment");
    expect(segment.style.width).toBe("2700px");
  });
});
