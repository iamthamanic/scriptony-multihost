/**
 * VETILALORAPP — detect active structure trim / body-move (layout freeze).
 * Location: src/lib/vet-structure-trim-active.ts
 */

import type { ItemKind } from "./timeline-tree/types";
import { USE_HIERARCHICAL_STRUCTURE_RIPPLE } from "./vetilalorapp-feature";

const STRUCTURE_KINDS: ItemKind[] = ["act", "sequence", "scene", "shot"];

const BODY_MOVE_KINDS: ItemKind[] = ["act", "sequence", "scene"];

export interface StructureTrimClip {
  kind: ItemKind | string;
}

export interface StructureMoveClip {
  kind: ItemKind | string;
  id: string;
}

/** True when VET bridge owns the trim (not legacy book-only paths). */
export function isVetStructureTrimClip(
  clip: StructureTrimClip | null | undefined,
): boolean {
  if (!USE_HIERARCHICAL_STRUCTURE_RIPPLE || !clip) return false;
  return STRUCTURE_KINDS.includes(clip.kind as ItemKind);
}

/** True when VET body-move is active (Act / Sequence / Scene). */
export function isVetStructureMoveClip(
  clip: StructureMoveClip | null | undefined,
): boolean {
  if (!USE_HIERARCHICAL_STRUCTURE_RIPPLE || !clip) return false;
  return BODY_MOVE_KINDS.includes(clip.kind as ItemKind);
}

/** Freeze React block layout during VET trim or body-move DOM preview. */
export function isVetStructureLayoutFrozen(input: {
  trimClip: StructureTrimClip | null | undefined;
  moveClip: StructureMoveClip | null | undefined;
}): boolean {
  return (
    isVetStructureTrimClip(input.trimClip) ||
    isVetStructureMoveClip(input.moveClip)
  );
}
