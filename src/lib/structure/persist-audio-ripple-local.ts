/**
 * Local persistence for audio-driven ripple (T29).
 * Applies structure pct patches and clip timing updates in SQLite.
 *
 * Location: src/lib/structure/persist-audio-ripple-local.ts
 */

import type { RippleOutput } from "../ripple-engine-types";
import type { TreePatch } from "../timeline-tree/diff";
import type { AudioClip } from "../types";
import { localUpdateClip } from "../api-adapter/clips-local";
import { requireLocalBackend } from "../api-adapter/runtime-dispatch";

interface StructureSnapshot {
  id: string;
  orderIndex: number;
  metadata: Record<string, unknown>;
}

interface ClipSnapshot {
  id: string;
  startSec: number;
  endSec: number;
}

/** Merge pct patch keys into existing node metadata without dropping other fields. */
export function mergeStructurePatchMetadata(
  existing: Record<string, unknown>,
  patch: Pick<TreePatch, "pct_from" | "pct_to">,
): Record<string, unknown> {
  const merged = { ...existing };
  if (patch.pct_from !== undefined) merged.pct_from = patch.pct_from;
  if (patch.pct_to !== undefined) merged.pct_to = patch.pct_to;
  return merged;
}

async function snapshotStructureNodes(
  patchIds: string[],
): Promise<StructureSnapshot[]> {
  const backend = requireLocalBackend();
  const snapshots: StructureSnapshot[] = [];
  for (const id of patchIds) {
    const node = await backend.structure.getNode(id);
    if (!node) continue;
    snapshots.push({
      id,
      orderIndex: node.orderIndex,
      metadata: { ...(node.metadata ?? {}) },
    });
  }
  return snapshots;
}

async function restoreStructureSnapshots(
  snapshots: StructureSnapshot[],
): Promise<void> {
  const backend = requireLocalBackend();
  const failures: string[] = [];
  for (const snap of snapshots) {
    try {
      await backend.structure.update(snap.id, {
        orderIndex: snap.orderIndex,
        metadata: snap.metadata,
      });
    } catch (err) {
      failures.push(snap.id);
      console.error(
        "[persistAudioRipple] structure rollback failed:",
        snap.id,
        err,
      );
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `Structure rollback failed for ${failures.length} node(s): ${failures.join(", ")}`,
    );
  }
}

async function restoreClipSnapshots(snapshots: ClipSnapshot[]): Promise<void> {
  const failures: string[] = [];
  for (const snap of snapshots) {
    try {
      await localUpdateClip(snap.id, {
        startSec: snap.startSec,
        endSec: snap.endSec,
      });
    } catch (err) {
      failures.push(snap.id);
      console.error("[persistAudioRipple] clip rollback failed:", snap.id, err);
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `Clip rollback failed for ${failures.length} clip(s): ${failures.join(", ")}`,
    );
  }
}

export async function persistStructureRipplePatchesLocal(
  patches: TreePatch[],
): Promise<void> {
  const applied: StructureSnapshot[] = [];
  const backend = requireLocalBackend();

  try {
    for (const patch of patches) {
      const existing = await backend.structure.getNode(patch.id);
      if (!existing) continue;

      applied.push({
        id: patch.id,
        orderIndex: existing.orderIndex,
        metadata: { ...(existing.metadata ?? {}) },
      });

      await backend.structure.update(patch.id, {
        orderIndex: patch.orderIndex,
        metadata: mergeStructurePatchMetadata(existing.metadata ?? {}, patch),
      });
    }
  } catch (err) {
    await restoreStructureSnapshots(applied);
    throw err;
  }
}

export async function persistClipRippleOutputLocal(
  originalClips: AudioClip[],
  result: RippleOutput,
): Promise<void> {
  const applied: ClipSnapshot[] = [];

  try {
    for (const updated of result.updatedClips) {
      const orig = originalClips.find((c) => c.id === updated.id);
      if (!orig) continue;
      if (
        orig.startSec === updated.startSec &&
        orig.endSec === updated.endSec
      ) {
        continue;
      }
      await localUpdateClip(updated.id, {
        startSec: updated.startSec,
        endSec: updated.endSec,
      });
      applied.push({
        id: orig.id,
        startSec: orig.startSec,
        endSec: orig.endSec,
      });
    }
  } catch (err) {
    await restoreClipSnapshots(applied);
    throw err;
  }
}

/** Structure + clip ripple with rollback if either phase fails (SQLite, no batch tx). */
export async function persistAudioRippleWithRollback(
  patches: TreePatch[],
  originalClips: AudioClip[],
  clipRipple: RippleOutput,
): Promise<void> {
  const structureSnapshots = await snapshotStructureNodes(
    patches.map((patch) => patch.id),
  );

  try {
    await persistStructureRipplePatchesLocal(patches);
    await persistClipRippleOutputLocal(originalClips, clipRipple);
  } catch (err) {
    await restoreStructureSnapshots(structureSnapshots);
    throw err;
  }
}
