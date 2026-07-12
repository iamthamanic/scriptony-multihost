/**
 * VETILALORAPP — normalize film layout metadata via TimelineTree on load.
 * Location: src/lib/timeline-tree/layout-repair.ts
 */

import { persistRipplePatches } from "../ripple-engine/persist";
import { buildTimelineTree, treeToTimelineData } from "./buildTree";
import { diffTreeToPatches } from "./diff";
import { metadataPctChanged, type IdentifiedPctRow } from "./pack";
import type { TimelineData } from "./types";

function rowsMetadataDiffers(
  beforeRows: IdentifiedPctRow[] | undefined,
  afterRows: IdentifiedPctRow[] | undefined,
): boolean {
  const afterById = new Map((afterRows ?? []).map((row) => [row.id, row]));
  for (const before of beforeRows ?? []) {
    const after = afterById.get(before.id);
    if (!after || metadataPctChanged(before, after)) return true;
  }
  return false;
}

/** buildTree → treeToTimelineData — canonical packed pct for acts/sequences/scenes. */
export function repairFilmTimelineLayout(
  data: TimelineData,
  durationSec: number,
): TimelineData {
  const tree = buildTimelineTree({
    timelineData: data,
    projectDurationSec: Math.max(1e-6, durationSec),
  });
  return treeToTimelineData(tree, data);
}

export function filmLayoutMetadataDiffers(
  before: TimelineData,
  after: TimelineData,
): boolean {
  return (
    rowsMetadataDiffers(
      before.acts as IdentifiedPctRow[] | undefined,
      after.acts as IdentifiedPctRow[] | undefined,
    ) ||
    rowsMetadataDiffers(
      before.sequences as IdentifiedPctRow[] | undefined,
      after.sequences as IdentifiedPctRow[] | undefined,
    ) ||
    rowsMetadataDiffers(
      before.scenes as IdentifiedPctRow[] | undefined,
      after.scenes as IdentifiedPctRow[] | undefined,
    )
  );
}

export function filmTimelineNeedsLayoutRepair(
  data: TimelineData,
  durationSec: number,
): boolean {
  const repaired = repairFilmTimelineLayout(data, durationSec);
  return filmLayoutMetadataDiffers(data, repaired);
}

export async function persistFilmLayoutRepair(
  before: TimelineData,
  after: TimelineData,
  durationSec: number,
  token: string,
): Promise<{ ok: boolean; failed: string[] }> {
  const projectDurationSec = Math.max(1e-6, durationSec);
  const treeBefore = buildTimelineTree({
    timelineData: before,
    projectDurationSec,
  });
  const treeAfter = buildTimelineTree({
    timelineData: after,
    projectDurationSec,
  });
  const patches = diffTreeToPatches(treeBefore, treeAfter).filter(
    (patch) => patch.kind !== "shot",
  );
  if (patches.length === 0) return { ok: true, failed: [] };
  return persistRipplePatches({ patches, token });
}
