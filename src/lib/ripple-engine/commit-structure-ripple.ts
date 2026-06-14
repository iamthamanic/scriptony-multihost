/**
 * VETILALORAPP — commit structure trim/move (UI first, optional API persist).
 * Location: src/lib/ripple-engine/commit-structure-ripple.ts
 */

import type { Dispatch, SetStateAction } from "react";
import type { TimelineData } from "../../components/structure/DropdownView";
import { treeToTimelineData } from "../timeline-tree/buildTree";
import type { TreePatch } from "../timeline-tree/diff";
import type { TimelineTree } from "../timeline-tree/types";
import { frameToSec, secToFrame } from "../timeline-tree/types";
import { persistRipplePatches } from "./persist";

export interface CommitStructureRippleInput {
  next: TimelineTree;
  patches: TreePatch[];
  timelineData: TimelineData;
  setTimelineData: Dispatch<SetStateAction<TimelineData | null | undefined>>;
  getAccessToken: () => Promise<string | null>;
  projectDurationSec: number;
  onProjectDurationGrow?: (minSeconds: number) => void;
}

/** Desktop-local: tree → React state first; cloud patches best-effort when token exists. */
export async function commitStructureRipple(
  input: CommitStructureRippleInput,
): Promise<void> {
  const projectFrames = secToFrame(
    Math.max(1e-6, input.projectDurationSec),
    input.next.frameRate,
  );
  // Extend ruler **before** persisting pct — otherwise buildTimelineTree uses the
  // old projectDurationSec and blocks snap back to the previous project end.
  if (
    input.onProjectDurationGrow &&
    input.next.projectDurationFrames > projectFrames
  ) {
    input.onProjectDurationGrow(
      Math.ceil(
        frameToSec(input.next.projectDurationFrames, input.next.frameRate),
      ),
    );
  }

  input.setTimelineData(treeToTimelineData(input.next, input.timelineData));

  if (input.patches.length === 0) return;

  const token = (await input.getAccessToken()) ?? "";
  const result = await persistRipplePatches({ patches: input.patches, token });
  if (!result.ok) {
    throw new Error(`Persist failed: ${result.failed.join(", ")}`);
  }
}
