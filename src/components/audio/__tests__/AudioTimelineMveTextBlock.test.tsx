/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AudioTimelineMveTextBlock } from "../AudioTimelineMveTextBlock";
import { MVE_TEXT_BLOCK_MIN_WIDTH_PX } from "@/lib/audio-lane";
import { GlobalLoadingProgressProvider } from "@/hooks/useGlobalLoadingProgress";
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

const baseLine: MveLine = {
  id: "line-1",
  sceneId: "scene-1",
  orderIndex: 0,
  type: "dialogue",
  status: "draft",
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

describe("AudioTimelineMveTextBlock", () => {
  it("applies minimum width at low pxPerSec when scene allows", () => {
    render(
      <AudioTimelineMveTextBlock
        line={baseLine}
        pxPerSec={0.2}
        viewStartSec={0}
        startSec={0}
        endSec={1}
        sceneBlock={{ startSec: 0, endSec: 1200 }}
        projectId="proj-1"
        onSaveText={vi.fn().mockResolvedValue(undefined)}
      />,
      { wrapper },
    );
    const block = screen.getByTestId("audio-timeline-mve-text-block");
    expect(block.style.width).toBe(`${MVE_TEXT_BLOCK_MIN_WIDTH_PX}px`);
  });

  it("renders inline dialog clip with textarea", () => {
    const line: MveLine = { ...baseLine, text: "Hallo Welt" };
    render(
      <AudioTimelineMveTextBlock
        line={line}
        pxPerSec={20}
        viewStartSec={0}
        startSec={0}
        endSec={4}
        projectId="proj-1"
        onSaveText={vi.fn().mockResolvedValue(undefined)}
      />,
      { wrapper },
    );
    expect(screen.getByTestId("mve-dialog-clip-card")).toBeTruthy();
    expect(
      (screen.getByTestId("mve-text-block-textarea") as HTMLTextAreaElement)
        .value,
    ).toBe("Hallo Welt");
  });

  it("shows scene label and audio dialog header", () => {
    render(
      <AudioTimelineMveTextBlock
        line={baseLine}
        pxPerSec={20}
        viewStartSec={0}
        startSec={0}
        endSec={4}
        projectId="proj-1"
        sceneLabel="Scene 01"
        onSaveText={vi.fn().mockResolvedValue(undefined)}
      />,
      { wrapper },
    );
    expect(screen.getByText("Scene 01")).toBeTruthy();
    expect(screen.getByText("Audio: Dialog")).toBeTruthy();
  });

  it("shows waveform footer placeholder", () => {
    render(
      <AudioTimelineMveTextBlock
        line={baseLine}
        pxPerSec={20}
        viewStartSec={0}
        startSec={0}
        endSec={4}
        projectId="proj-1"
        onSaveText={vi.fn().mockResolvedValue(undefined)}
      />,
      { wrapper },
    );
    expect(screen.getByTestId("mve-dialog-clip-waveform")).toBeTruthy();
  });

  it("calls onClick when wrapper clicked", () => {
    const onClick = vi.fn();
    render(
      <AudioTimelineMveTextBlock
        line={baseLine}
        pxPerSec={20}
        viewStartSec={0}
        startSec={0}
        endSec={4}
        projectId="proj-1"
        onSaveText={vi.fn().mockResolvedValue(undefined)}
        onClick={onClick}
      />,
      { wrapper },
    );
    fireEvent.click(screen.getByTestId("audio-timeline-mve-text-block"));
    expect(onClick).toHaveBeenCalledWith("line-1");
  });

  it("calls onSaveText after textarea change", async () => {
    const onSaveText = vi.fn().mockResolvedValue(undefined);
    const line: MveLine = { ...baseLine, text: "Old" };
    render(
      <AudioTimelineMveTextBlock
        line={line}
        pxPerSec={20}
        viewStartSec={0}
        startSec={0}
        endSec={4}
        projectId="proj-1"
        onSaveText={onSaveText}
      />,
      { wrapper },
    );
    const textarea = screen.getByTestId(
      "mve-text-block-textarea",
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "New text" } });
    await vi.advanceTimersByTimeAsync(1000);
    expect(onSaveText).toHaveBeenCalledWith("line-1", "New text");
  });

  it("returns null without projectId and onSaveText", () => {
    const { container } = render(
      <AudioTimelineMveTextBlock
        line={baseLine}
        pxPerSec={20}
        viewStartSec={0}
        startSec={0}
        endSec={4}
      />,
      { wrapper },
    );
    expect(container.firstChild).toBeNull();
  });
});
