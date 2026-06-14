/**
 * Authoritative timeline transport + 60fps RAF playhead (CapCut/TheStuu-like).
 * Location: src/hooks/timeline/useTimelineTransport.ts
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import {
  clampTimelineTimeSec,
  playheadLeftPxFromTimeSec,
  timeSecFromTimelineClientX,
} from "./timeline-scrub-utils";

export const TIMELINE_PLAYHEAD_CSS_VAR = "--playhead-left-px";

const SCRUB_STATE_SYNC_MS = 80;
const SCRUB_CLICK_SUPPRESS_MS = 400;

export interface UseTimelineTransportOptions {
  durationSec: number;
  scrollRef: RefObject<HTMLDivElement | null>;
  trackLabelsRef: RefObject<HTMLDivElement | null>;
  viewStartSec: number;
  pxPerSec: number;
  /** Shared with structure trim/move bridges for viewport sync. */
  viewStartSecRef?: RefObject<number>;
  /** Bump on project change to force playhead CSS sync after remount. */
  playheadSyncGeneration?: number;
  onTick?: (displayTimeSec: number) => void;
  /** Book preview / strategy sync on every scrub frame and on release. */
  onScrubTimeChange?: (timeSec: number) => void;
}

export interface TimelinePlayheadScrubHandlers {
  onPlayheadPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onRulerClick: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

function applyPlayheadCssVar(
  scrollEl: HTMLElement | null,
  pixelPosition: number,
  syncGeneration: number,
  appliedGenRef: RefObject<number>,
  lastPxRef: RefObject<number>,
): void {
  if (!scrollEl) return;

  const leftPx = `${pixelPosition}px`;
  const genChanged = syncGeneration !== appliedGenRef.current;
  const pxChanged = Math.abs(pixelPosition - lastPxRef.current) >= 0.05;

  if (genChanged || pxChanged) {
    appliedGenRef.current = syncGeneration;
    lastPxRef.current = pixelPosition;
    scrollEl.style.setProperty(TIMELINE_PLAYHEAD_CSS_VAR, leftPx);
  }
}

export function useTimelineTransport({
  durationSec,
  scrollRef,
  trackLabelsRef,
  viewStartSec,
  pxPerSec,
  viewStartSecRef: externalViewStartSecRef,
  playheadSyncGeneration = 0,
  onTick,
  onScrubTimeChange,
}: UseTimelineTransportOptions) {
  const [playing, setPlaying] = useState(false);
  const [positionSec, setPositionSec] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const durationRef = useRef(durationSec);
  durationRef.current = durationSec;

  const internalViewStartSecRef = useRef(viewStartSec);
  const viewStartSecRef = externalViewStartSecRef ?? internalViewStartSecRef;
  const pxPerSecRef = useRef(pxPerSec);
  const playingRef = useRef(false);
  const positionSecRef = useRef(0);
  const anchorMsRef = useRef(0);
  const anchorSecRef = useRef(0);
  const lastStateUpdateTimeRef = useRef(0);
  const transportRafRef = useRef<number | null>(null);
  const playheadAppliedGenRef = useRef(-1);
  const playheadLeftPxRef = useRef(-1);
  const isScrubbingRef = useRef(false);
  const suppressRulerClickUntilRef = useRef(0);
  const lastScrubStateSyncRef = useRef(0);
  const onTickRef = useRef(onTick);
  const onScrubTimeChangeRef = useRef(onScrubTimeChange);
  onTickRef.current = onTick;
  onScrubTimeChangeRef.current = onScrubTimeChange;

  const anchorPlaybackClock = useCallback(() => {
    anchorMsRef.current = performance.now();
    anchorSecRef.current = positionSecRef.current;
  }, []);

  const syncReactPosition = useCallback((sec: number) => {
    positionSecRef.current = sec;
    setPositionSec(sec);
  }, []);

  const timeFromClientX = useCallback(
    (clientX: number): number => {
      const scrollEl = scrollRef.current;
      if (!scrollEl) return positionSecRef.current;
      return timeSecFromTimelineClientX(
        clientX,
        scrollEl,
        pxPerSecRef.current,
        durationRef.current,
      );
    },
    [scrollRef],
  );

  const applyScrubPosition = useCallback(
    (timeSec: number, options?: { syncReact?: boolean }) => {
      const clamped = clampTimelineTimeSec(timeSec, durationRef.current);
      positionSecRef.current = clamped;

      const scrollEl = scrollRef.current;
      if (scrollEl && pxPerSecRef.current > 0) {
        const pixelPosition = playheadLeftPxFromTimeSec(
          clamped,
          scrollEl,
          pxPerSecRef.current,
        );
        applyPlayheadCssVar(
          scrollEl,
          pixelPosition,
          playheadSyncGeneration,
          playheadAppliedGenRef,
          playheadLeftPxRef,
        );
      }

      try {
        onTickRef.current?.(clamped);
      } catch (error) {
        console.error("[useTimelineTransport] onTick failed:", error);
      }
      onScrubTimeChangeRef.current?.(clamped);

      if (options?.syncReact) {
        setPositionSec(clamped);
        lastScrubStateSyncRef.current = performance.now();
        return;
      }

      const now = performance.now();
      if (now - lastScrubStateSyncRef.current >= SCRUB_STATE_SYNC_MS) {
        setPositionSec(clamped);
        lastScrubStateSyncRef.current = now;
      }
    },
    [playheadSyncGeneration, scrollRef],
  );

  const play = useCallback(() => {
    if (positionSecRef.current >= durationRef.current) {
      syncReactPosition(0);
    }
    anchorPlaybackClock();
    playingRef.current = true;
    setPlaying(true);
    lastStateUpdateTimeRef.current = performance.now();
  }, [anchorPlaybackClock, syncReactPosition]);

  const pause = useCallback(() => {
    if (playingRef.current) {
      const elapsed = (performance.now() - anchorMsRef.current) / 1000;
      const pausedAt = Math.min(
        durationRef.current,
        anchorSecRef.current + elapsed,
      );
      positionSecRef.current = pausedAt;
      setPositionSec(pausedAt);
    }
    playingRef.current = false;
    setPlaying(false);
  }, []);

  const stop = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    syncReactPosition(0);
    anchorPlaybackClock();
  }, [anchorPlaybackClock, syncReactPosition]);

  const toggle = useCallback(() => {
    if (playingRef.current) pause();
    else play();
  }, [pause, play]);

  const seek = useCallback(
    (timeSec: number) => {
      const clamped = clampTimelineTimeSec(timeSec, durationRef.current);
      positionSecRef.current = clamped;
      setPositionSec(clamped);
      if (playingRef.current) {
        anchorPlaybackClock();
      }
    },
    [anchorPlaybackClock],
  );

  const seekFromClientX = useCallback(
    (clientX: number) => {
      applyScrubPosition(timeFromClientX(clientX), { syncReact: true });
      if (playingRef.current) {
        anchorPlaybackClock();
      }
    },
    [anchorPlaybackClock, applyScrubPosition, timeFromClientX],
  );

  const endScrub = useCallback(
    (clientX: number) => {
      isScrubbingRef.current = false;
      setIsScrubbing(false);
      suppressRulerClickUntilRef.current =
        performance.now() + SCRUB_CLICK_SUPPRESS_MS;
      applyScrubPosition(timeFromClientX(clientX), { syncReact: true });
    },
    [applyScrubPosition, timeFromClientX],
  );

  const onPlayheadPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      if (!scrollRef.current) return;

      if (playingRef.current) {
        pause();
      }

      isScrubbingRef.current = true;
      setIsScrubbing(true);
      applyScrubPosition(timeFromClientX(event.clientX));

      const captureTarget = event.currentTarget;
      captureTarget.setPointerCapture(event.pointerId);

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (!isScrubbingRef.current) return;
        applyScrubPosition(timeFromClientX(moveEvent.clientX));
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        endScrub(upEvent.clientX);
        if (captureTarget.hasPointerCapture(upEvent.pointerId)) {
          captureTarget.releasePointerCapture(upEvent.pointerId);
        }
        captureTarget.removeEventListener("pointermove", onPointerMove);
        captureTarget.removeEventListener("pointerup", onPointerUp);
        captureTarget.removeEventListener("pointercancel", onPointerUp);
      };

      captureTarget.addEventListener("pointermove", onPointerMove);
      captureTarget.addEventListener("pointerup", onPointerUp);
      captureTarget.addEventListener("pointercancel", onPointerUp);
    },
    [applyScrubPosition, endScrub, pause, scrollRef, timeFromClientX],
  );

  const onRulerClick = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (performance.now() < suppressRulerClickUntilRef.current) return;
      if (isScrubbingRef.current) return;
      event.preventDefault();
      seekFromClientX(event.clientX);
    },
    [seekFromClientX],
  );

  const playheadScrubHandlers: TimelinePlayheadScrubHandlers = {
    onPlayheadPointerDown,
    onRulerClick,
  };

  pxPerSecRef.current = pxPerSec;
  if (!playingRef.current && !isScrubbingRef.current) {
    viewStartSecRef.current = viewStartSec;
  }

  useLayoutEffect(() => {
    if (playing !== playingRef.current) {
      setPlaying(playingRef.current);
    }
  }, [playing]);

  useEffect(() => {
    playheadAppliedGenRef.current = -1;
    playheadLeftPxRef.current = -1;
  }, [playheadSyncGeneration]);

  useEffect(() => {
    const updateTransport = () => {
      let displayTime: number;

      if (playingRef.current) {
        const elapsed = (performance.now() - anchorMsRef.current) / 1000;
        displayTime = anchorSecRef.current + elapsed;

        positionSecRef.current = displayTime;
        try {
          onTickRef.current?.(displayTime);
        } catch (error) {
          console.error("[useTimelineTransport] onTick failed:", error);
        }

        const maxSec = Math.max(1e-6, durationRef.current);
        if (displayTime >= maxSec) {
          displayTime = maxSec;
          positionSecRef.current = maxSec;
          playingRef.current = false;
          setPlaying(false);
          setPositionSec(maxSec);
        } else if (performance.now() - lastStateUpdateTimeRef.current > 100) {
          setPositionSec(displayTime);
          lastStateUpdateTimeRef.current = performance.now();
        }
      } else {
        displayTime = positionSecRef.current;
      }

      if (playingRef.current && scrollRef.current && pxPerSecRef.current > 0) {
        const el = scrollRef.current;
        const playheadPx = displayTime * pxPerSecRef.current;
        const leadPx = el.clientWidth * 0.25;
        const targetScroll = Math.max(0, playheadPx - leadPx);
        if (Math.abs(el.scrollLeft - targetScroll) > 2) {
          el.scrollLeft = targetScroll;
          viewStartSecRef.current = el.scrollLeft / pxPerSecRef.current;
          const labels = trackLabelsRef.current;
          if (labels && labels.scrollTop !== el.scrollTop) {
            labels.scrollTop = el.scrollTop;
          }
        }
      }

      const viewStartSecLive =
        scrollRef.current && pxPerSecRef.current > 0
          ? scrollRef.current.scrollLeft / pxPerSecRef.current
          : viewStartSecRef.current;
      viewStartSecRef.current = viewStartSecLive;

      const pixelPosition =
        (displayTime - viewStartSecLive) * pxPerSecRef.current;

      applyPlayheadCssVar(
        scrollRef.current,
        pixelPosition,
        playheadSyncGeneration,
        playheadAppliedGenRef,
        playheadLeftPxRef,
      );

      transportRafRef.current = requestAnimationFrame(updateTransport);
    };

    transportRafRef.current = requestAnimationFrame(updateTransport);
    return () => {
      if (transportRafRef.current) {
        cancelAnimationFrame(transportRafRef.current);
        transportRafRef.current = null;
      }
    };
  }, [playheadSyncGeneration, scrollRef, trackLabelsRef, viewStartSecRef]);

  const reanchorPlaybackClock = anchorPlaybackClock;

  return {
    playing,
    setPlaying,
    positionSec,
    setPositionSec,
    playingRef,
    positionSecRef,
    isScrubbing,
    /** @deprecated use isScrubbing */
    isDraggingCursor: isScrubbing,
    play,
    pause,
    stop,
    toggle,
    seek,
    seekFromClientX,
    playheadScrubHandlers,
    reanchorPlaybackClock,
    /** @deprecated use playing */
    isPlaying: playing,
    /** @deprecated use setPlaying */
    setIsPlaying: setPlaying,
    /** @deprecated use positionSec */
    currentTime: positionSec,
    /** @deprecated use setPositionSec */
    setCurrentTime: setPositionSec,
    /** @deprecated use playingRef */
    isPlayingRef: playingRef,
    /** @deprecated use positionSecRef */
    currentTimeRef: positionSecRef,
  };
}
