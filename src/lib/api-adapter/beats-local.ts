/**
 * Local beats via LocalBeatsRepository (SQLite).
 */

import type {
  CreateBeatPayload,
  StoryBeat,
  UpdateBeatPayload,
} from "@/lib/api/beats-api-types";
import { requireLocalBackend } from "./runtime-dispatch";

export async function localGetBeats(projectId: string): Promise<StoryBeat[]> {
  const backend = requireLocalBackend(projectId);
  return backend.beats.list(projectId);
}

export async function localCreateBeat(
  payload: CreateBeatPayload,
): Promise<StoryBeat> {
  const backend = requireLocalBackend(payload.project_id);
  return backend.beats.create(payload.project_id, payload);
}

export async function localUpdateBeat(
  beatId: string,
  payload: UpdateBeatPayload,
): Promise<StoryBeat> {
  const backend = requireLocalBackend();
  return backend.beats.update(beatId, payload);
}

export async function localDeleteBeat(beatId: string): Promise<void> {
  const backend = requireLocalBackend();
  await backend.beats.delete(beatId);
}

/** Sequential reorder with rollback on failure (SQLite, no batch endpoint). */
export async function localReorderBeats(
  beats: { id: string; order_index: number }[],
): Promise<void> {
  const backend = requireLocalBackend();
  const originals: { id: string; order_index: number }[] = [];

  for (const { id } of beats) {
    const beat = await backend.beats.get(id);
    if (beat) {
      originals.push({ id, order_index: beat.order_index });
    }
  }

  try {
    for (const { id, order_index } of beats) {
      await backend.beats.update(id, { order_index });
    }
  } catch (err) {
    for (const { id, order_index } of originals) {
      try {
        await backend.beats.update(id, { order_index });
      } catch {
        // best-effort rollback
      }
    }
    throw err;
  }
}
