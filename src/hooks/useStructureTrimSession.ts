/**
 * VETILALORAPP — React adapter for structure trim (no setState on moveTrim).
 * Location: src/hooks/useStructureTrimSession.ts
 */

import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { diffTreeToPatches } from "../lib/timeline-tree/diff";
import type { TreePatch } from "../lib/timeline-tree/diff";
import { cloneTimelineTree } from "../lib/timeline-tree/tree-utils";
import type {
  ItemKind,
  StructureTrimOperation,
  TimelineTree,
  TrimSide,
} from "../lib/timeline-tree/types";
import {
  DEFAULT_MIN_ITEM_DURATION_FRAMES,
  DEFAULT_SNAP_THRESHOLD_FRAMES,
} from "../lib/timeline-tree/types";
import { resizeStructureItem } from "../lib/ripple-engine/hierarchical";
import {
  applyStructurePreviewToDOM,
  resetStructurePreviewStyles,
  type StructurePreviewContainers,
} from "../lib/ripple-engine/preview";
import type { RippleResult } from "../lib/timeline-tree/types";
import { logStructureTrimBlock } from "../lib/ripple-engine/structure-trim-debug";

export interface StructureTrimSessionActive {
  itemId: string;
  kind: ItemKind;
  side: TrimSide;
  operation: StructureTrimOperation;
  pointerId: number;
}

export interface UseStructureTrimSessionOptions {
  tree: TimelineTree;
  minItemDurationFrames?: number;
  snapThresholdFrames?: number;
  pxPerFrameRef: React.RefObject<number>;
  viewStartFrameRef: React.RefObject<number>;
  getSnapEdges: (input: {
    tree: TimelineTree;
    itemId: string;
    kind: ItemKind;
    side: TrimSide;
  }) => number[];
  getContainers: () => StructurePreviewContainers;
  onCommit: (args: {
    before: TimelineTree;
    next: TimelineTree;
    patches: TreePatch[];
  }) => void | Promise<void>;
  onRevert: (before: TimelineTree) => void;
  /** After endTrim/cancelTrim — e.g. bump layout epoch to force React remount. */
  onTrimSessionEnd?: () => void;
}

export function useStructureTrimSession(
  options: UseStructureTrimSessionOptions,
) {
  const dragStartTreeRef = useRef<TimelineTree | null>(null);
  const dragStartBoundaryFrameRef = useRef(0);
  const startXRef = useRef(0);
  const activeSessionRef = useRef<StructureTrimSessionActive | null>(null);
  const latestPreviewResultRef = useRef<RippleResult | null>(null);
  const previewTouchedIdsRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);

  const finishTrimSession = useCallback(() => {
    options.onTrimSessionEnd?.();
  }, [options]);

  const minDur =
    options.minItemDurationFrames ?? DEFAULT_MIN_ITEM_DURATION_FRAMES;
  const snapThreshold =
    options.snapThresholdFrames ?? DEFAULT_SNAP_THRESHOLD_FRAMES;

  const startTrim = useCallback(
    (args: {
      itemId: string;
      kind: ItemKind;
      side: TrimSide;
      operation?: StructureTrimOperation;
      clientX: number;
      pointerId: number;
    }) => {
      const item = options.tree.items.get(args.itemId);
      if (!item) return;

      // Plan §5 Snapshot-Disziplin: frozen Klon, nicht die Live-Referenz.
      // Verhindert kumulative Drift, wenn der Tree während des Drags neu gebaut wird.
      dragStartTreeRef.current = cloneTimelineTree(options.tree);
      dragStartBoundaryFrameRef.current =
        args.side === "right" ? item.endFrame : item.startFrame;
      startXRef.current = args.clientX;
      activeSessionRef.current = {
        itemId: args.itemId,
        kind: args.kind,
        side: args.side,
        operation: args.operation ?? "ripple-resize",
        pointerId: args.pointerId,
      };
      latestPreviewResultRef.current = null;
      previewTouchedIdsRef.current = new Set();
    },
    [options.tree],
  );

  const computeTrimAtClientX = useCallback(
    (clientX: number): RippleResult | null => {
      const session = activeSessionRef.current;
      const frozen = dragStartTreeRef.current;
      if (!session || !frozen) return null;

      const pxPerFrame = options.pxPerFrameRef.current ?? 1;
      const deltaFrames = Math.round(
        (clientX - startXRef.current) / pxPerFrame,
      );
      const newBoundaryFrame = dragStartBoundaryFrameRef.current + deltaFrames;

      const snapEdges = options.getSnapEdges({
        tree: frozen,
        itemId: session.itemId,
        kind: session.kind,
        side: session.side,
      });

      return resizeStructureItem({
        tree: frozen,
        itemId: session.itemId,
        side: session.side,
        operation: session.operation,
        newBoundaryFrame,
        snapEdgesFrame: snapEdges,
        snapThresholdFrames: snapThreshold,
        minItemDurationFrames: minDur,
      });
    },
    [options, minDur, snapThreshold],
  );

  const applyPreviewFromLatest = useCallback(() => {
    const session = activeSessionRef.current;
    const result = latestPreviewResultRef.current;
    if (!session || !result || result.changedIds.size === 0) return;

    const pxPerFrame = options.pxPerFrameRef.current ?? 1;
    applyStructurePreviewToDOM({
      containerByKind: options.getContainers(),
      tree: result.next,
      changedIds: result.changedIds,
      viewStartFrame: options.viewStartFrameRef.current ?? 0,
      pxPerFrame,
    });
  }, [options]);

  const moveTrim = useCallback(
    (clientX: number) => {
      const session = activeSessionRef.current;
      if (!session || !dragStartTreeRef.current) return;

      const result = computeTrimAtClientX(clientX);
      if (!result) return;

      // Keep last valid preview — blocked moves during drag are normal (no console spam).
      if (!result.blocked && result.changedIds.size > 0) {
        latestPreviewResultRef.current = result;
        for (const id of result.changedIds) {
          previewTouchedIdsRef.current.add(id);
        }
      }

      const preview = latestPreviewResultRef.current;
      if (!preview || preview.blocked || preview.changedIds.size === 0) {
        return;
      }

      const pxPerFrame = options.pxPerFrameRef.current ?? 1;

      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        applyStructurePreviewToDOM({
          containerByKind: options.getContainers(),
          tree: preview.next,
          changedIds: preview.changedIds,
          viewStartFrame: options.viewStartFrameRef.current ?? 0,
          pxPerFrame,
        });
      });
    },
    [options, computeTrimAtClientX],
  );

  const cancelTrim = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    resetStructurePreviewStyles(
      options.getContainers(),
      previewTouchedIdsRef.current,
    );
    activeSessionRef.current = null;
    dragStartTreeRef.current = null;
    latestPreviewResultRef.current = null;
    previewTouchedIdsRef.current = new Set();
    finishTrimSession();
  }, [options, finishTrimSession]);

  const endTrim = useCallback(
    async (finalClientX?: number) => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (
        finalClientX != null &&
        activeSessionRef.current &&
        dragStartTreeRef.current
      ) {
        const finalResult = computeTrimAtClientX(finalClientX);
        if (
          finalResult &&
          !finalResult.blocked &&
          finalResult.changedIds.size > 0
        ) {
          latestPreviewResultRef.current = finalResult;
          for (const id of finalResult.changedIds) {
            previewTouchedIdsRef.current.add(id);
          }
        }
      }

      const result = latestPreviewResultRef.current;
      const session = activeSessionRef.current;

      activeSessionRef.current = null;
      dragStartTreeRef.current = null;

      if (!result || !session) {
        resetStructurePreviewStyles(
          options.getContainers(),
          previewTouchedIdsRef.current,
        );
        previewTouchedIdsRef.current = new Set();
        finishTrimSession();
        return;
      }

      if (result.blocked || result.changedIds.size === 0) {
        resetStructurePreviewStyles(
          options.getContainers(),
          previewTouchedIdsRef.current,
        );
        latestPreviewResultRef.current = null;
        previewTouchedIdsRef.current = new Set();
        finishTrimSession();
        if (result.blocked) {
          const reason = result.blockReason;
          const sessionKind = session.kind;
          logStructureTrimBlock({
            itemId: session.itemId,
            kind: sessionKind,
            side: session.side,
            operation: session.operation,
            blockReason: reason,
            invariantErrors: result.invariantErrors,
          });
          if (reason === "locked" || reason === "locked_ripple") {
            toast.error("Trim blockiert — gesperrtes Element im Ripple-Pfad.");
          } else if (reason === "would_violate_invariant") {
            const codes = (result.invariantErrors ?? [])
              .map((e) => e.code)
              .join(", ");
            toast.error(
              codes
                ? `Trim nicht möglich — ${codes}`
                : "Trim nicht möglich — würde Timeline-Regeln verletzen.",
            );
          } else {
            toast.error("Trim blockiert.");
          }
        }
        return;
      }

      const patches = diffTreeToPatches(result.before, result.next);

      try {
        await options.onCommit({
          before: result.before,
          next: result.next,
          patches,
        });
        resetStructurePreviewStyles(options.getContainers(), result.changedIds);
      } catch (err) {
        console.error("structure trim persist failed", err);
        toast.error("Struktur-Trim konnte nicht gespeichert werden.");
        options.onRevert(result.before);
        resetStructurePreviewStyles(
          options.getContainers(),
          previewTouchedIdsRef.current,
        );
      }

      latestPreviewResultRef.current = null;
      previewTouchedIdsRef.current = new Set();
      finishTrimSession();
    },
    [options, finishTrimSession, computeTrimAtClientX],
  );

  const isActive = useCallback(() => activeSessionRef.current !== null, []);

  return {
    startTrim,
    moveTrim,
    endTrim,
    cancelTrim,
    reapplyPreview: applyPreviewFromLatest,
    isActive,
    activeSessionRef,
  };
}
