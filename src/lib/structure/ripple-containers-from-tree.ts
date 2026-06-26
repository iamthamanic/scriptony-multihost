/**
 * Build ripple-engine containers from a packed TimelineTree (T29).
 * Uses structural scene/sequence/act timing — not clip-derived bounds.
 *
 * Location: src/lib/structure/ripple-containers-from-tree.ts
 */

import type {
  RippleAct,
  RippleScene,
  RippleSequence,
} from "../ripple-engine-types";
import type { TimelineTree } from "../timeline-tree/types";
import { frameToSec } from "../timeline-tree/types";

export interface RippleContainersFromTree {
  scenes: RippleScene[];
  sequences: RippleSequence[];
  acts: RippleAct[];
}

export function buildRippleContainersFromTree(
  tree: TimelineTree,
): RippleContainersFromTree {
  const { frameRate } = tree;
  const scenes: RippleScene[] = [];
  const sequences: RippleSequence[] = [];
  const acts: RippleAct[] = [];

  for (const item of tree.items.values()) {
    const startSec = frameToSec(item.startFrame, frameRate);
    const endSec = frameToSec(item.endFrame, frameRate);
    const durationSec = Math.max(endSec - startSec, 0);

    if (item.kind === "scene") {
      scenes.push({
        id: item.id,
        startSec,
        endSec,
        durationSec,
        orderIndex: item.orderIndex,
        sequenceId: item.parentId,
      });
    } else if (item.kind === "sequence") {
      sequences.push({
        id: item.id,
        startSec,
        endSec,
        durationSec,
        orderIndex: item.orderIndex,
        actId: item.parentId,
      });
    } else if (item.kind === "act") {
      acts.push({
        id: item.id,
        startSec,
        endSec,
        durationSec,
        orderIndex: item.orderIndex,
      });
    }
  }

  return { scenes, sequences, acts };
}
