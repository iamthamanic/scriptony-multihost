/**
 * Ripple optimistic-lock conflict check.
 *
 * Repository twin (byte-identical): functions/_shared/ripple-engine-conflict.ts ↔ src/lib/ripple-engine-conflict.ts

 */

import type { ConflictCheckInput } from "./ripple-engine-types";

/**
 * Prüft, ob ein Clip seit dem letzten Lesen geändert wurde.
 * Für Optimistic Locking: Wenn updatedAt ≠ lastKnownUpdatedAt → Konflikt.
 */
export function checkForConflict(input: ConflictCheckInput): boolean {
  const { clipId, lastKnownUpdatedAt, allClips } = input;
  const clip = allClips.find((c) => c.id === clipId);
  if (!clip) return false; // Clip gelöscht = kein Konflikt (wird separat behandelt)
  const serverMs = Date.parse(clip.updatedAt);
  const clientMs = Date.parse(lastKnownUpdatedAt);
  if (Number.isFinite(serverMs) && Number.isFinite(clientMs)) {
    return serverMs !== clientMs;
  }
  return clip.updatedAt !== lastKnownUpdatedAt;
}
