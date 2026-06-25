/**
 * Runtime-aware MVE render API (local SQLite MVP 0.2).
 * Location: src/lib/api-adapter/mve-render-adapter.ts
 */

import type {
  MveAudioJobCreatePayload,
  MveAudioJobUpdatePayload,
  MveTakeCreatePayload,
  MveTakeUpdatePayload,
} from "@/backend/ScriptonyBackend";
import type { MveAudioJob } from "@/lib/multi-voice-engine/schema/audio-job";
import type { MveTake } from "@/lib/multi-voice-engine/schema/take";
import { dispatchByRuntime, localNotSupported } from "./runtime-dispatch";
import {
  localCreateMveAudioJob,
  localCreateMveTake,
  localGetMveAudioJob,
  localGetMveTake,
  localListMveAudioJobsByLine,
  localListMveTakesByLine,
  localSelectMveTake,
  localUpdateMveAudioJob,
  localUpdateMveTake,
} from "./mve-render-local";

const MVE_RENDER_CLOUD_MSG =
  "MVE-Render (Jobs/Takes) ist in der Cloud-Version noch nicht verfügbar.";

export function getMveAudioJobsByLine(lineId: string): Promise<MveAudioJob[]> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_RENDER_CLOUD_MSG),
    () => localListMveAudioJobsByLine(lineId),
  );
}

export function getMveAudioJob(jobId: string): Promise<MveAudioJob | null> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_RENDER_CLOUD_MSG),
    () => localGetMveAudioJob(jobId),
  );
}

export function createMveAudioJob(
  projectId: string,
  payload: MveAudioJobCreatePayload,
): Promise<MveAudioJob> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_RENDER_CLOUD_MSG),
    () => localCreateMveAudioJob(projectId, payload),
  );
}

export function updateMveAudioJob(
  jobId: string,
  patch: MveAudioJobUpdatePayload,
): Promise<MveAudioJob> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_RENDER_CLOUD_MSG),
    () => localUpdateMveAudioJob(jobId, patch),
  );
}

export function getMveTakesByLine(lineId: string): Promise<MveTake[]> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_RENDER_CLOUD_MSG),
    () => localListMveTakesByLine(lineId),
  );
}

export function getMveTake(takeId: string): Promise<MveTake | null> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_RENDER_CLOUD_MSG),
    () => localGetMveTake(takeId),
  );
}

export function createMveTake(
  projectId: string,
  payload: MveTakeCreatePayload,
): Promise<MveTake> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_RENDER_CLOUD_MSG),
    () => localCreateMveTake(projectId, payload),
  );
}

export function updateMveTake(
  takeId: string,
  patch: MveTakeUpdatePayload,
): Promise<MveTake> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_RENDER_CLOUD_MSG),
    () => localUpdateMveTake(takeId, patch),
  );
}

export function selectMveTake(
  lineId: string,
  takeId: string,
): Promise<MveTake> {
  return dispatchByRuntime(
    () => localNotSupported(MVE_RENDER_CLOUD_MSG),
    () => localSelectMveTake(lineId, takeId),
  );
}
