/**
 * @vitest-environment jsdom
 */

/**
 * Tests for AudioTimelineMveTextBlock (T27).
 * - renders line text or placeholder
 * - applies aria-label for screen readers
 * - opens inline editor on click
 * - calls onSaveText after editing
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AudioTimelineMveTextBlock } from "../AudioTimelineMveTextBlock";
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
  it("renders line text", () => {
    const line: MveLine = { ...baseLine, text: "Hallo Welt" };
    render(
      <AudioTimelineMveTextBlock
        line={line}
        pxPerSec={20}
        viewStartSec={0}
        sceneStartSec={0}
        sceneEndSec={3}
      />,
      { wrapper },
    );
    expect(screen.getByText("Hallo Welt")).toBeTruthy();
  });

  it("renders placeholder when text is empty", () => {
    render(
      <AudioTimelineMveTextBlock
        line={baseLine}
        pxPerSec={20}
        viewStartSec={0}
        sceneStartSec={0}
        sceneEndSec={3}
      />,
      { wrapper },
    );
    expect(screen.getByText("Text hinzufügen…")).toBeTruthy();
  });

  it("has accessible label", () => {
    const line: MveLine = { ...baseLine, text: "Dialog" };
    render(
      <AudioTimelineMveTextBlock
        line={line}
        pxPerSec={20}
        viewStartSec={0}
        sceneStartSec={0}
        sceneEndSec={3}
      />,
      { wrapper },
    );
    expect(
      screen.getByLabelText("Textblock: Dialog", { selector: "[role=button]" }),
    ).toBeTruthy();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    const line: MveLine = { ...baseLine, text: "Click me" };
    render(
      <AudioTimelineMveTextBlock
        line={line}
        pxPerSec={20}
        viewStartSec={0}
        sceneStartSec={0}
        sceneEndSec={3}
        onClick={onClick}
      />,
      { wrapper },
    );
    fireEvent.click(screen.getByText("Click me"));
    expect(onClick).toHaveBeenCalledWith("line-1");
  });

  it("opens inline editor when clicked", () => {
    const line: MveLine = { ...baseLine, text: "Click me" };
    render(
      <AudioTimelineMveTextBlock
        line={line}
        pxPerSec={20}
        viewStartSec={0}
        sceneStartSec={0}
        sceneEndSec={3}
        projectId="proj-1"
        onSaveText={vi.fn().mockResolvedValue(undefined)}
      />,
      { wrapper },
    );
    fireEvent.click(screen.getByText("Click me"));
    expect(screen.getByTestId("mve-text-block-editor")).toBeTruthy();
  });

  it("calls onSaveText after textarea change", async () => {
    const onSaveText = vi.fn().mockResolvedValue(undefined);
    const line: MveLine = { ...baseLine, text: "Old" };
    render(
      <AudioTimelineMveTextBlock
        line={line}
        pxPerSec={20}
        viewStartSec={0}
        sceneStartSec={0}
        sceneEndSec={3}
        projectId="proj-1"
        onSaveText={onSaveText}
      />,
      { wrapper },
    );
    fireEvent.click(screen.getByText("Old"));
    const textarea = screen.getByTestId(
      "mve-text-block-textarea",
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "New text" } });
    await vi.advanceTimersByTimeAsync(1000);
    expect(onSaveText).toHaveBeenCalledWith("line-1", "New text");
  });
});
