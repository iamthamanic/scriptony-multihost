/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AudioTimelineMveTextBlock } from "../AudioTimelineMveTextBlock";
import { MVE_TEXT_BLOCK_MIN_WIDTH_PX } from "@/lib/audio-lane";
import { serializeMveDialogText } from "@/lib/mve/mve-dialog-text-dom";
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

function getDialogEditor(): HTMLElement {
  return screen.getByTestId("mve-text-block-textarea");
}

function setDialogEditorText(el: HTMLElement, text: string) {
  el.textContent = text;
  fireEvent.input(el, { bubbles: true });
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

  it("renders inline dialog clip with contenteditable editor", () => {
    const line: MveLine = { ...baseLine, text: "Hallo Welt" };
    render(
      <AudioTimelineMveTextBlock
        line={line}
        pxPerSec={20}
        viewStartSec={0}
        startSec={0}
        endSec={8}
        projectId="proj-1"
        onSaveText={vi.fn().mockResolvedValue(undefined)}
      />,
      { wrapper },
    );
    expect(screen.getByTestId("mve-dialog-clip-card")).toBeTruthy();
    expect(serializeMveDialogText(getDialogEditor())).toBe("Hallo Welt");
    expect(screen.getByTestId("mve-dialog-clip-wpm-duration")).toBeTruthy();
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

  it("shows 'Kein Audio' empty state when no clip is bound", () => {
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
    expect(screen.getByTestId("mve-dialog-clip-waveform-empty")).toBeTruthy();
    expect(screen.getByText("Kein Audio")).toBeTruthy();
  });

  it("uses a scrollable textarea shell for long dialog text", () => {
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
    const shell = screen.getByTestId("mve-dialog-clip-textarea-shell");
    expect(shell.className).toContain("overflow-y-auto");
  });

  it("shows waveform footer placeholder once a clip is bound", () => {
    const line: MveLine = { ...baseLine, audioClipId: "clip-1" };
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

  it("calls onSaveText after editor change", async () => {
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
    setDialogEditorText(getDialogEditor(), "New text");
    await vi.advanceTimersByTimeAsync(1000);
    expect(onSaveText).toHaveBeenCalledWith("line-1", "New text");
  });

  it("previews the scene shell width in the DOM while typing (content-driven audio)", async () => {
    const sceneShell = document.createElement("div");
    sceneShell.setAttribute("data-scene-id", "scene-1");
    sceneShell.style.width = "20px";
    document.body.appendChild(sceneShell);

    const line: MveLine = { ...baseLine, text: "" };
    render(
      <AudioTimelineMveTextBlock
        line={line}
        pxPerSec={20}
        viewStartSec={0}
        startSec={0}
        endSec={4}
        projectId="proj-1"
        projectType="audio"
        sceneId="scene-1"
        sceneBlocks={[{ id: "scene-1", startSec: 0, endSec: 1 }]}
        onSaveText={vi.fn().mockResolvedValue(undefined)}
        onSyncSceneForDraft={vi.fn()}
      />,
      { wrapper },
    );
    setDialogEditorText(
      getDialogEditor(),
      "one two three four five six seven eight nine ten",
    );

    expect(sceneShell.style.width).not.toBe("20px");
    document.body.removeChild(sceneShell);
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
