/**
 * Cloud beats API (scriptony-* /beats routes).
 * Used by beats-adapter; not imported from UI directly.
 */

import { apiClient } from "../api-client";
import type {
  CreateBeatPayload,
  StoryBeat,
  UpdateBeatPayload,
} from "./beats-api-types";

function throwBeatsApiError(message: string, error: unknown): never {
  const nextError = new Error(
    error instanceof Error && error.message ? error.message : message,
  );
  (nextError as Error & { cause?: unknown }).cause = error;
  throw nextError;
}

export async function cloudGetBeats(projectId: string): Promise<StoryBeat[]> {
  try {
    const data = await apiClient.get(`/beats?project_id=${projectId}`);
    return data.beats || [];
  } catch (error: unknown) {
    console.error("[BeatsAPI] Failed to fetch beats:", error);
    throwBeatsApiError("Failed to fetch beats", error);
  }
}

export async function cloudCreateBeat(
  payload: CreateBeatPayload,
): Promise<StoryBeat> {
  try {
    const data = await apiClient.post("/beats", payload);
    return data.beat;
  } catch (error: unknown) {
    console.error("[BeatsAPI] Failed to create beat:", error);
    throwBeatsApiError("Failed to create beat", error);
  }
}

export async function cloudUpdateBeat(
  beatId: string,
  payload: UpdateBeatPayload,
): Promise<StoryBeat> {
  const url = `/beats/${beatId}`;
  try {
    const data = await apiClient.patch(url, payload);
    return data.beat;
  } catch (error: unknown) {
    console.error("[BeatsAPI] Update failed:", { beatId, error });
    throwBeatsApiError("Failed to update beat", error);
  }
}

export async function cloudDeleteBeat(beatId: string): Promise<void> {
  try {
    await apiClient.delete(`/beats/${beatId}`);
  } catch (error: unknown) {
    console.error("[BeatsAPI] Delete failed:", { beatId, error });
    throwBeatsApiError("Failed to delete beat", error);
  }
}
