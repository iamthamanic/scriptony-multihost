/**
 * Cloud shot CRUD (scriptony-shots via API gateway).
 */

import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  unwrapApiResult,
} from "../api-client";
import type { Shot } from "../types";

export async function cloudGetShots(sceneId: string): Promise<Shot[]> {
  const result = await apiGet(`/shots/by-scene/${encodeURIComponent(sceneId)}`);
  const data = unwrapApiResult(result);
  return data?.shots || [];
}

export async function cloudGetShot(shotId: string): Promise<Shot> {
  const result = await apiGet(`/shots/${shotId}`);
  const data = unwrapApiResult(result);
  return data?.shot || data;
}

export async function cloudCreateShot(
  sceneId: string,
  shotData: Partial<Shot>,
): Promise<Shot> {
  const projectId =
    (shotData as { projectId?: string; project_id?: string }).projectId ||
    (shotData as { project_id?: string }).project_id;
  const payload: Record<string, unknown> = {
    scene_id: sceneId,
    project_id: projectId,
  };
  const raw = shotData as Record<string, unknown>;
  if (raw.shotNumber !== undefined) payload.shot_number = raw.shotNumber;
  if (shotData.description !== undefined)
    payload.description = shotData.description;
  if (shotData.duration !== undefined) payload.duration = shotData.duration;
  if (raw.cameraAngle !== undefined) payload.camera_angle = raw.cameraAngle;
  if (raw.shotType !== undefined) payload.shot_type = raw.shotType;
  if (raw.imageUrl !== undefined) payload.image_url = raw.imageUrl;
  const result = await apiPost("/shots", payload);
  const data = unwrapApiResult(result);
  return data?.shot || data;
}

export async function cloudUpdateShot(
  shotId: string,
  updates: Partial<Shot>,
): Promise<Shot | undefined> {
  const out: Partial<Shot> = { ...updates };
  if (out.imageUrl !== undefined) {
    const u = out.imageUrl;
    if (typeof u !== "string" || !u.trim() || u.startsWith("data:")) {
      delete out.imageUrl;
    }
  }
  const payload = out as Record<string, unknown>;
  if (Object.keys(payload).length === 0) return undefined;
  const result = await apiPut(`/shots/${shotId}`, payload);
  const data = unwrapApiResult(result);
  return data?.shot || data;
}

export async function cloudDeleteShot(shotId: string): Promise<void> {
  const result = await apiDelete(`/shots/${shotId}`);
  unwrapApiResult(result);
}

export async function cloudGetAllShotsByProject(
  projectId: string,
): Promise<Shot[]> {
  const result = await apiGet(`/shots?project_id=${projectId}`);
  const data = unwrapApiResult(result);
  return data?.shots || [];
}
