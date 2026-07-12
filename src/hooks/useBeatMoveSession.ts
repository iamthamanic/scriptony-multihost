/**
 * Beat-lane body move session — flat reorder with DOM preview (no React on move).
 * Location: src/hooks/useBeatMoveSession.ts
 */

import { useCallback, useRef } from "react";
import type { Beat } from "../components/timeline-helpers";
import {
  applyBeatDimOverlay,
  applyBeatDragFollow,
  applyBeatDropZone,
  resetBeatMovePreviewStyles,
} from "../lib/beats/beat-move-preview";
import {
  commitBeatReorder,
  commitBeatGroupReorder,
  getBeatMoveInsertionSlot,
  getBeatGroupMoveInsertionSlot,
} from "../lib/beats/beat-move";

export interface UseBeatMoveSessionOptions {
  getContainer: () => HTMLElement | null;
  durationSecRef: React.RefObject<number>;
  pxPerSecRef: React.RefObject<number>;
  viewStartSecRef: React.RefObject<number>;
  onCommit: (result: {
    beats: Beat[];
    durationScale: number;
    snapshot: Beat[];
  }) => void | Promise<void>;
  onMoveSessionEnd?: () => void;
}

export function useBeatMoveSession(options: UseBeatMoveSessionOptions) {
  const snapshotRef = useRef<Beat[]>([]);
  const beatIdRef = useRef<string | null>(null);
  const groupIdsRef = useRef<string[]>([]);
  const startXRef = useRef(0);
  const startLeftPxRef = useRef(0);
  const startLeftPxByIdRef = useRef<Map<string, number>>(new Map());
  const activeRef = useRef(false);
  const previewTouchedIdsRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const finish = useCallback(() => {
    optionsRef.current.onMoveSessionEnd?.();
  }, []);

  const startMove = useCallback(
    (args: {
      beatId: string;
      clientX: number;
      snapshot: Beat[];
      selectedIds?: string[];
    }) => {
      const container = optionsRef.current.getContainer();
      if (!container) return;

      const sorted = [...args.snapshot].sort((a, b) => a.pct_from - b.pct_from);
      const beat = sorted.find((b) => b.id === args.beatId);
      if (!beat) return;

      const durationSec = Math.max(
        1e-6,
        optionsRef.current.durationSecRef.current,
      );
      const pxPerSec = optionsRef.current.pxPerSecRef.current ?? 1;
      const viewStartSec = optionsRef.current.viewStartSecRef.current ?? 0;

      const groupIds =
        args.selectedIds &&
        args.selectedIds.length > 1 &&
        args.selectedIds.includes(args.beatId)
          ? sorted
              .filter((b) => args.selectedIds!.includes(b.id))
              .map((b) => b.id)
          : [args.beatId];

      const startLeftById = new Map<string, number>();
      for (const id of groupIds) {
        const row = sorted.find((b) => b.id === id);
        if (!row) continue;
        const startSec = (row.pct_from / 100) * durationSec;
        startLeftById.set(id, (startSec - viewStartSec) * pxPerSec);
      }

      snapshotRef.current = sorted.map((b) => ({ ...b }));
      beatIdRef.current = args.beatId;
      groupIdsRef.current = groupIds;
      startXRef.current = args.clientX;
      startLeftPxRef.current = startLeftById.get(args.beatId) ?? 0;
      startLeftPxByIdRef.current = startLeftById;
      activeRef.current = true;
      previewTouchedIdsRef.current = new Set(groupIds);

      applyBeatDimOverlay(container);
      for (const id of groupIds) {
        applyBeatDragFollow(container, id, startLeftById.get(id) ?? 0);
      }
    },
    [],
  );

  const moveDrag = useCallback((clientX: number) => {
    if (!activeRef.current || !beatIdRef.current) return;

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const opts = optionsRef.current;
      const container = opts.getContainer();
      const beatId = beatIdRef.current;
      if (!container || !beatId) return;

      const durationSec = Math.max(1e-6, opts.durationSecRef.current);
      const pxPerSec = opts.pxPerSecRef.current ?? 1;
      const viewStartSec = opts.viewStartSecRef.current ?? 0;
      const deltaSec = (clientX - startXRef.current) / pxPerSec;
      const deltaPx = clientX - startXRef.current;

      for (const id of groupIdsRef.current) {
        const baseLeft = startLeftPxByIdRef.current.get(id) ?? 0;
        applyBeatDragFollow(container, id, baseLeft + deltaPx);
      }

      const isGroup = groupIdsRef.current.length > 1;
      const slot = isGroup
        ? getBeatGroupMoveInsertionSlot({
            snapshot: snapshotRef.current,
            selectedIds: groupIdsRef.current,
            anchorBeatId: beatId,
            deltaSec,
            durationSec,
          })
        : getBeatMoveInsertionSlot({
            snapshot: snapshotRef.current,
            beatId,
            deltaSec,
            durationSec,
          });

      if (slot?.wouldChange) {
        applyBeatDropZone({
          container,
          boundarySec: slot.boundarySec,
          durationSec,
          viewStartSec,
          pxPerSec,
        });
      } else {
        container
          .querySelectorAll<HTMLElement>("[data-beat-drop-zone]")
          .forEach((el) => el.remove());
      }
    });
  }, []);

  const cancelMove = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    resetBeatMovePreviewStyles(
      optionsRef.current.getContainer(),
      previewTouchedIdsRef.current,
    );
    activeRef.current = false;
    beatIdRef.current = null;
    groupIdsRef.current = [];
    snapshotRef.current = [];
    startLeftPxByIdRef.current = new Map();
    previewTouchedIdsRef.current = new Set();
    finish();
  }, [finish]);

  const endMove = useCallback(
    async (clientX: number) => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const beatId = beatIdRef.current;
      const snapshot = snapshotRef.current;
      const groupIds = groupIdsRef.current;
      const container = optionsRef.current.getContainer();
      const touchedIds = previewTouchedIdsRef.current;
      activeRef.current = false;
      beatIdRef.current = null;
      groupIdsRef.current = [];
      snapshotRef.current = [];
      startLeftPxByIdRef.current = new Map();

      if (!beatId || snapshot.length === 0) {
        resetBeatMovePreviewStyles(container, touchedIds);
        previewTouchedIdsRef.current = new Set();
        finish();
        return;
      }

      const durationSec = Math.max(
        1e-6,
        optionsRef.current.durationSecRef.current,
      );
      const pxPerSec = optionsRef.current.pxPerSecRef.current ?? 1;
      const deltaSec = (clientX - startXRef.current) / pxPerSec;
      const isGroup = groupIds.length > 1;
      const slot = isGroup
        ? getBeatGroupMoveInsertionSlot({
            snapshot,
            selectedIds: groupIds,
            anchorBeatId: beatId,
            deltaSec,
            durationSec,
          })
        : getBeatMoveInsertionSlot({
            snapshot,
            beatId,
            deltaSec,
            durationSec,
          });

      if (!slot?.wouldChange) {
        resetBeatMovePreviewStyles(container, touchedIds);
        previewTouchedIdsRef.current = new Set();
        finish();
        return;
      }

      const result = isGroup
        ? commitBeatGroupReorder(snapshot, groupIds, slot.insertIndex)
        : commitBeatReorder(snapshot, beatId, slot.insertIndex);
      const changedIds = new Set<string>([beatId]);
      for (const b of result.beats) {
        const snap = snapshot.find((s) => s.id === b.id);
        if (
          snap &&
          (b.pct_from !== snap.pct_from || b.pct_to !== snap.pct_to)
        ) {
          changedIds.add(b.id);
        }
      }

      try {
        await optionsRef.current.onCommit({
          beats: result.beats,
          durationScale: result.durationScale,
          snapshot,
        });
        resetBeatMovePreviewStyles(container, changedIds);
      } catch {
        resetBeatMovePreviewStyles(container, touchedIds);
      }

      previewTouchedIdsRef.current = new Set();
      finish();
    },
    [finish],
  );

  return {
    startMove,
    moveDrag,
    endMove,
    cancelMove,
    isActive: () => activeRef.current,
  };
}
