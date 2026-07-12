/**
 * Structure timeline move bridge — wires structure body move into StructureTimelineEditor.
 * Location: src/hooks/useStructureTimelineMoveBridge.ts
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { TimelineData } from "../components/structure/DropdownView";
import {
  buildTimelineTree,
  treeToTimelineData,
} from "../lib/timeline-tree/buildTree";
import {
  DEFAULT_FRAME_RATE,
  DEFAULT_MIN_ITEM_DURATION_FRAMES,
  DEFAULT_SNAP_THRESHOLD_FRAMES,
  secToFrame,
  type ItemKind,
  type TimelineTree,
} from "../lib/timeline-tree/types";
import { commitStructureRipple } from "../lib/ripple-engine/commit-structure-ripple";
import { USE_HIERARCHICAL_STRUCTURE_RIPPLE } from "../lib/vetilalorapp-feature";
import { repairTimelineTree } from "../lib/timeline-tree/repair";
import { useStructureMoveSession } from "./useStructureMoveSession";

export interface StructureTimelineMoveBridgeOptions {
  timelineData: TimelineData | null | undefined;
  projectDurationSec: number;
  projectId?: string;
  projectType?: string | null;
  currentTimeSec?: number;
  viewStartSecRef: React.RefObject<number>;
  pxPerSecRef: React.RefObject<number>;
  actTrackRef: React.RefObject<HTMLElement | null>;
  sequenceTrackRef: React.RefObject<HTMLElement | null>;
  sceneTrackRef: React.RefObject<HTMLElement | null>;
  shotTrackRef: React.RefObject<HTMLElement | null>;
  /** Scroll stack wrapping dialog/audio lane rows — white insertion slot during structure move. */
  audioDialogScrollStackRef?: React.RefObject<HTMLDivElement | null>;
  getAccessToken: () => Promise<string | null>;
  setTimelineData: React.Dispatch<
    React.SetStateAction<TimelineData | null | undefined>
  >;
  onMoveSessionEnd?: () => void;
  onAudioClipsSynced?: () => void;
}

const MOVE_KINDS: ItemKind[] = ["act", "sequence", "scene"];

export type StructureMovePointerSeed = {
  clientX: number;
  pointerId: number;
};

const EMPTY_MOVE_TREE: TimelineTree = {
  items: new Map(),
  childrenOf: new Map(),
  projectDurationFrames: 1,
  frameRate: DEFAULT_FRAME_RATE,
};

export function useStructureTimelineMoveBridge(
  options: StructureTimelineMoveBridgeOptions,
) {
  const activeRef = useRef(false);
  const endClientXRef = useRef(0);
  const pxPerFrameRef = useRef(1);
  const viewStartFrameRef = useRef(0);

  const tree = useMemo(() => {
    if (!USE_HIERARCHICAL_STRUCTURE_RIPPLE || !options.timelineData) {
      return null;
    }
    const built = buildTimelineTree({
      timelineData: options.timelineData,
      projectDurationSec: Math.max(1e-6, options.projectDurationSec),
      frameRate: DEFAULT_FRAME_RATE,
    });
    repairTimelineTree(built, {
      minItemDurationFrames: DEFAULT_MIN_ITEM_DURATION_FRAMES,
    });
    return built;
  }, [options.timelineData, options.projectDurationSec]);

  const syncViewportRefs = useCallback(() => {
    const frameRate = tree?.frameRate ?? DEFAULT_FRAME_RATE;
    const pxs = options.pxPerSecRef.current ?? 1;
    const vss = options.viewStartSecRef.current ?? 0;
    pxPerFrameRef.current = Math.max(1e-6, pxs / frameRate);
    viewStartFrameRef.current = secToFrame(vss, frameRate);
  }, [tree?.frameRate, options.pxPerSecRef, options.viewStartSecRef]);

  useEffect(() => {
    syncViewportRefs();
  }, [syncViewportRefs]);

  const moveSession = useStructureMoveSession({
    tree: tree ?? EMPTY_MOVE_TREE,
    minItemDurationFrames: DEFAULT_MIN_ITEM_DURATION_FRAMES,
    snapThresholdFrames: DEFAULT_SNAP_THRESHOLD_FRAMES,
    pxPerFrameRef,
    viewStartFrameRef,
    getContainers: () => ({
      act: options.actTrackRef.current,
      sequence: options.sequenceTrackRef.current,
      scene: options.sceneTrackRef.current,
      shot: options.shotTrackRef.current,
    }),
    getExtraDropZoneStacks: () => {
      const root = options.audioDialogScrollStackRef?.current;
      if (!root) return [];
      return Array.from(
        root.querySelectorAll<HTMLElement>("[data-audio-lane-drop-stack]"),
      );
    },
    onCommit: async ({ before, next, patches }) => {
      const base = options.timelineData;
      if (!base) return;
      await commitStructureRipple({
        before,
        next,
        patches,
        timelineData: base,
        setTimelineData: options.setTimelineData,
        getAccessToken: options.getAccessToken,
        projectDurationSec: options.projectDurationSec,
        projectId: options.projectId,
        projectType: options.projectType,
        onAudioClipsSynced: options.onAudioClipsSynced,
      });
    },
    onMoveSessionEnd: options.onMoveSessionEnd,
    onRevert: (before) => {
      const base = options.timelineData;
      if (base) {
        options.setTimelineData(treeToTimelineData(before, base));
      }
    },
  });

  const tryPointerDown = useCallback(
    (
      kind: ItemKind,
      id: string,
      seed: StructureMovePointerSeed,
      startClientX?: number,
      selectedIds?: string[],
    ): boolean => {
      if (!tree || !MOVE_KINDS.includes(kind)) return false;

      const anchorX = startClientX ?? seed.clientX;
      activeRef.current = true;
      endClientXRef.current = seed.clientX;
      syncViewportRefs();
      if (import.meta.env.DEV) {
        const item = tree.items.get(id);
        console.debug("[vet-move] start", {
          id,
          kind,
          groupSize: selectedIds?.length ?? 1,
          pxPerFrame: pxPerFrameRef.current,
          pxPerSec: options.pxPerSecRef.current,
          itemFrames: item
            ? { start: item.startFrame, end: item.endFrame }
            : null,
        });
      }
      moveSession.startMove({
        itemId: id,
        kind,
        clientX: anchorX,
        pointerId: seed.pointerId,
        selectedIds,
      });
      return true;
    },
    [tree, moveSession, syncViewportRefs],
  );

  const handleMove = useCallback(
    (e: PointerEvent): boolean => {
      if (!activeRef.current) return false;
      endClientXRef.current = e.clientX;
      syncViewportRefs();
      moveSession.moveDrag(e.clientX);
      return true;
    },
    [moveSession, syncViewportRefs],
  );

  const handleEnd = useCallback(
    async (clientX?: number): Promise<boolean> => {
      if (!activeRef.current) return false;
      activeRef.current = false;
      await moveSession.endMove(clientX ?? endClientXRef.current);
      return true;
    },
    [moveSession],
  );

  const handleCancel = useCallback((): boolean => {
    if (!activeRef.current) return false;
    activeRef.current = false;
    moveSession.cancelMove();
    return true;
  }, [moveSession]);

  return {
    enabled: USE_HIERARCHICAL_STRUCTURE_RIPPLE,
    tryPointerDown,
    handleMove,
    handleEnd,
    handleCancel,
    isActive: () => activeRef.current,
    tree,
  };
}
