/**
 * VETILALORAPP — dev console diagnostics for blocked structure trims.
 * Location: src/lib/ripple-engine/structure-trim-debug.ts
 */

import type {
  ItemKind,
  TimelineInvariantError,
  TrimSide,
} from "../timeline-tree/types";

export function isStructureTrimDebugEnabled(): boolean {
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    return true;
  }
  return false;
}

export interface StructureTrimBlockLogInput {
  itemId: string;
  kind?: ItemKind;
  side?: TrimSide;
  operation?: string;
  blockReason?: string;
  invariantErrors?: TimelineInvariantError[];
}

/** Log once on pointerup when commit is rejected (not during pointermove preview). */
export function logStructureTrimBlock(input: StructureTrimBlockLogInput): void {
  if (!isStructureTrimDebugEnabled()) return;

  const codes = (input.invariantErrors ?? []).map((e) => e.code);
  const summary = [
    "[VET structure-trim] commit blocked",
    `reason=${input.blockReason ?? "unknown"}`,
    `item=${input.itemId}`,
    input.kind ? `kind=${input.kind}` : "",
    input.side ? `side=${input.side}` : "",
    codes.length ? `codes=${codes.join(",")}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  console.warn(summary, input.invariantErrors ?? []);
}

export function logTimelineTreeDiagnosis(
  label: string,
  errors: TimelineInvariantError[],
): void {
  if (!isStructureTrimDebugEnabled() || errors.length === 0) return;
  console.warn(`[VET timeline-tree] ${label}`, errors);
}
