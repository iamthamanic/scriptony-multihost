/**
 * @vitest-environment jsdom
 */

/**
 * Tests for AudioTimelineMveTextBlock (T26).
 * - renders line text or placeholder
 * - applies aria-label for screen readers
 * - calls onClick when activated
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { AudioTimelineMveTextBlock } from "../AudioTimelineMveTextBlock";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";

afterEach(() => cleanup());

const baseLine: MveLine = {
  id: "line-1",
  sceneId: "scene-1",
  orderIndex: 0,
  type: "dialogue",
  status: "draft",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

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
    );
    fireEvent.click(screen.getByText("Click me"));
    expect(onClick).toHaveBeenCalledWith("line-1");
  });
});
