/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelinePlayhead } from "../useTimelinePlayhead";

describe("useTimelinePlayhead (legacy shim)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("re-exports transport seek/play aliases", () => {
    const scrollRef = { current: null as HTMLDivElement | null };
    const trackLabelsRef = { current: null };
    const viewStartSecRef = { current: 0 };

    const { result } = renderHook(() =>
      useTimelinePlayhead({
        durationSec: 10,
        scrollRef,
        trackLabelsRef,
        viewStartSec: 0,
        pxPerSec: 100,
        viewStartSecRef,
      }),
    );

    act(() => {
      result.current.seek(3);
    });
    expect(result.current.currentTime).toBe(3);
    expect(result.current.positionSec).toBe(3);
  });
});
