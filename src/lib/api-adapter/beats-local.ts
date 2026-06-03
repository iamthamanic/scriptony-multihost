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
