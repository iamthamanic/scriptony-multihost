/**
 * Local MVE render CRUD via MveRepository.
 * Location: src/lib/api-adapter/mve-render-local.ts
 */

import type {
  MveAudioJobCreatePayload,
  MveAudioJobUpdatePayload,
  MveTakeCreatePayload,
  MveTakeUpdatePayload,
} from "@/backend/ScriptonyBackend";
import type { MveAudioJob } from "@/lib/multi-voice-engine/schema/audio-job";
import type { MveTake } from "@/lib/multi-voice-engine/schema/take";
import { requireLocalBackend } from "./runtime-dispatch";

export async function localListMveAudioJobsByLine(
  lineId: string,
): Promise<MveAudioJob[]> {
  const backend = requireLocalBackend();
  return backend.mve.listAudioJobsByLine(lineId);
}

export async function localGetMveAudioJob(
  jobId: string,
): Promise<MveAudioJob | null> {
  const backend = requireLocalBackend();
  return backend.mve.getAudioJob(jobId);
}

export async function localCreateMveAudioJob(
  projectId: string,
  payload: MveAudioJobCreatePayload,
): Promise<MveAudioJob> {
  const backend = requireLocalBackend(projectId);
  return backend.mve.createAudioJob(projectId, payload);
}

export async function localUpdateMveAudioJob(
  jobId: string,
  patch: MveAudioJobUpdatePayload,
): Promise<MveAudioJob> {
  const backend = requireLocalBackend();
  return backend.mve.updateAudioJob(jobId, patch);
}

export async function localListMveTakesByLine(
  lineId: string,
): Promise<MveTake[]> {
  const backend = requireLocalBackend();
  return backend.mve.listTakesByLine(lineId);
}

export async function localGetMveTake(takeId: string): Promise<MveTake | null> {
  const backend = requireLocalBackend();
  return backend.mve.getTake(takeId);
}

export async function localCreateMveTake(
  projectId: string,
  payload: MveTakeCreatePayload,
): Promise<MveTake> {
  const backend = requireLocalBackend(projectId);
  return backend.mve.createTake(projectId, payload);
}

export async function localUpdateMveTake(
  takeId: string,
  patch: MveTakeUpdatePayload,
): Promise<MveTake> {
  const backend = requireLocalBackend();
  return backend.mve.updateTake(takeId, patch);
}

export async function localSelectMveTake(
  lineId: string,
  takeId: string,
): Promise<MveTake> {
  const backend = requireLocalBackend();
  return backend.mve.selectTake(lineId, takeId);
}
