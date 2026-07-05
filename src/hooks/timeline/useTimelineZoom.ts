/**
 * Zoom, viewport, scroll anchor, and ruler ticks for Structure Timeline (Epic T55).
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  FALLBACK_MIN_PX_PER_SEC,
  MAX_PX_PER_SEC,
  getFitPxPerSec,
  pxPerSecFromZoom,
  stableZoomOnFitChange,
} from "@/lib/timeline-zoom";
import {
  formatTimelineTimeLabel,
  resolveRulerScale,
} from "@/lib/timeline-ruler-scale";

export interface UseTimelineZoomOptions {
  scrollRef: RefObject<HTMLDivElement | null>;
  viewStartSecRef: RefObject<number>;
  pxPerSecRef: RefObject<number>;
  totalDurationSec: number;
  /**
   * Fixed non-timeline width inside the scroller (sticky label column).
   * Viewport width and zoom cursor anchors are measured after this inset.
   */
  originInsetPx?: number;
  onScroll?: () => void;
}

export function useTimelineZoom({
  scrollRef,
  viewStartSecRef,
  pxPerSecRef,
  totalDurationSec,
  originInsetPx = 0,
  onScroll,
}: UseTimelineZoomOptions) {
  const [zoom, setZoom] = useState(0);
  const [pxPerSec, setPxPerSec] = useState(FALLBACK_MIN_PX_PER_SEC);
  const [fitPxPerSec, setFitPxPerSec] = useState(FALLBACK_MIN_PX_PER_SEC);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const initialZoomSetRef = useRef(false);
  const prevFitPxPerSecRef = useRef(FALLBACK_MIN_PX_PER_SEC);
  const onScrollRef = useRef(onScroll);
  onScrollRef.current = onScroll;
  const originInsetRef = useRef(originInsetPx);
  originInsetRef.current = originInsetPx;

  pxPerSecRef.current = pxPerSec;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportWidth(
          Math.max(0, entry.contentRect.width - originInsetRef.current),
        );
      }
    });

    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setViewportWidth(Math.max(0, el.clientWidth - originInsetPx));
  }, [originInsetPx, scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      setScrollLeft(el.scrollLeft);
      viewStartSecRef.current = el.scrollLeft / (pxPerSecRef.current || 1);
      onScrollRef.current?.();
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [pxPerSecRef, scrollRef, viewStartSecRef]);

  useEffect(() => {
    if (!viewportWidth || totalDurationSec <= 0) return;

    const dynamicFitPx = getFitPxPerSec(totalDurationSec, viewportWidth);
    const prevFitPx = prevFitPxPerSecRef.current;

    if (
      initialZoomSetRef.current &&
      Math.abs(prevFitPx - dynamicFitPx) <= 0.0001
    ) {
      return;
    }

    setFitPxPerSec(dynamicFitPx);
    prevFitPxPerSecRef.current = dynamicFitPx;

    if (!initialZoomSetRef.current) {
      const newPxPerSec = pxPerSecFromZoom(zoom, dynamicFitPx);
      setPxPerSec(newPxPerSec);
      initialZoomSetRef.current = true;
      return;
    }

    const stable = stableZoomOnFitChange(pxPerSecRef.current, dynamicFitPx);
    setPxPerSec(stable.pxPerSec);
    setZoom(stable.zoom);
  }, [pxPerSecRef, totalDurationSec, viewportWidth]);

  const totalWidthPx = totalDurationSec * pxPerSec;
  const viewStartSec = scrollLeft / (pxPerSec || 1);
  const viewEndSec = viewStartSec + (viewportWidth || 0) / (pxPerSec || 1);

  const rulerScale = resolveRulerScale({
    pxPerSec,
    viewStartSec,
    viewEndSec,
  });
  const { majorTicks, minorTicks, majorStepSec: tickStep } = rulerScale;
  const ticks = majorTicks.map((tick) => ({
    ...tick,
    label: tick.label ?? formatTimelineTimeLabel(tick.sec),
  }));

  const setZoomAroundCursor = useCallback(
    (newZoom: number, anchorX?: number) => {
      const el = scrollRef.current;
      const nextPx = pxPerSecFromZoom(newZoom, fitPxPerSec);

      if (!el || !viewportWidth) {
        setZoom(newZoom);
        setPxPerSec(nextPx);
        return;
      }

      const oldPx = pxPerSec;
      const cursorX = anchorX ?? viewportWidth / 2;
      const unitUnderCursor = (el.scrollLeft + cursorX) / oldPx;
      const newScrollLeft = unitUnderCursor * nextPx - cursorX;

      setZoom(newZoom);
      setPxPerSec(nextPx);

      requestAnimationFrame(() => {
        el.scrollLeft = newScrollLeft;
      });
    },
    [fitPxPerSec, pxPerSec, scrollRef, viewportWidth],
  );

  const handleZoomSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setZoomAroundCursor(Number(e.target.value));
    },
    [setZoomAroundCursor],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomDelta = -e.deltaY * 0.001;
        const newZoom = Math.max(0, Math.min(1, zoom + zoomDelta));
        const rect = scrollRef.current?.getBoundingClientRect();
        const cursorX = rect
          ? e.clientX - rect.left - originInsetRef.current
          : viewportWidth / 2;
        setZoomAroundCursor(newZoom, cursorX);
      }
    },
    [scrollRef, setZoomAroundCursor, viewportWidth, zoom],
  );

  return {
    zoom,
    pxPerSec,
    fitPxPerSec,
    viewportWidth,
    scrollLeft,
    totalWidthPx,
    viewStartSec,
    viewEndSec,
    ticks,
    minorTicks,
    tickStep,
    setZoomAroundCursor,
    handleZoomSlider,
    handleWheel,
    formatTimeLabel: formatTimelineTimeLabel,
    maxPxPerSec: MAX_PX_PER_SEC,
  };
}
