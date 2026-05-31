/**
 * One-time lane index migration v1 → v2 for cloud SQLite/Appwrite clips.
 * Run manually when deploying lane schema v2.
 */

import { migrateLegacyLaneIndex } from "../src/lib/lane-index-migration";

const RANGES: Array<{ min: number; max: number }> = [
  { min: 10, max: 39 },
  { min: 90, max: 99 },
];

export function migrateLaneIndexValue(laneIndex: number): number {
  if (laneIndex >= 10 && laneIndex <= 39)
    return migrateLegacyLaneIndex(laneIndex);
  if (laneIndex >= 90 && laneIndex <= 99)
    return migrateLegacyLaneIndex(laneIndex);
  return laneIndex;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Lane migration map (sample):");
  for (const { min, max } of RANGES) {
    for (let i = min; i <= max; i++) {
      console.log(`${i} → ${migrateLaneIndexValue(i)}`);
    }
  }
}
