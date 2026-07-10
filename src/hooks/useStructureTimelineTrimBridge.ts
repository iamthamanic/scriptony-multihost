/**
 * Structure timeline trim bridge — wires ripple trim session into StructureTimelineEditor.
 * Location: src/hooks/useStructureTimelineTrimBridge.ts
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
} from "../lib/timeline-tree/types";
import { getSnapEdgesForStructureOperation } from "../lib/ripple-engine/snap";
import { commitStructureRipple } from "../lib/ripple-engine/commit-structure-ripple";
import { resolveStructureTrimOperation } from "../lib/timeline-tree/structure-trim-operation";
import { USE_HIERARCHICAL_STRUCTURE_RIPPLE } from "../lib/vetilalorapp-feature";
import {
  diagnoseTimelineTree,
  repairTimelineTree,
} from "../lib/timeline-tree/repair";
import { logTimelineTreeDiagnosis } from "../lib/ripple-engine/structure-trim-debug";
import { useStructureTrimSession } from "./useStructureTrimSession";

export interface StructureTimelineTrimBridgeOptions {
  timelineData: TimelineData | null | undefined;
  projectDurationSec: number;
  projectId?: string;
  projectType?: string | null;
  viewStartSecRef: React.RefObject<number>;
  pxPerSecRef: React.RefObject<number>;
  currentTimeSec: number;
  actTrackRef: React.RefObject<HTMLElement | null>;
  sequenceTrackRef: React.RefObject<HTMLElement | null>;
  sceneTrackRef: React.RefObject<HTMLElement | null>;
  shotTrackRef: React.RefObject<HTMLElement | null>;
  getAccessToken: () => Promise<string | null>;
  setTimelineData: React.Dispatch<
    React.SetStateAction<TimelineData | null | undefined>
  >;
  onTrimSessionEnd?: () => void;
  /** Committed tree needs more seconds than projectDurationSec — parent auto-extends project duration. */
  onProjectDurationGrow?: (minSeconds: number) => void;
  onAudioClipsSynced?: () => void;
}

export function useStructureTimelineTrimBridge(
  options: StructureTimelineTrimBridgeOptions,
) {
  const activeRef = useRef(false);
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
    const repair = repairTimelineTree(built, {
      minItemDurationFrames: DEFAULT_MIN_ITEM_DURATION_FRAMES,
    });
    if (repair.errorsAfter.length > 0) {
      logTimelineTreeDiagnosis(
        "still invalid after repair",
        repair.errorsAfter,
      );
    }
    return built;
  }, [options.timelineData, options.projectDurationSec]);

  useEffect(() => {
    if (typeof window === "undefined" || !tree) return;
    (
      window as Window & {
        __scriptonyDiagnoseStructureTree?: () => ReturnType<
          typeof diagnoseTimelineTree
        >;
      }
    ).__scriptonyDiagnoseStructureTree = () => {
      const errors = diagnoseTimelineTree(
        tree,
        DEFAULT_MIN_ITEM_DURATION_FRAMES,
      );
      logTimelineTreeDiagnosis("manual diagnose", errors);
      return errors;
    };
    return () => {
      delete (
        window as Window & {
          __scriptonyDiagnoseStructureTree?: () => unknown;
        }
      ).__scriptonyDiagnoseStructureTree;
    };
  }, [tree]);

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

  const trimSession = useStructureTrimSession({
    tree: tree ?? {
      items: new Map(),
      childrenOf: new Map(),
      projectDurationFrames: 1,
      frameRate: DEFAULT_FRAME_RATE,
    },
    minItemDurationFrames: DEFAULT_MIN_ITEM_DURATION_FRAMES,
    snapThresholdFrames: DEFAULT_SNAP_THRESHOLD_FRAMES,
    pxPerFrameRef,
    viewStartFrameRef,
    getSnapEdges: (input) =>
      getSnapEdgesForStructureOperation({
        tree: input.tree,
        itemId: input.itemId,
        kind: input.kind,
        side: input.side,
        playheadFrame: secToFrame(options.currentTimeSec, input.tree.frameRate),
        includeFrameGrid: true,
      }),
    getContainers: () => ({
      act: options.actTrackRef.current,
      sequence: options.sequenceTrackRef.current,
      scene: options.sceneTrackRef.current,
      shot: options.shotTrackRef.current,
    }),
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
        onProjectDurationGrow: options.onProjectDurationGrow,
      });
    },
    onTrimSessionEnd: options.onTrimSessionEnd,
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
      handle: "left" | "right",
      e: React.PointerEvent,
    ): boolean => {
      if (!tree) return false;

      activeRef.current = true;
      syncViewportRefs();
      if (import.meta.env.DEV) {
        const item = tree.items.get(id);
        console.debug("[vet-trim] start", {
          id,
          kind,
          handle,
          pxPerFrame: pxPerFrameRef.current,
          pxPerSec: options.pxPerSecRef.current,
          itemFrames: item
            ? { start: item.startFrame, end: item.endFrame }
            : null,
          projectFrames: tree.projectDurationFrames,
        });
      }
      trimSession.startTrim({
        itemId: id,
        kind,
        side: handle,
        operation: resolveStructureTrimOperation(kind),
        clientX: e.clientX,
        pointerId: e.pointerId,
      });
      return true;
    },
    [tree, trimSession, syncViewportRefs],
  );

  const handleMove = useCallback(
    (e: PointerEvent): boolean => {
      if (!activeRef.current) return false;
      syncViewportRefs();
      trimSession.moveTrim(e.clientX);
      return true;
    },
    [trimSession, syncViewportRefs],
  );

  const handleEnd = useCallback(
    async (clientX?: number): Promise<boolean> => {
      if (!activeRef.current) return false;
      activeRef.current = false;
      await trimSession.endTrim(clientX);
      return true;
    },
    [trimSession],
  );

  const handleCancel = useCallback((): boolean => {
    if (!activeRef.current) return false;
    activeRef.current = false;
    trimSession.cancelTrim();
    return true;
  }, [trimSession]);

  const syncViewportAndReapplyPreview = useCallback(() => {
    if (!activeRef.current) return;
    syncViewportRefs();
    trimSession.reapplyPreview();
  }, [syncViewportRefs, trimSession]);

  return {
    enabled: USE_HIERARCHICAL_STRUCTURE_RIPPLE,
    tryPointerDown,
    handleMove,
    handleEnd,
    handleCancel,
    syncViewportAndReapplyPreview,
    isActive: () => activeRef.current,
    tree,
  };
}
