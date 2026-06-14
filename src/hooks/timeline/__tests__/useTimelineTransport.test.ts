/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  TIMELINE_PLAYHEAD_CSS_VAR,
  useTimelineTransport,
} from "../useTimelineTransport";

describe("useTimelineTransport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("seek clamps to [0, duration]", () => {
    const scrollRef = { current: null as HTMLDivElement | null };
    const trackLabelsRef = { current: null };
    const viewStartSecRef = { current: 0 };

    const { result } = renderHook(() =>
      useTimelineTransport({
        durationSec: 10,
        scrollRef,
        trackLabelsRef,
        viewStartSec: 0,
        pxPerSec: 100,
        viewStartSecRef,
      }),
    );

    act(() => {
      result.current.seek(99);
    });
    expect(result.current.positionSec).toBe(10);

    act(() => {
      result.current.seek(-5);
    });
    expect(result.current.positionSec).toBe(0);
  });

  it("play() resets to start when at end", () => {
    const scrollRef = { current: null as HTMLDivElement | null };
    const trackLabelsRef = { current: null };
    const viewStartSecRef = { current: 0 };

    const { result } = renderHook(() =>
      useTimelineTransport({
        durationSec: 5,
        scrollRef,
        trackLabelsRef,
        viewStartSec: 0,
        pxPerSec: 100,
        viewStartSecRef,
      }),
    );

    act(() => {
      result.current.seek(5);
      result.current.play();
    });

    expect(result.current.playing).toBe(true);
    expect(result.current.positionSecRef.current).toBe(0);
  });

  it("play() keeps playingRef true before React commits playing", () => {
    const scrollRef = { current: null as HTMLDivElement | null };
    const trackLabelsRef = { current: null };
    const viewStartSecRef = { current: 0 };

    const { result } = renderHook(() =>
      useTimelineTransport({
        durationSec: 5,
        scrollRef,
        trackLabelsRef,
        viewStartSec: 0,
        pxPerSec: 100,
        viewStartSecRef,
      }),
    );

    act(() => {
      result.current.play();
    });

    expect(result.current.playingRef.current).toBe(true);
  });

  it("sets --playhead-left-px from scroll DOM, not stale viewStartSec prop", () => {
    const scrollEl = document.createElement("div");
    Object.defineProperty(scrollEl, "scrollLeft", {
      configurable: true,
      writable: true,
      value: 500,
    });
    Object.defineProperty(scrollEl, "clientWidth", {
      configurable: true,
      value: 2000,
    });
    const scrollRef = { current: scrollEl };
    const trackLabelsRef = { current: null };
    const viewStartSecRef = { current: 0 };

    let rafCb: FrameRequestCallback | null = null;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCb = cb;
      return 1;
    });
    vi.spyOn(performance, "now").mockReturnValue(1000);

    const { result } = renderHook(() =>
      useTimelineTransport({
        durationSec: 300,
        scrollRef,
        trackLabelsRef,
        viewStartSec: 0,
        pxPerSec: 100,
        viewStartSecRef,
      }),
    );

    act(() => {
      result.current.seek(10);
      result.current.play();
      rafCb?.(0);
    });

    expect(scrollEl.style.getPropertyValue(TIMELINE_PLAYHEAD_CSS_VAR)).toBe(
      "500px",
    );
    expect(viewStartSecRef.current).toBe(5);
  });

  it("advances positionSec while playing via RAF", () => {
    const scrollRef = { current: null as HTMLDivElement | null };
    const trackLabelsRef = { current: null };
    const viewStartSecRef = { current: 0 };

    let rafCb: FrameRequestCallback | null = null;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCb = cb;
      return 1;
    });

    let nowMs = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => nowMs);

    const { result } = renderHook(() =>
      useTimelineTransport({
        durationSec: 60,
        scrollRef,
        trackLabelsRef,
        viewStartSec: 0,
        pxPerSec: 100,
        viewStartSecRef,
      }),
    );

    act(() => {
      result.current.play();
    });

    act(() => {
      nowMs = 2500;
      rafCb?.(0);
    });

    expect(result.current.positionSecRef.current).toBeCloseTo(1.5, 2);
  });

  it("stop() resets to 0 and clears playing", () => {
    const scrollRef = { current: null as HTMLDivElement | null };
    const trackLabelsRef = { current: null };
    const viewStartSecRef = { current: 0 };

    const { result } = renderHook(() =>
      useTimelineTransport({
        durationSec: 60,
        scrollRef,
        trackLabelsRef,
        viewStartSec: 0,
        pxPerSec: 100,
        viewStartSecRef,
      }),
    );

    act(() => {
      result.current.seek(12);
      result.current.play();
      result.current.stop();
    });

    expect(result.current.playing).toBe(false);
    expect(result.current.playingRef.current).toBe(false);
    expect(result.current.positionSec).toBe(0);
  });

  it("playhead scrub pauses playback and updates position via clientX", () => {
    const scrollEl = document.createElement("div");
    Object.defineProperty(scrollEl, "scrollLeft", {
      configurable: true,
      writable: true,
      value: 0,
    });
    scrollEl.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 1000, height: 100 }) as DOMRect;

    const scrollRef = { current: scrollEl };
    const trackLabelsRef = { current: null };
    const viewStartSecRef = { current: 0 };
    const onScrubTimeChange = vi.fn();

    const { result } = renderHook(() =>
      useTimelineTransport({
        durationSec: 60,
        scrollRef,
        trackLabelsRef,
        viewStartSec: 0,
        pxPerSec: 100,
        viewStartSecRef,
        onScrubTimeChange,
      }),
    );

    act(() => {
      result.current.play();
    });
    expect(result.current.playingRef.current).toBe(true);

    const handle = document.createElement("div");
    handle.setPointerCapture = vi.fn();
    handle.releasePointerCapture = vi.fn();
    handle.hasPointerCapture = vi.fn(() => true);
    handle.addEventListener = vi.fn();
    handle.removeEventListener = vi.fn();

    act(() => {
      result.current.playheadScrubHandlers.onPlayheadPointerDown({
        button: 0,
        clientX: 250,
        pointerId: 1,
        currentTarget: handle,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.PointerEvent<HTMLElement>);
    });

    expect(result.current.playingRef.current).toBe(false);
    expect(result.current.isScrubbing).toBe(true);
    expect(result.current.positionSecRef.current).toBe(2.5);
    expect(onScrubTimeChange).toHaveBeenCalledWith(2.5);
  });
});
