/**
 * Runtime-aware beats API (Tauri local vs cloud functions).
 */

import type {
  CreateBeatPayload,
  StoryBeat,
  UpdateBeatPayload,
} from "@/lib/api/beats-api-types";
import {
  cloudCreateBeat,
  cloudDeleteBeat,
  cloudGetBeats,
  cloudUpdateBeat,
} from "@/lib/api/beats-cloud-http";
import { dispatchByRuntime } from "./runtime-dispatch";
import {
  localCreateBeat,
  localDeleteBeat,
  localGetBeats,
  localUpdateBeat,
} from "./beats-local";

export function getBeats(projectId: string): Promise<StoryBeat[]> {
  return dispatchByRuntime(
    () => cloudGetBeats(projectId),
    () => localGetBeats(projectId),
  );
}

export function createBeat(payload: CreateBeatPayload): Promise<StoryBeat> {
  return dispatchByRuntime(
    () => cloudCreateBeat(payload),
    () => localCreateBeat(payload),
  );
}

export function updateBeat(
  beatId: string,
  payload: UpdateBeatPayload,
): Promise<StoryBeat> {
  return dispatchByRuntime(
    () => cloudUpdateBeat(beatId, payload),
    () => localUpdateBeat(beatId, payload),
  );
}

export function deleteBeat(beatId: string): Promise<void> {
  return dispatchByRuntime(
    () => cloudDeleteBeat(beatId),
    () => localDeleteBeat(beatId),
  );
}

export async function reorderBeats(
  beats: { id: string; order_index: number }[],
): Promise<void> {
  await Promise.all(
    beats.map(({ id, order_index }) => updateBeat(id, { order_index })),
  );
}
