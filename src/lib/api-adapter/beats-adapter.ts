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
  localReorderBeats,
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

async function cloudReorderBeats(
  beats: { id: string; order_index: number }[],
): Promise<void> {
  for (const { id, order_index } of beats) {
    await cloudUpdateBeat(id, { order_index });
  }
}

export async function reorderBeats(
  beats: { id: string; order_index: number }[],
): Promise<void> {
  return dispatchByRuntime(
    () => cloudReorderBeats(beats),
    () => localReorderBeats(beats),
  );
}
