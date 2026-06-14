/**
 * Frozen global second bounds for structure trim row snapshots (VET legacy paths).
 * Location: src/lib/timeline-frozen-bounds.ts
 */

export type FrozenGlobalBounds = Record<
  string,
  { startSec: number; endSec: number }
>;
