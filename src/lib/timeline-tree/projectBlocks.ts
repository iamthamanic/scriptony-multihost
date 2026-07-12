/**
 * VETILALORAPP — project packed TimelineTree items to timeline row pixels.
 * Location: src/lib/timeline-tree/projectBlocks.ts
 */

import type { ItemKind, TimelineData, TimelineTree } from "./types";
import { frameToSec } from "./types";

export interface StructureBlockLayout {
  id: string;
  kind: ItemKind;
  startSec: number;
  endSec: number;
  x: number;
  width: number;
  visible: boolean;
  title?: string;
  [key: string]: unknown;
}

export interface ProjectStructureBlocksInput {
  tree: TimelineTree;
  timelineData: TimelineData;
  kind: ItemKind;
  viewStartSec: number;
  viewEndSec: number;
  pxPerSec: number;
}

function rowByKind(
  timelineData: TimelineData,
  kind: ItemKind,
  id: string,
): Record<string, unknown> | null {
  const list =
    kind === "act"
      ? timelineData.acts
      : kind === "sequence"
        ? timelineData.sequences
        : kind === "scene"
          ? timelineData.scenes
          : timelineData.shots;
  const row = list?.find((entry) => entry.id === id);
  return row ? ({ ...row } as Record<string, unknown>) : null;
}

/** Map tree frames → viewport pixels; merges display fields from TimelineData. */
export function projectStructureBlocksFromTree(
  input: ProjectStructureBlocksInput,
): StructureBlockLayout[] {
  const { tree, timelineData, kind, viewStartSec, viewEndSec, pxPerSec } =
    input;
  const { frameRate } = tree;
  const blocks: StructureBlockLayout[] = [];

  for (const item of tree.items.values()) {
    if (item.kind !== kind) continue;

    const startSec = frameToSec(item.startFrame, frameRate);
    const endSec = frameToSec(item.endFrame, frameRate);
    const x = (startSec - viewStartSec) * pxPerSec;
    const width = Math.max(0, (endSec - startSec) * pxPerSec);
    const row = rowByKind(timelineData, kind, item.id);

    blocks.push({
      ...(row ?? {}),
      id: item.id,
      kind,
      startSec,
      endSec,
      x,
      width,
      visible:
        kind === "act" || kind === "sequence" || kind === "scene"
          ? true
          : endSec >= viewStartSec && startSec <= viewEndSec,
    });
  }

  blocks.sort((a, b) => a.startSec - b.startSec);
  return blocks;
}

/** Film tree rows: left 0 + translateX so VET DOM preview stays in sync on re-render. */
export function filmStructureClipStyle(
  block: { x: number; width: number },
  useTreeLayout: boolean,
): { left: number | string; width: string; transform?: string } {
  if (!useTreeLayout) {
    return { left: `${block.x}px`, width: `${block.width}px` };
  }
  return {
    left: 0,
    width: `${block.width}px`,
    transform: `translateX(${block.x}px)`,
  };
}
