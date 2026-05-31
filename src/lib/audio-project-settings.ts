/**
 * Audio project settings — dialog lane order (local file + cloud fallback).
 */

import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import { resolveDirPathByProjectId } from "@/lib/api-adapter/local-project-resolve";
import {
  readProjectSettings,
  writeProjectSettings,
  type LocalProjectSettings,
} from "@/local/project-settings";
import { isDesktopShell } from "@/runtime/detect-runtime";

const CLOUD_ORDER_KEY = (projectId: string) =>
  `scriptony:dialog_lane_order:${projectId}`;

export type AudioProjectSettings = Pick<
  LocalProjectSettings,
  "dialog_lane_order"
>;

function readCloudFallback(projectId: string): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CLOUD_ORDER_KEY(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return null;
  }
}

function writeCloudFallback(projectId: string, order: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    CLOUD_ORDER_KEY(projectId),
    JSON.stringify(order),
  );
}

export async function readDialogLaneOrder(
  projectId: string,
): Promise<string[] | null> {
  if (isLocalProfile() && isDesktopShell()) {
    const dir = await resolveDirPathByProjectId(projectId);
    if (dir) {
      const settings = await readProjectSettings(dir);
      return settings?.dialog_lane_order ?? null;
    }
  }
  return readCloudFallback(projectId);
}

export async function writeDialogLaneOrder(
  projectId: string,
  order: string[],
): Promise<void> {
  if (isLocalProfile() && isDesktopShell()) {
    const dir = await resolveDirPathByProjectId(projectId);
    if (dir) {
      const existing = (await readProjectSettings(dir)) ?? {};
      await writeProjectSettings(dir, {
        ...existing,
        dialog_lane_order: order,
      });
      return;
    }
  }
  writeCloudFallback(projectId, order);
}
