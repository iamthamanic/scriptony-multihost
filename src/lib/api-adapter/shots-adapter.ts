/**
 * Runtime-aware shot CRUD (local structure nodes vs scriptony-shots).
 */

import type { Shot } from "@/lib/types";
import * as CloudShots from "@/lib/api/shots-cloud-http";
import { dispatchByRuntime } from "./runtime-dispatch";
import {
  localCreateShot,
  localDeleteShot,
  localGetAllShotsByProject,
  localGetShot,
  localGetShots,
  localUpdateShot,
} from "./shots-local";

export function getShots(
  sceneId: string,
  _accessToken?: string,
): Promise<Shot[]> {
  return dispatchByRuntime(
    () => CloudShots.cloudGetShots(sceneId),
    () => localGetShots(sceneId),
  );
}

export function getShot(shotId: string, _accessToken?: string): Promise<Shot> {
  return dispatchByRuntime(
    () => CloudShots.cloudGetShot(shotId),
    () => localGetShot(shotId),
  );
}

export function createShot(
  sceneId: string,
  shotData: Partial<Shot>,
  _accessToken?: string,
): Promise<Shot> {
  return dispatchByRuntime(
    () => CloudShots.cloudCreateShot(sceneId, shotData),
    () => localCreateShot(sceneId, shotData),
  );
}

export function updateShot(
  shotId: string,
  updates: Partial<Shot>,
  _accessToken?: string,
): Promise<Shot | undefined> {
  return dispatchByRuntime(
    () => CloudShots.cloudUpdateShot(shotId, updates),
    async () => localUpdateShot(shotId, updates),
  );
}

export function deleteShot(
  shotId: string,
  _accessToken?: string,
): Promise<void> {
  return dispatchByRuntime(
    () => CloudShots.cloudDeleteShot(shotId),
    () => localDeleteShot(shotId),
  );
}

export function getAllShotsByProject(
  projectId: string,
  _accessToken?: string,
): Promise<Shot[]> {
  return dispatchByRuntime(
    () => CloudShots.cloudGetAllShotsByProject(projectId),
    () => localGetAllShotsByProject(projectId),
  );
}
