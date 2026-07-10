/**
 * VETILALORAPP — React adapter for structure body move (no setState on move).
 * Location: src/hooks/useStructureMoveSession.ts
 */

import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { diffTreeToPatches } from "../lib/timeline-tree/diff";
import type { TreePatch } from "../lib/timeline-tree/diff";
import { cloneTimelineTree } from "../lib/timeline-tree/tree-utils";
import type { ItemKind, TimelineTree } from "../lib/timeline-tree/types";
import {
  DEFAULT_MIN_ITEM_DURATION_FRAMES,
  DEFAULT_SNAP_THRESHOLD_FRAMES,
} from "../lib/timeline-tree/types";
import { getSortedSiblings } from "../lib/timeline-tree/tree-utils";
import {
  moveStructureItemGroup,
  resolveStructureMoveOperation,
} from "../lib/ripple-engine/hierarchical-move";
import {
  resolveStructureMoveCommitDelta,
  resolveStructureMovePointerDelta,
} from "../lib/ripple-engine/structure-move-gesture";
import {
  applyStructureDragFollow,
  applyStructureDimOverlays,
  applyStructureDropZoneAcrossLanes,
  clearStructureDropZonesForLanes,
  clearStructureDropZonesOnExtraStacks,
  resetStructurePreviewStyles,
  type StructurePreviewContainers,
} from "../lib/ripple-engine/preview";
import {
  getStructureGroupMoveInsertionSlot,
  getStructureMoveInsertionSlot,
} from "../lib/ripple-engine/structure-move-drop-zone";
import type { RippleResult } from "../lib/timeline-tree/types";

export interface StructureMoveSessionActive {
  itemId: string;
  kind: ItemKind;
  pointerId: number;
  startFrame: number;
  groupIds?: string[];
}

export interface UseStructureMoveSessionOptions {
  tree: TimelineTree;
  minItemDurationFrames?: number;
  snapThresholdFrames?: number;
  pxPerFrameRef: React.RefObject<number>;
  viewStartFrameRef: React.RefObject<number>;
  getContainers: () => StructurePreviewContainers;
  /** Dialog/audio lane stacks that mirror the structure insertion slot (#49). */
  getExtraDropZoneStacks?: () => Array<HTMLElement | null | undefined>;
  onCommit: (args: {
    before: TimelineTree;
    next: TimelineTree;
    patches: TreePatch[];
  }) => void | Promise<void>;
  onRevert: (before: TimelineTree) => void;
  onMoveSessionEnd?: () => void;
}

export function useStructureMoveSession(
  options: UseStructureMoveSessionOptions,
) {
  const dragStartTreeRef = useRef<TimelineTree | null>(null);
  const startXRef = useRef(0);
  const startLeftPxByIdRef = useRef<Map<string, number>>(new Map());
  const lastDeltaFramesRef = useRef<number | null>(null);
  const activeSessionRef = useRef<StructureMoveSessionActive | null>(null);
  const latestPreviewResultRef = useRef<RippleResult | null>(null);
  const previewTouchedIdsRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const finishMoveSession = useCallback(() => {
    optionsRef.current.onMoveSessionEnd?.();
  }, []);

  const clearExtraDropZoneStacks = useCallback(() => {
    clearStructureDropZonesOnExtraStacks(
      optionsRef.current.getExtraDropZoneStacks?.() ?? [],
    );
  }, []);

  const minDur =
    options.minItemDurationFrames ?? DEFAULT_MIN_ITEM_DURATION_FRAMES;
  const snapThreshold =
    options.snapThresholdFrames ?? DEFAULT_SNAP_THRESHOLD_FRAMES;

  const readPointerDelta = useCallback(
    (session: StructureMoveSessionActive, clientX: number) => {
      const opts = optionsRef.current;
      const pxPerFrame = opts.pxPerFrameRef.current ?? 1;
      const viewStartFrame = opts.viewStartFrameRef.current ?? 0;
      return resolveStructureMovePointerDelta({
        startFrame: session.startFrame,
        startClientX: startXRef.current,
        clientX,
        pxPerFrame,
        viewStartFrame,
      });
    },
    [],
  );

  const startMove = useCallback(
    (args: {
      itemId: string;
      kind: ItemKind;
      clientX: number;
      pointerId: number;
      selectedIds?: string[];
    }) => {
      const opts = optionsRef.current;
      const item = opts.tree.items.get(args.itemId);
      if (!item) return;

      dragStartTreeRef.current = cloneTimelineTree(opts.tree);
      startXRef.current = args.clientX;
      lastDeltaFramesRef.current = null;

      let groupIds: string[] | undefined;
      if (
        args.selectedIds &&
        args.selectedIds.length > 1 &&
        args.selectedIds.includes(args.itemId)
      ) {
        const frozen = dragStartTreeRef.current;
        const resolved = args.selectedIds.filter((id) => {
          const row = frozen.items.get(id);
          return row?.kind === item.kind && row.parentId === item.parentId;
        });
        if (resolved.length > 1) {
          groupIds = resolved;
        } else if (args.selectedIds.length > 1) {
          toast.message(
            "Gruppen-Verschieben nur für Elemente derselben Ebene.",
            { duration: 2500 },
          );
        }
      }

      const dragIds = groupIds ?? [args.itemId];
      const viewStartFrame = opts.viewStartFrameRef.current ?? 0;
      const pxPerFrame = opts.pxPerFrameRef.current ?? 1;
      const startLeftById = new Map<string, number>();
      for (const id of dragIds) {
        const row = dragStartTreeRef.current.items.get(id);
        if (!row) continue;
        startLeftById.set(id, (row.startFrame - viewStartFrame) * pxPerFrame);
      }
      startLeftPxByIdRef.current = startLeftById;

      activeSessionRef.current = {
        itemId: args.itemId,
        kind: args.kind,
        pointerId: args.pointerId,
        startFrame: item.startFrame,
        groupIds,
      };
      latestPreviewResultRef.current = null;
      previewTouchedIdsRef.current = new Set(dragIds);

      const containers = opts.getContainers();
      applyStructureDimOverlays(containers);

      for (const id of dragIds) {
        applyStructureDragFollow({
          containerByKind: containers,
          kind: args.kind,
          id,
          leftPx: startLeftById.get(id) ?? 0,
        });
      }
    },
    [],
  );

  const moveDrag = useCallback(
    (clientX: number) => {
      const session = activeSessionRef.current;
      const frozen = dragStartTreeRef.current;
      if (!session || !frozen) return;

      const opts = optionsRef.current;
      const pxPerFrame = opts.pxPerFrameRef.current ?? 1;
      const pointer = readPointerDelta(session, clientX);
      const { deltaFrames, dropFrame } = pointer;
      lastDeltaFramesRef.current = deltaFrames;

      const dragItem = frozen.items.get(session.itemId);

      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const containers = opts.getContainers();
        const viewStartFrame = opts.viewStartFrameRef.current ?? 0;
        const extraStacks = opts.getExtraDropZoneStacks?.() ?? [];

        const groupIds = session.groupIds;
        const isGroup = Boolean(groupIds && groupIds.length > 1);
        const slot = isGroup
          ? getStructureGroupMoveInsertionSlot({
              tree: frozen,
              selectedIds: groupIds!,
              anchorItemId: session.itemId,
              deltaFrames,
            })
          : getStructureMoveInsertionSlot({
              tree: frozen,
              itemId: session.itemId,
              deltaFrames,
              dropFrame,
            });
        if (slot && slot.wouldChange) {
          applyStructureDropZoneAcrossLanes({
            containerByKind: containers,
            startFrame: slot.startFrame,
            endFrame: slot.endFrame,
            viewStartFrame,
            pxPerFrame,
            extraDropZoneStacks: extraStacks,
          });
        } else {
          clearStructureDropZonesForLanes(containers, extraStacks);
        }

        if (dragItem) {
          const laneStart =
            frozen.childrenOf.get(dragItem.parentId)?.[0]?.startFrame ?? 0;
          const minLeftPx = (laneStart - viewStartFrame) * pxPerFrame;
          const deltaPx = clientX - startXRef.current;
          const dragIds = isGroup ? groupIds! : [session.itemId];

          for (const id of dragIds) {
            const baseLeft = startLeftPxByIdRef.current.get(id) ?? 0;
            applyStructureDragFollow({
              containerByKind: containers,
              kind: session.kind,
              id,
              leftPx: Math.max(minLeftPx, baseLeft + deltaPx),
            });
          }
        }
      });
    },
    [readPointerDelta],
  );

  const cancelMove = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    resetStructurePreviewStyles(
      optionsRef.current.getContainers(),
      previewTouchedIdsRef.current,
    );
    clearExtraDropZoneStacks();
    activeSessionRef.current = null;
    dragStartTreeRef.current = null;
    lastDeltaFramesRef.current = null;
    latestPreviewResultRef.current = null;
    startLeftPxByIdRef.current = new Map();
    previewTouchedIdsRef.current = new Set();
    finishMoveSession();
  }, [clearExtraDropZoneStacks, finishMoveSession]);

  const endMove = useCallback(
    async (clientX: number) => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const session = activeSessionRef.current;
      const frozen = dragStartTreeRef.current;
      activeSessionRef.current = null;
      dragStartTreeRef.current = null;

      if (!session || !frozen) {
        resetStructurePreviewStyles(
          optionsRef.current.getContainers(),
          previewTouchedIdsRef.current,
        );
        clearExtraDropZoneStacks();
        previewTouchedIdsRef.current = new Set();
        finishMoveSession();
        return;
      }

      const pointer = readPointerDelta(session, clientX);
      const dragItem = frozen.items.get(session.itemId);
      const groupIds = session.groupIds;
      const isGroup = Boolean(groupIds && groupIds.length > 1);
      const { deltaFrames, dropFrame } = dragItem
        ? resolveStructureMoveCommitDelta({
            tree: frozen,
            itemId: session.itemId,
            startFrame: session.startFrame,
            durationFrames: dragItem.durationFrames,
            deltaFrames: pointer.deltaFrames,
            dropFrame: pointer.dropFrame,
            snapThresholdFrames: snapThreshold,
          })
        : pointer;

      const result = isGroup
        ? moveStructureItemGroup({
            tree: frozen,
            selectedIds: groupIds!,
            anchorItemId: session.itemId,
            deltaFrames,
            minItemDurationFrames: minDur,
            beforeTree: frozen,
          })
        : resolveStructureMoveOperation({
            tree: frozen,
            beforeTree: frozen,
            itemId: session.itemId,
            deltaFrames,
            dropFrame,
            minItemDurationFrames: minDur,
          });

      if (import.meta.env.DEV) {
        console.debug("[vet-move] endMove", {
          itemId: session.itemId,
          kind: session.kind,
          clientX,
          startX: startXRef.current,
          pxPerFrame: optionsRef.current.pxPerFrameRef.current ?? 1,
          deltaFrames,
          dropFrame,
          blocked: result.blocked,
          blockReason: result.blockReason,
          changed: result.changedIds.size,
        });
      }

      if (result.blocked || result.changedIds.size === 0) {
        resetStructurePreviewStyles(
          optionsRef.current.getContainers(),
          previewTouchedIdsRef.current,
        );
        clearExtraDropZoneStacks();
        latestPreviewResultRef.current = null;
        previewTouchedIdsRef.current = new Set();
        finishMoveSession();
        if (result.blocked) {
          if (
            result.blockReason === "locked" ||
            result.blockReason === "locked_ripple"
          ) {
            toast.error(
              "Verschieben blockiert — gesperrtes Element im Ripple-Pfad.",
            );
          } else if (result.blockReason === "would_violate_invariant") {
            const codes = (result.invariantErrors ?? [])
              .map((e) => e.code)
              .join(", ");
            toast.error(
              codes
                ? `Verschieben nicht möglich — ${codes}`
                : "Verschieben nicht möglich — würde Timeline-Regeln verletzen.",
            );
          } else {
            toast.error("Verschieben blockiert.");
          }
        } else if (Math.abs(deltaFrames) > 0) {
          const item = frozen.items.get(session.itemId);
          const hasSiblings = item
            ? getSortedSiblings(frozen, item.parentId).length > 1
            : false;
          if (hasSiblings) {
            toast.message(
              "Keine neue Position — ziehe weiter, bis der weiße Einfüge-Slot erscheint.",
              { duration: 2500 },
            );
          }
        }
        return;
      }

      const patches = diffTreeToPatches(result.before, result.next);

      try {
        await optionsRef.current.onCommit({
          before: result.before,
          next: result.next,
          patches,
        });
        resetStructurePreviewStyles(
          optionsRef.current.getContainers(),
          result.changedIds,
        );
        clearExtraDropZoneStacks();
      } catch (err) {
        console.error("structure move persist failed", err);
        toast.error("Struktur-Verschieben konnte nicht gespeichert werden.");
        optionsRef.current.onRevert(result.before);
        resetStructurePreviewStyles(
          optionsRef.current.getContainers(),
          previewTouchedIdsRef.current,
        );
        clearExtraDropZoneStacks();
      }

      lastDeltaFramesRef.current = null;
      latestPreviewResultRef.current = null;
      startLeftPxByIdRef.current = new Map();
      previewTouchedIdsRef.current = new Set();
      finishMoveSession();
    },
    [
      minDur,
      finishMoveSession,
      readPointerDelta,
      snapThreshold,
      clearExtraDropZoneStacks,
    ],
  );

  const isActive = useCallback(() => activeSessionRef.current !== null, []);

  return {
    startMove,
    moveDrag,
    endMove,
    cancelMove,
    isActive,
    activeSessionRef,
  };
}
