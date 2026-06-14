/**
 * VETILALORAPP — diff trees to API patches (topological order).
 * Location: src/lib/timeline-tree/diff.ts
 */

import type { ItemKind, TimelineTree } from "./types";
import { frameToSec } from "./types";
import { diffChangedIds } from "./tree-utils";

export interface TreePatch {
  id: string;
  kind: ItemKind;
  parentId: string | null;
  orderIndex: number;
  startFrame: number;
  endFrame: number;
  durationFrames: number;
  startSec: number;
  endSec: number;
  durationSec: number;
  pct_from?: number;
  pct_to?: number;
}

const KIND_ORDER: Record<ItemKind, number> = {
  act: 0,
  sequence: 1,
  scene: 2,
  shot: 3,
};

export function diffTreeToPatches(
  before: TimelineTree,
  next: TimelineTree,
): TreePatch[] {
  const changed = diffChangedIds(before, next);
  const patches: TreePatch[] = [];
  const { frameRate } = next;
  const projectSec = frameToSec(next.projectDurationFrames, frameRate);

  for (const id of changed) {
    const item = next.items.get(id);
    if (!item) continue;
    const startSec = frameToSec(item.startFrame, frameRate);
    const endSec = frameToSec(item.endFrame, frameRate);
    const durationSec = frameToSec(item.durationFrames, frameRate);

    let pct_from: number | undefined;
    let pct_to: number | undefined;

    if (item.kind === "act") {
      pct_from = (startSec / projectSec) * 100;
      pct_to = (endSec / projectSec) * 100;
    } else if (item.parentId) {
      const parent = next.items.get(item.parentId);
      if (parent) {
        const pStart = frameToSec(parent.startFrame, frameRate);
        const pDur = frameToSec(parent.durationFrames, frameRate);
        if (pDur > 1e-9) {
          pct_from = ((startSec - pStart) / pDur) * 100;
          pct_to = ((endSec - pStart) / pDur) * 100;
        }
      }
    }

    patches.push({
      id: item.id,
      kind: item.kind,
      parentId: item.parentId,
      orderIndex: item.orderIndex,
      startFrame: item.startFrame,
      endFrame: item.endFrame,
      durationFrames: item.durationFrames,
      startSec,
      endSec,
      durationSec,
      pct_from,
      pct_to,
    });
  }

  return patches.sort((a, b) => {
    const oa = KIND_ORDER[a.kind];
    const ob = KIND_ORDER[b.kind];
    if (oa !== ob) return oa - ob;
    return a.id.localeCompare(b.id);
  });
}
