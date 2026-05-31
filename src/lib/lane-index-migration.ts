/**
 * Lane index migration v1 → v2 (character lanes 0–99, SFX/Music/Atmo shifted).
 */

export const LANE_SCHEMA_VERSION = 2 as const;

/** Returns true if lane index uses pre-v2 SFX/Music/Atmo/Global ranges. */
export function needsLegacyLaneMigration(laneIndex: number): boolean {
  return (
    (laneIndex >= 10 && laneIndex <= 39) || (laneIndex >= 90 && laneIndex <= 99)
  );
}

/** Map legacy lane indices to v2 schema ranges. */
export function migrateLegacyLaneIndex(laneIndex: number): number {
  if (laneIndex >= 0 && laneIndex <= 9) return laneIndex;
  if (laneIndex >= 10 && laneIndex <= 19) return laneIndex + 90;
  if (laneIndex >= 20 && laneIndex <= 29) return laneIndex + 90;
  if (laneIndex >= 30 && laneIndex <= 39) return laneIndex + 90;
  if (laneIndex >= 40 && laneIndex <= 49) return laneIndex;
  if (laneIndex >= 90 && laneIndex <= 99) return laneIndex + 100;
  return laneIndex;
}
