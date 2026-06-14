/**
 * Timeline ruler vs lane durations — beat lane and structure tree stay independent.
 * Location: src/lib/timeline-duration.ts
 */

export interface ResolveTimelineDurationsInput {
  /** Stored project duration from settings (seconds). */
  durationSec: number;
  /** Last structure trim/move commit (layoutProjectDurationSec on TimelineData). */
  layoutDurationSec?: number;
  /** Elastic grow from structure trim only. */
  structureElasticSec: number;
  /** Elastic grow from beat trim/move only. */
  beatElasticSec: number;
}

export interface ResolvedTimelineDurations {
  /** VET tree + act/seq/scene fallback blocks. */
  structureProjectDurationSec: number;
  /** Beat pct_from / pct_to decode. */
  beatTimelineDurationSec: number;
  /** Scroll ruler width = max(lanes). */
  rulerDurationSec: number;
}

export function resolveTimelineDurations(
  input: ResolveTimelineDurationsInput,
): ResolvedTimelineDurations {
  const base = Math.max(1e-6, input.durationSec);
  const layout =
    typeof input.layoutDurationSec === "number" &&
    Number.isFinite(input.layoutDurationSec) &&
    input.layoutDurationSec > 0
      ? input.layoutDurationSec
      : 0;

  const structureProjectDurationSec = Math.max(
    base,
    input.structureElasticSec,
    layout,
  );
  const beatTimelineDurationSec = Math.max(base, input.beatElasticSec);
  const rulerDurationSec = Math.max(
    structureProjectDurationSec,
    beatTimelineDurationSec,
  );

  return {
    structureProjectDurationSec,
    beatTimelineDurationSec,
    rulerDurationSec,
  };
}
