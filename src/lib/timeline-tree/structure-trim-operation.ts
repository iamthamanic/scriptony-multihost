/**
 * VETILALORAPP — default structure trim operation per item kind.
 * Location: src/lib/timeline-tree/structure-trim-operation.ts
 */

import type { ItemKind, StructureTrimOperation } from "./types";

/** CapCut-aligned: all structure kinds use bubble ripple (act grows with children, no tail gap). */
export function resolveStructureTrimOperation(
  _kind: ItemKind,
): StructureTrimOperation {
  return "ripple-resize";
}
