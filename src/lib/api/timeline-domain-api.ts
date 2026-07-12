/**
 * Timeline Domain API — Re-exports for Shots and Clips.
 *
 * T13: Shots and Clips belong to the same logical Timeline Domain.
 * This module is a thin re-export layer: no wrappers, no code duplication.
 *
 * New code should import from here.
 * Legacy code may continue using shots-api.ts and clips-api.ts
 * until a migration ticket explicitly retires them.
 */

// ── Types ───────────────────────────────────────────────────────────────────
export type { Shot, ShotAudio, Clip } from "../types";
export type { ImageUploadGifMode } from "../image-upload-prep";

// ── Shots ─────────────────────────────────────────────────────────────────────
export {
  getShots,
  getShot,
  createShot,
  updateShot,
  deleteShot,
  reorderShots,
  getAllShotsByProject,
  uploadShotImage,
  uploadShotStageDocument,
  uploadShotAudio,
  updateShotAudio,
  deleteShotAudio,
  getShotAudio,
  getBatchShotAudio,
  addCharacterToShot,
  removeCharacterFromShot,
} from "./shots-api";

// ── Clips ─────────────────────────────────────────────────────────────────────
export {
  listClipsByProject,
  listClipsByShot,
  createClip,
  updateClip,
  deleteClip,
} from "./clips-api";
