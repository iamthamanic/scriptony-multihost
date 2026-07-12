/**
 * VETILALORAPP — persist structure patches (topological order).
 * Location: src/lib/ripple-engine/persist.ts
 */

import type { TreePatch } from "../timeline-tree/diff";
import { isPersistedTimelineNodeId } from "../timeline-node-ids";
import * as TimelineAPI from "../api/timeline-api";
import { updateShot } from "../api-adapter/shots-adapter";

export interface PersistRipplePatchesInput {
  patches: TreePatch[];
  token: string;
}

export interface PersistRipplePatchesResult {
  ok: boolean;
  failed: string[];
}

export async function persistRipplePatches(
  input: PersistRipplePatchesInput,
): Promise<PersistRipplePatchesResult> {
  const failed: string[] = [];

  for (const patch of input.patches) {
    if (!isPersistedTimelineNodeId(patch.id)) continue;

    try {
      if (patch.kind === "act") {
        await TimelineAPI.updateAct(
          patch.id,
          {
            orderIndex: patch.orderIndex,
            metadata: {
              pct_from: patch.pct_from,
              pct_to: patch.pct_to,
            },
          },
          input.token,
        );
      } else if (patch.kind === "sequence") {
        await TimelineAPI.updateSequence(
          patch.id,
          {
            orderIndex: patch.orderIndex,
            actId: patch.parentId ?? undefined,
            metadata: {
              pct_from: patch.pct_from,
              pct_to: patch.pct_to,
            },
          },
          input.token,
        );
      } else if (patch.kind === "scene") {
        await TimelineAPI.updateScene(
          patch.id,
          {
            orderIndex: patch.orderIndex,
            sequenceId: patch.parentId ?? undefined,
            metadata: {
              pct_from: patch.pct_from,
              pct_to: patch.pct_to,
            },
          },
          input.token,
        );
      } else if (patch.kind === "shot") {
        const total = Math.max(1, Math.round(patch.durationSec));
        const minutes = Math.floor(total / 60);
        const seconds = total % 60;
        await updateShot(
          patch.id,
          {
            shotlengthMinutes: minutes,
            shotlengthSeconds: seconds,
            duration: `${total}s`,
          },
          input.token,
        );
      }
    } catch (err) {
      console.error(
        `persistRipplePatches failed for ${patch.kind}:${patch.id}`,
        err,
      );
      failed.push(patch.id);
    }
  }

  return { ok: failed.length === 0, failed };
}
