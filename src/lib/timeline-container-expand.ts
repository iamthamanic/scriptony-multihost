/**
 * Expand structure `metadata.pct_*` so content global bounds fit inside scene → sequence → act.
 * Expand-only: parents never shrink when a child shrinks; ripple handles sibling push (trim-parent-sync).
 *
 * Duration policy: all expansion clamps to [0, totalDurSeconds] (project timeline length).
 */

export type { PctRange } from "./timeline-parent-expand-only";
import type { PctRange } from "./timeline-parent-expand-only";
import {
  expandOnlyStructurePctToFitGlobalNeed,
  expandOnlyActSequencePctToFitGlobalNeed,
  expandOnlyActPctToFitGlobalNeed,
} from "./timeline-parent-expand-only";

/**
 * Expand scene/sequence/act pct so global [needStartSec, needEndSec] fits (expand-only).
 */
export function expandStructurePctToFitGlobalNeed(args: {
  needStartSec: number;
  needEndSec: number;
  actBlock: { id: string; startSec: number; endSec: number };
  sequenceBlock: { id: string; startSec: number; endSec: number };
  sceneBlock: { id: string; startSec: number; endSec: number };
  totalDur: number;
}): { act?: PctRange; sequence?: PctRange; scene?: PctRange } {
  const r = expandOnlyStructurePctToFitGlobalNeed({
    needStartSec: args.needStartSec,
    needEndSec: args.needEndSec,
    actBlock: args.actBlock,
    sequenceBlock: args.sequenceBlock,
    sceneBlock: args.sceneBlock,
    totalDur: args.totalDur,
  });
  return {
    act: r.act,
    sequence: r.sequence,
    scene: r.scene,
  };
}

/**
 * NLE clip: expand when clip extends outside scene block.
 */
export function expandStructurePctToFitClip(args: {
  clip: { startSec: number; endSec: number; sceneId: string };
  actBlock: { id: string; startSec: number; endSec: number };
  sequenceBlock: { id: string; startSec: number; endSec: number };
  sceneBlock: { id: string; startSec: number; endSec: number };
  totalDur: number;
}): { act?: PctRange; sequence?: PctRange; scene?: PctRange } {
  const { clip, actBlock, sequenceBlock, sceneBlock, totalDur } = args;
  if (clip.sceneId !== sceneBlock.id) return {};

  if (
    clip.startSec >= sceneBlock.startSec &&
    clip.endSec <= sceneBlock.endSec
  ) {
    return {};
  }

  return expandStructurePctToFitGlobalNeed({
    needStartSec: clip.startSec,
    needEndSec: clip.endSec,
    actBlock,
    sequenceBlock,
    sceneBlock,
    totalDur,
  });
}

/** Sequence-level: expand-only fit for sequence and act shells. */
export function expandActSequencePctToFitGlobalNeed(args: {
  needStartSec: number;
  needEndSec: number;
  actBlock: { id: string; startSec: number; endSec: number };
  sequenceBlock: { id: string; startSec: number; endSec: number };
  totalDur: number;
}): { act?: PctRange; sequence?: PctRange } {
  const r = expandOnlyActSequencePctToFitGlobalNeed(args);
  return { act: r.act, sequence: r.sequence };
}

/** Act only: expand-only when children need more global span than current act shell. */
export function expandActPctToFitGlobalNeed(args: {
  needStartSec: number;
  needEndSec: number;
  actBlock: { id: string; startSec: number; endSec: number };
  totalDur: number;
}): { act?: PctRange } {
  const r = expandOnlyActPctToFitGlobalNeed(args);
  return { act: r.act };
}
