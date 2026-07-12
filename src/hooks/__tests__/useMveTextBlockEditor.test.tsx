/**
 * @vitest-environment jsdom
 */

/**
 * Tests for useMveTextBlockEditor hook (T27).
 * Exercises the hook through a small harness component so React re-renders
 * are reflected in the DOM and the textarea ref is attached.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import type { RefObject } from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";

import { useMveTextBlockEditor } from "../useMveTextBlockEditor";
import type { MveEnhanceLineDraft } from "@/lib/multi-voice-engine/schema/enhance-script";

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  cleanup();
});

function TestHarness({
  initialText,
  onSave,
  onEnhance,
}: {
  initialText: string;
  onSave: (text: string) => Promise<void>;
  onEnhance: (rawText: string) => Promise<MveEnhanceLineDraft[] | null>;
}) {
  const editor = useMveTextBlockEditor({ initialText, onSave, onEnhance });
  return (
    <div
      onDrop={editor.handleDrop}
      onDragOver={editor.handleDragOver}
      data-testid="editor-root"
    >
      <textarea
        ref={editor.textareaRef as RefObject<HTMLTextAreaElement | null>}
        value={editor.text}
        onChange={(e) => editor.setText(e.target.value)}
        data-testid="editor-textarea"
      />
      <span data-testid="editor-text">{editor.text}</span>
      <span data-testid="editor-suggestions">
        {editor.suggestions ? editor.suggestions.length : "null"}
      </span>
      <span data-testid="editor-enhancing">
        {editor.isEnhancing ? "yes" : "no"}
      </span>
      <button onClick={() => void editor.enhance()} data-testid="enhance-btn">
        Enhance
      </button>
      <button
        onClick={() => editor.rejectSuggestions()}
        data-testid="reject-btn"
      >
        Reject
      </button>
      <button
        onClick={() =>
          editor.suggestions &&
          editor.applySuggestion(editor.suggestions[0].text)
        }
        data-testid="apply-btn"
      >
        Apply
      </button>
      <button
        onClick={() => editor.insertTag("happy")}
        data-testid="insert-tag-btn"
      >
        Tag
      </button>
      <button
        onClick={() => editor.removeTag("sad")}
        data-testid="remove-tag-btn"
      >
        Remove sad
      </button>
      <button onClick={() => void editor.flushSave()} data-testid="flush-btn">
        Flush
      </button>
    </div>
  );
}

function setup(
  opts: Partial<{
    initialText: string;
    onSave: (text: string) => Promise<void>;
    onEnhance: (rawText: string) => Promise<MveEnhanceLineDraft[] | null>;
  }> = {},
) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onEnhance = vi
    .fn()
    .mockResolvedValue(null as MveEnhanceLineDraft[] | null);
  render(
    <TestHarness
      initialText={opts.initialText ?? "Hello"}
      onSave={opts.onSave ?? onSave}
      onEnhance={opts.onEnhance ?? onEnhance}
    />,
  );
  return { onSave, onEnhance };
}

describe("useMveTextBlockEditor", () => {
  it("debounces save when text changes", async () => {
    const { onSave } = setup();
    fireEvent.change(screen.getByTestId("editor-textarea"), {
      target: { value: "Hello world" },
    });
    await vi.advanceTimersByTimeAsync(1000);
    expect(onSave).toHaveBeenCalledWith("Hello world");
  });

  it("does not save when text equals initial value", async () => {
    const { onSave } = setup();
    fireEvent.change(screen.getByTestId("editor-textarea"), {
      target: { value: "Hello" },
    });
    await vi.advanceTimersByTimeAsync(1000);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("flushes pending save immediately", async () => {
    const { onSave } = setup();
    fireEvent.change(screen.getByTestId("editor-textarea"), {
      target: { value: "Flushed text" },
    });
    fireEvent.click(screen.getByTestId("flush-btn"));
    expect(onSave).toHaveBeenCalledWith("Flushed text");
    await vi.advanceTimersByTimeAsync(1000);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("inserts a tag at the current cursor position", () => {
    setup();
    const textarea = screen.getByTestId(
      "editor-textarea",
    ) as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(5, 5);
    fireEvent.click(screen.getByTestId("insert-tag-btn"));
    expect(screen.getByTestId("editor-text").textContent).toBe("Hello --happy");
  });

  it("parses dropped tag text and inserts it", () => {
    setup();
    const root = screen.getByTestId("editor-root");
    const dataTransfer = { getData: () => "--sad", setData: () => {} };
    fireEvent.drop(root, { dataTransfer });
    // When the textarea has no caret, the tag is inserted at the start.
    expect(screen.getByTestId("editor-text").textContent).toBe("--sad Hello");
  });

  it("removes a tag token from text", () => {
    setup({ initialText: "Soll ich committen? --sad" });
    fireEvent.click(screen.getByTestId("remove-tag-btn"));
    expect(screen.getByTestId("editor-text").textContent).toBe(
      "Soll ich committen?",
    );
  });

  it("shows suggestions after successful enhance", async () => {
    const suggestion: MveEnhanceLineDraft = {
      orderIndex: 0,
      type: "dialogue",
      text: "Hello there",
    };
    setup({ onEnhance: vi.fn().mockResolvedValue([suggestion]) });
    fireEvent.click(screen.getByTestId("enhance-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("editor-suggestions").textContent).toBe("1"),
    );
  });

  it("clears suggestions when rejected", async () => {
    const suggestion: MveEnhanceLineDraft = {
      orderIndex: 0,
      type: "dialogue",
      text: "Hello there",
    };
    setup({ onEnhance: vi.fn().mockResolvedValue([suggestion]) });
    fireEvent.click(screen.getByTestId("enhance-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("editor-suggestions").textContent).toBe("1"),
    );
    fireEvent.click(screen.getByTestId("reject-btn"));
    expect(screen.getByTestId("editor-suggestions").textContent).toBe("null");
  });

  it("applies a suggestion text", async () => {
    const suggestion: MveEnhanceLineDraft = {
      orderIndex: 0,
      type: "dialogue",
      text: "Applied text",
    };
    setup({ onEnhance: vi.fn().mockResolvedValue([suggestion]) });
    fireEvent.click(screen.getByTestId("enhance-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("editor-suggestions").textContent).toBe("1"),
    );
    fireEvent.click(screen.getByTestId("apply-btn"));
    expect(screen.getByTestId("editor-text").textContent).toBe("Applied text");
    expect(screen.getByTestId("editor-suggestions").textContent).toBe("null");
  });
});
