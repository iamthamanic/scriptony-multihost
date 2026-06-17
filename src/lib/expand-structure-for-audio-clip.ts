/**
 * Expand structure pct metadata when an audio clip exceeds scene/shot bounds.
 * Location: src/lib/expand-structure-for-audio-clip.ts
 */

import type { TimelineData } from "@/components/structure/DropdownView";
import {
  expandStructurePctToFitClip,
  expandStructurePctToFitGlobalNeed,
} from "./timeline-container-expand";
import type { PctRange } from "./timeline-parent-expand-only";
import type { StructureTimeBlock } from "./scene-audio-lane-link";

export interface StructureBlocksForExpand {
  actBlock?: { id: string; startSec: number; endSec: number };
  sequenceBlock?: { id: string; startSec: number; endSec: number };
  sceneBlock: { id: string; startSec: number; endSec: number };
}

export interface ExpandStructureForAudioClipInput {
  timelineData: TimelineData;
  clip: { startSec: number; endSec: number; sceneId: string };
  blocks: StructureBlocksForExpand;
  totalDurSec: number;
}

export interface ExpandStructureForAudioClipResult {
  timelineData: TimelineData;
  expansion: {
    act?: PctRange;
    sequence?: PctRange;
    scene?: PctRange;
  };
  actId?: string;
  sequenceId?: string;
  sceneId: string;
}

export function expandTimelineDataForAudioClip(
  input: ExpandStructureForAudioClipInput,
): ExpandStructureForAudioClipResult | null {
  const { timelineData, clip, blocks, totalDurSec } = input;
  const { actBlock, sequenceBlock, sceneBlock } = blocks;
  if (!sequenceBlock || !actBlock) return null;

  const expansion = expandStructurePctToFitClip({
    clip,
    actBlock,
    sequenceBlock,
    sceneBlock,
    totalDur: totalDurSec,
  });

  if (!expansion.act && !expansion.sequence && !expansion.scene) {
    return null;
  }

  const scene = timelineData.scenes?.find((s) => s.id === clip.sceneId);
  const seq = scene
    ? timelineData.sequences?.find((s) => s.id === scene.sequenceId)
    : undefined;
  const act = seq
    ? timelineData.acts?.find((a) => a.id === seq.actId)
    : undefined;

  const nextData: TimelineData = {
    ...timelineData,
    acts: timelineData.acts.map((a) => {
      if (!expansion.act || !act || a.id !== act.id) return a;
      return {
        ...a,
        metadata: {
          ...(a.metadata || {}),
          pct_from: expansion.act.pct_from,
          pct_to: expansion.act.pct_to,
        },
      };
    }),
    sequences: timelineData.sequences.map((s) => {
      if (!expansion.sequence || !seq || s.id !== seq.id) return s;
      return {
        ...s,
        metadata: {
          ...(s.metadata || {}),
          pct_from: expansion.sequence.pct_from,
          pct_to: expansion.sequence.pct_to,
        },
      };
    }),
    scenes: timelineData.scenes.map((s) => {
      if (!expansion.scene || !scene || s.id !== scene.id) return s;
      return {
        ...s,
        metadata: {
          ...(s.metadata || {}),
          pct_from: expansion.scene.pct_from,
          pct_to: expansion.scene.pct_to,
        },
      };
    }),
  };

  return {
    timelineData: nextData,
    expansion,
    actId: act?.id,
    sequenceId: seq?.id,
    sceneId: clip.sceneId,
  };
}

/** Expand when linked scene/shot block is shorter than the committed audio clip. */
export function expandTimelineDataForLinkedNodeClip(
  input: ExpandStructureForAudioClipInput & {
    linkedBlock: StructureTimeBlock;
  },
): ExpandStructureForAudioClipResult | null {
  const { clip, linkedBlock, blocks, totalDurSec, timelineData } = input;
  const { actBlock, sequenceBlock, sceneBlock } = blocks;
  if (!sequenceBlock || !actBlock) return null;

  const fitsLinked =
    clip.startSec >= linkedBlock.startSec - 1e-4 &&
    clip.endSec <= linkedBlock.endSec + 1e-4;
  if (fitsLinked) return null;

  const expansion = expandStructurePctToFitGlobalNeed({
    needStartSec: Math.min(clip.startSec, linkedBlock.startSec),
    needEndSec: Math.max(clip.endSec, linkedBlock.endSec),
    actBlock,
    sequenceBlock,
    sceneBlock,
    totalDur: totalDurSec,
  });

  if (!expansion.act && !expansion.sequence && !expansion.scene) {
    return null;
  }

  const scene = timelineData.scenes?.find((s) => s.id === clip.sceneId);
  const seq = scene
    ? timelineData.sequences?.find((s) => s.id === scene.sequenceId)
    : undefined;
  const act = seq
    ? timelineData.acts?.find((a) => a.id === seq.actId)
    : undefined;

  const nextData: TimelineData = {
    ...timelineData,
    acts: timelineData.acts.map((a) => {
      if (!expansion.act || !act || a.id !== act.id) return a;
      return {
        ...a,
        metadata: {
          ...(a.metadata || {}),
          pct_from: expansion.act.pct_from,
          pct_to: expansion.act.pct_to,
        },
      };
    }),
    sequences: timelineData.sequences.map((s) => {
      if (!expansion.sequence || !seq || s.id !== seq.id) return s;
      return {
        ...s,
        metadata: {
          ...(s.metadata || {}),
          pct_from: expansion.sequence.pct_from,
          pct_to: expansion.sequence.pct_to,
        },
      };
    }),
    scenes: timelineData.scenes.map((s) => {
      if (!expansion.scene || !scene || s.id !== scene.id) return s;
      return {
        ...s,
        metadata: {
          ...(s.metadata || {}),
          pct_from: expansion.scene.pct_from,
          pct_to: expansion.scene.pct_to,
        },
      };
    }),
  };

  return {
    timelineData: nextData,
    expansion,
    actId: act?.id,
    sequenceId: seq?.id,
    sceneId: clip.sceneId,
  };
}
