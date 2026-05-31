/**
 * useRippleDerivation — calculates ripple scenes/sequences/acts from timeline data.
 * Extracted from useProjectClipLanes.ts to respect the 300-line file limit (KISS/SOLID).
 */

import { useMemo } from "react";
import type { AudioClip } from "../lib/types";

export interface RippleScene {
  id: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  orderIndex: number;
  sequenceId: string | null;
}

export interface RippleSequence {
  id: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  orderIndex: number;
  actId: string | null;
}

export interface RippleAct {
  id: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  orderIndex: number;
}

export interface TimelineData {
  scenes: Array<{ id: string; orderIndex?: number; sequenceId?: string | null }>;
  sequences: Array<{ id: string; orderIndex?: number; actId?: string | null }>;
  acts: Array<{ id: string; orderIndex?: number }>;
}

export function useRippleDerivation(
  data: TimelineData | undefined,
  allClips: AudioClip[],
) {
  const rippleScenes = useMemo(() => {
    if (!data) return [];
    return data.scenes.map((scene) => {
      const sceneClips = allClips.filter((c) => c.sceneId === scene.id);
      const startSec =
        sceneClips.length > 0
          ? Math.min(...sceneClips.map((c) => c.startSec))
          : 0;
      const endSec =
        sceneClips.length > 0
          ? Math.max(...sceneClips.map((c) => c.endSec))
          : 0;
      return {
        id: scene.id,
        startSec,
        endSec,
        durationSec: Math.max(endSec - startSec, 0),
        orderIndex: scene.orderIndex ?? 0,
        sequenceId: scene.sequenceId ?? null,
      };
    });
  }, [data, allClips]);

  const rippleSequences = useMemo(() => {
    if (!data) return [];
    return data.sequences.map((seq) => {
      const seqScenes = rippleScenes.filter((s) => s.sequenceId === seq.id);
      const startSec =
        seqScenes.length > 0
          ? Math.min(...seqScenes.map((s) => s.startSec))
          : 0;
      const endSec =
        seqScenes.length > 0 ? Math.max(...seqScenes.map((s) => s.endSec)) : 0;
      return {
        id: seq.id,
        startSec,
        endSec,
        durationSec: Math.max(endSec - startSec, 0),
        orderIndex: seq.orderIndex ?? 0,
        actId: seq.actId ?? null,
      };
    });
  }, [data, rippleScenes]);

  const rippleActs = useMemo(() => {
    if (!data) return [];
    return data.acts.map((act) => {
      const actSeqs = rippleSequences.filter((sq) => sq.actId === act.id);
      const startSec =
        actSeqs.length > 0 ? Math.min(...actSeqs.map((sq) => sq.startSec)) : 0;
      const endSec =
        actSeqs.length > 0 ? Math.max(...actSeqs.map((sq) => sq.endSec)) : 0;
      return {
        id: act.id,
        startSec,
        endSec,
        durationSec: Math.max(endSec - startSec, 0),
        orderIndex: act.orderIndex ?? 0,
      };
    });
  }, [data, rippleSequences]);

  return { rippleScenes, rippleSequences, rippleActs };
}
