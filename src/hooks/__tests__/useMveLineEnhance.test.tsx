/**
 * @vitest-environment jsdom
 */

/**
 * Tests for useMveLineEnhance hook (T27).
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useMveLineEnhance } from "../useMveLineEnhance";
import type { MveEnhanceScriptResult } from "@/lib/multi-voice-engine/schema/enhance-script";

const enhanceMock = vi.fn();
const getCharactersMock = vi.fn();

vi.mock("@/lib/api-adapter/audio-story-enhance-adapter", () => ({
  enhanceMveScriptWithRuntime: (payload: unknown) => enhanceMock(payload),
}));

vi.mock("@/lib/api-adapter/characters-adapter", () => ({
  getCharacters: (projectId: string) => getCharactersMock(projectId),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
    }
  >
    {children}
  </QueryClientProvider>
);

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  enhanceMock.mockReset();
  getCharactersMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

function resultWithLines(
  lines: MveEnhanceScriptResult["lines"],
  warnings?: string[],
): MveEnhanceScriptResult & { promptVersion?: string } {
  return { characters: [], lines, warnings };
}

describe("useMveLineEnhance", () => {
  it("returns null without a projectId", async () => {
    const { result } = renderHook(() => useMveLineEnhance(undefined), {
      wrapper,
    });
    const out = await result.current.enhance("hello");
    expect(out).toBeNull();
    expect(enhanceMock).not.toHaveBeenCalled();
  });

  it("returns null for empty text", async () => {
    const { result } = renderHook(() => useMveLineEnhance("proj-1"), {
      wrapper,
    });
    const out = await result.current.enhance("   ");
    expect(out).toBeNull();
    expect(enhanceMock).not.toHaveBeenCalled();
  });

  it("passes existing character names and returns top lines", async () => {
    getCharactersMock.mockResolvedValue([
      { id: "c1", name: "Anna" },
      { id: "c2", name: "Ben" },
    ]);
    enhanceMock.mockResolvedValue(
      resultWithLines([
        { orderIndex: 0, type: "dialogue", text: "Line 1" },
        { orderIndex: 1, type: "dialogue", text: "Line 2" },
        { orderIndex: 2, type: "dialogue", text: "Line 3" },
        { orderIndex: 3, type: "dialogue", text: "Line 4" },
      ]),
    );

    const { result } = renderHook(() => useMveLineEnhance("proj-1"), {
      wrapper,
    });
    const out = await result.current.enhance("raw text");

    expect(getCharactersMock).toHaveBeenCalledWith("proj-1");
    expect(enhanceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj-1",
        rawText: "raw text",
        existingCharacterNames: ["Anna", "Ben"],
        uiLanguage: "de",
      }),
    );
    expect(out).toHaveLength(3);
    expect(out?.[0].text).toBe("Line 1");
  });

  it("returns null and shows error when enhance fails", async () => {
    getCharactersMock.mockResolvedValue([]);
    enhanceMock.mockRejectedValue(new Error("KI offline"));

    const { result } = renderHook(() => useMveLineEnhance("proj-1"), {
      wrapper,
    });
    const out = await result.current.enhance("raw text");

    expect(out).toBeNull();
  });
});
