/**
 * CapCut-style marquee selection — scoped stacks (beat solo / structure cross-track).
 * Location: src/hooks/useTimelineMarqueeSelection.ts
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { TIMELINE_SELECTABLE_LANES } from "../lib/timeline-selection/lane-config";
import {
  clientToContainerPoint,
  normalizeMarqueeRect,
  queryStackMarqueeHits,
  type StackMarqueeHits,
} from "../lib/timeline-selection/hit-test";
import type {
  MarqueeRect,
  TimelineInteractionMode,
  TimelineSelectableKind,
  TimelineSelectionState,
} from "../lib/timeline-selection/types";
import {
  cloneTimelineSelection,
  EMPTY_TIMELINE_SELECTION,
  isClipSelected,
  TIMELINE_KIND_STATE_KEY,
  timelineSelectionCountForKinds,
  timelineSelectionIsEmptyForKinds,
} from "../lib/timeline-selection/types";

const MARQUEE_DRAG_THRESHOLD_PX = 4;

interface PendingMarquee {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  additive: boolean;
}

export interface MarqueeGestureSeed {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  additive: boolean;
  clientX?: number;
  clientY?: number;
}

export interface UseTimelineMarqueeSelectionOptions {
  kinds: readonly TimelineSelectableKind[];
  getStackRef: () => RefObject<HTMLElement | null>;
  interactionModeRef: RefObject<TimelineInteractionMode>;
  isGestureBlocked: () => boolean;
  onPeerClear?: () => void;
  onEdit: (kind: TimelineSelectableKind, id: string) => void;
  onBatchDelete: (selection: TimelineSelectionState) => void | Promise<void>;
  onBatchDuplicate: (selection: TimelineSelectionState) => void | Promise<void>;
}

/** Used by body-move conflict resolution in move mode. */
export function shouldUseMarqueeInsteadOfBodyMove(input: {
  dx: number;
  dy: number;
  thresholdPx: number;
  shiftKey: boolean;
  altKey: boolean;
  interactionMode: TimelineInteractionMode;
}): boolean {
  if (input.interactionMode === "select") return true;
  if (input.shiftKey || input.altKey) return true;
  return (
    Math.abs(input.dx) > input.thresholdPx &&
    Math.abs(input.dy) > input.thresholdPx
  );
}

function hitsToSelection(
  hits: StackMarqueeHits,
  kinds: readonly TimelineSelectableKind[],
): TimelineSelectionState {
  const state = cloneTimelineSelection(EMPTY_TIMELINE_SELECTION);
  for (const kind of kinds) {
    const key = TIMELINE_KIND_STATE_KEY[kind];
    state[key] = new Set(hits[key]);
  }
  return state;
}

function mergeSelectionForKinds(
  base: TimelineSelectionState,
  add: TimelineSelectionState,
  kinds: readonly TimelineSelectableKind[],
): TimelineSelectionState {
  const next = cloneTimelineSelection(base);
  for (const kind of kinds) {
    const key = TIMELINE_KIND_STATE_KEY[kind];
    for (const id of add[key]) next[key].add(id);
  }
  return next;
}

function isTrimHandleTarget(target: HTMLElement): boolean {
  return Boolean(
    target.closest("[data-beat-trim-handle]") ||
    target.closest("[data-structure-trim-handle]"),
  );
}

function isClipTargetForKinds(
  target: HTMLElement,
  kinds: readonly TimelineSelectableKind[],
): boolean {
  return kinds.some((kind) =>
    target.closest(TIMELINE_SELECTABLE_LANES[kind].selector),
  );
}

export function useTimelineMarqueeSelection(
  options: UseTimelineMarqueeSelectionOptions,
) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const kinds = options.kinds;

  const [selection, setSelection] = useState<TimelineSelectionState>(
    EMPTY_TIMELINE_SELECTION,
  );
  const [previewSelection, setPreviewSelection] =
    useState<TimelineSelectionState | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);

  const pendingMarqueeRef = useRef<PendingMarquee | null>(null);
  const activeMarqueeRef = useRef(false);
  const skipNextClipClickRef = useRef(false);
  const marqueeFinishedRef = useRef(false);
  const listenersRegisteredRef = useRef(false);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const onWindowPointerMoveRef = useRef<(e: PointerEvent) => void>(() => {});
  const onWindowPointerUpRef = useRef<(e: PointerEvent) => void>(() => {});

  const displaySelection = previewSelection ?? selection;
  const scopedSelectionCount = timelineSelectionCountForKinds(
    displaySelection,
    kinds,
  );

  const clearSelection = useCallback(() => {
    setPreviewSelection(null);
    setSelection(cloneTimelineSelection(EMPTY_TIMELINE_SELECTION));
  }, []);

  const isSelected = useCallback(
    (kind: TimelineSelectableKind, id: string) =>
      isClipSelected(displaySelection, kind, id),
    [displaySelection],
  );

  const finishMarqueeSession = useCallback(() => {
    pendingMarqueeRef.current = null;
    activeMarqueeRef.current = false;
    setMarqueeRect(null);
    setPreviewSelection(null);
    if (listenersRegisteredRef.current) {
      window.removeEventListener("pointermove", onWindowPointerMoveRef.current);
      window.removeEventListener("pointerup", onWindowPointerUpRef.current);
      window.removeEventListener("pointercancel", onWindowPointerUpRef.current);
      listenersRegisteredRef.current = false;
    }
  }, []);

  const applyMarqueeHits = useCallback(
    (hits: TimelineSelectionState, additive: boolean) => {
      if (additive) {
        setSelection((prev) => mergeSelectionForKinds(prev, hits, kinds));
      } else {
        setSelection(hits);
      }
    },
    [kinds],
  );

  onWindowPointerMoveRef.current = (e: PointerEvent) => {
    const pending = pendingMarqueeRef.current;
    if (!pending || e.pointerId !== pending.pointerId) return;

    const stack = optionsRef.current.getStackRef().current;
    if (!stack) return;

    const dx = e.clientX - pending.startClientX;
    const dy = e.clientY - pending.startClientY;
    if (
      !activeMarqueeRef.current &&
      Math.hypot(dx, dy) < MARQUEE_DRAG_THRESHOLD_PX
    ) {
      return;
    }

    activeMarqueeRef.current = true;
    const start = clientToContainerPoint(
      stack,
      pending.startClientX,
      pending.startClientY,
    );
    const end = clientToContainerPoint(stack, e.clientX, e.clientY);
    const rect = normalizeMarqueeRect(start.x, start.y, end.x, end.y);
    setMarqueeRect(rect);

    const hits = hitsToSelection(
      queryStackMarqueeHits(stack, rect, optionsRef.current.kinds),
      optionsRef.current.kinds,
    );
    if (pending.additive) {
      setPreviewSelection(
        mergeSelectionForKinds(
          selectionRef.current,
          hits,
          optionsRef.current.kinds,
        ),
      );
    } else {
      setPreviewSelection(hits);
    }
  };

  onWindowPointerUpRef.current = (e: PointerEvent) => {
    const pending = pendingMarqueeRef.current;
    if (!pending || e.pointerId !== pending.pointerId) return;

    const stack = optionsRef.current.getStackRef().current;
    const wasActive = activeMarqueeRef.current;

    if (wasActive && stack) {
      const start = clientToContainerPoint(
        stack,
        pending.startClientX,
        pending.startClientY,
      );
      const end = clientToContainerPoint(stack, e.clientX, e.clientY);
      const rect = normalizeMarqueeRect(start.x, start.y, end.x, end.y);
      const hits = hitsToSelection(
        queryStackMarqueeHits(stack, rect, optionsRef.current.kinds),
        optionsRef.current.kinds,
      );
      applyMarqueeHits(hits, pending.additive);
      marqueeFinishedRef.current = true;
      skipNextClipClickRef.current = true;
    }

    finishMarqueeSession();
  };

  const registerWindowListeners = useCallback(() => {
    if (listenersRegisteredRef.current) return;
    window.addEventListener("pointermove", onWindowPointerMoveRef.current);
    window.addEventListener("pointerup", onWindowPointerUpRef.current);
    window.addEventListener("pointercancel", onWindowPointerUpRef.current);
    listenersRegisteredRef.current = true;
  }, []);

  const armMarquee = useCallback(
    (seed: Omit<PendingMarquee, never>) => {
      if (optionsRef.current.isGestureBlocked()) return false;
      const stack = optionsRef.current.getStackRef().current;
      if (!stack) return false;

      pendingMarqueeRef.current = seed;
      if (!seed.additive) {
        setSelection(cloneTimelineSelection(EMPTY_TIMELINE_SELECTION));
        setPreviewSelection(null);
        optionsRef.current.onPeerClear?.();
      }

      registerWindowListeners();
      return true;
    },
    [registerWindowListeners],
  );

  const beginMarqueeGesture = useCallback(
    (seed: MarqueeGestureSeed): boolean => {
      const armed = armMarquee({
        pointerId: seed.pointerId,
        startClientX: seed.startClientX,
        startClientY: seed.startClientY,
        additive: seed.additive,
      });
      if (!armed) return false;

      if (seed.clientX != null && seed.clientY != null) {
        onWindowPointerMoveRef.current({
          pointerId: seed.pointerId,
          clientX: seed.clientX,
          clientY: seed.clientY,
        } as PointerEvent);
      }
      return true;
    },
    [armMarquee],
  );

  const shouldStartMarquee = useCallback(
    (
      e: React.PointerEvent,
      mode: TimelineInteractionMode,
      opts?: { allowOnClip?: boolean },
    ) => {
      if (mode !== "select" && !e.shiftKey && !e.altKey) return false;
      if (optionsRef.current.isGestureBlocked()) return false;
      if (e.button !== 0) return false;

      const target = e.target as HTMLElement;
      if (isTrimHandleTarget(target)) return false;
      if (
        isClipTargetForKinds(target, optionsRef.current.kinds) &&
        !opts?.allowOnClip &&
        mode !== "select"
      ) {
        return false;
      }
      return true;
    },
    [],
  );

  const handleStackPointerDown = useCallback(
    (e: React.PointerEvent, mode: TimelineInteractionMode) => {
      if (!shouldStartMarquee(e, mode)) return;

      const stack = optionsRef.current.getStackRef().current;
      if (!stack) return;
      if (
        e.target !== stack &&
        !isClipTargetForKinds(e.target as HTMLElement, optionsRef.current.kinds)
      ) {
        return;
      }

      armMarquee({
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        additive: e.shiftKey,
      });
    },
    [armMarquee, shouldStartMarquee],
  );

  const handleStackPointerDownCapture = useCallback(
    (e: React.PointerEvent, mode: TimelineInteractionMode) => {
      if (mode !== "select" && !e.shiftKey && !e.altKey) return;
      if (!shouldStartMarquee(e, mode, { allowOnClip: true })) return;

      armMarquee({
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        additive: e.shiftKey,
      });
      e.stopPropagation();
    },
    [armMarquee, shouldStartMarquee],
  );

  const handleStackContextMenu = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    for (const kind of optionsRef.current.kinds) {
      const clipEl = target.closest<HTMLElement>(
        TIMELINE_SELECTABLE_LANES[kind].selector,
      );
      if (!clipEl) continue;
      const id = TIMELINE_SELECTABLE_LANES[kind].readId(clipEl);
      if (!id) continue;
      if (isClipSelected(selectionRef.current, kind, id)) return;
      optionsRef.current.onPeerClear?.();
      const next = cloneTimelineSelection(EMPTY_TIMELINE_SELECTION);
      next[TIMELINE_KIND_STATE_KEY[kind]] = new Set([id]);
      setSelection(next);
      return;
    }
  }, []);

  const handleClipShiftClick = useCallback(
    (kind: TimelineSelectableKind, id: string, e: React.MouseEvent) => {
      if (!e.shiftKey) return false;
      if (!optionsRef.current.kinds.includes(kind)) return false;
      if (optionsRef.current.isGestureBlocked()) return false;
      e.preventDefault();
      e.stopPropagation();
      skipNextClipClickRef.current = true;
      optionsRef.current.onPeerClear?.();

      setSelection((prev) => {
        const next = cloneTimelineSelection(prev);
        const set = next[TIMELINE_KIND_STATE_KEY[kind]];
        if (set.has(id)) set.delete(id);
        else set.add(id);
        return next;
      });
      return true;
    },
    [],
  );

  const shouldSuppressClipClick = useCallback(() => {
    if (skipNextClipClickRef.current) {
      skipNextClipClickRef.current = false;
      return true;
    }
    if (marqueeFinishedRef.current) {
      marqueeFinishedRef.current = false;
      return true;
    }
    return false;
  }, []);

  const isMarqueeActive = useCallback(
    () => pendingMarqueeRef.current != null || activeMarqueeRef.current,
    [],
  );

  const getMarqueeRect = useCallback(
    (): MarqueeRect | null => marqueeRect,
    [marqueeRect],
  );

  const runBatchDelete = useCallback(() => {
    const snap = selectionRef.current;
    if (timelineSelectionIsEmptyForKinds(snap, kinds)) return;
    void optionsRef.current.onBatchDelete(cloneTimelineSelection(snap));
    clearSelection();
  }, [clearSelection, kinds]);

  const runBatchDuplicate = useCallback(() => {
    const snap = selectionRef.current;
    if (timelineSelectionIsEmptyForKinds(snap, kinds)) return;
    void optionsRef.current.onBatchDuplicate(cloneTimelineSelection(snap));
  }, [kinds]);

  const runEditSingle = useCallback(() => {
    const snap = selectionRef.current;
    if (timelineSelectionCountForKinds(snap, kinds) !== 1) return;
    for (const kind of kinds) {
      const set = snap[TIMELINE_KIND_STATE_KEY[kind]];
      if (set.size === 1) {
        optionsRef.current.onEdit(kind, [...set][0]!);
        return;
      }
    }
  }, [kinds]);

  const getGroupMoveIds = useCallback(
    (kind: TimelineSelectableKind, anchorId: string): string[] | undefined => {
      if (!kinds.includes(kind)) return undefined;
      const snap = selectionRef.current;
      const set = snap[TIMELINE_KIND_STATE_KEY[kind]];
      if (set.size < 2 || !set.has(anchorId)) return undefined;
      return [...set];
    },
    [kinds],
  );

  useEffect(() => {
    if (timelineSelectionIsEmptyForKinds(selection, kinds)) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (optionsRef.current.isGestureBlocked()) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        clearSelection();
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        runBatchDelete();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        runBatchDuplicate();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearSelection, kinds, runBatchDelete, runBatchDuplicate, selection]);

  return useMemo(
    () => ({
      selection,
      displaySelection,
      scopedSelectionCount,
      isSelected,
      clearSelection,
      shouldSuppressClipClick,
      handleStackPointerDown,
      handleStackPointerDownCapture,
      handleStackContextMenu,
      handleClipShiftClick,
      beginMarqueeGesture,
      isMarqueeActive,
      getMarqueeRect,
      getGroupMoveIds,
      runBatchDelete,
      runBatchDuplicate,
      runEditSingle,
    }),
    [
      selection,
      displaySelection,
      scopedSelectionCount,
      isSelected,
      clearSelection,
      shouldSuppressClipClick,
      handleStackPointerDown,
      handleStackPointerDownCapture,
      handleStackContextMenu,
      handleClipShiftClick,
      beginMarqueeGesture,
      isMarqueeActive,
      getMarqueeRect,
      getGroupMoveIds,
      runBatchDelete,
      runBatchDuplicate,
      runEditSingle,
    ],
  );
}

export type TimelineMarqueeSelectionApi = ReturnType<
  typeof useTimelineMarqueeSelection
>;
