/**
 * 🎬 BEATS API CLIENT
 *
 * API für Story Beats (Save the Cat, Hero's Journey, etc.)
 * Facade → beats-adapter (local SQLite vs cloud).
 */

export type {
  StoryBeat,
  CreateBeatPayload,
  UpdateBeatPayload,
} from "./beats-api-types";

export {
  getBeats,
  createBeat,
  updateBeat,
  deleteBeat,
  reorderBeats,
} from "@/lib/api-adapter/beats-adapter";
