/**
 * Persist scene/shot ↔ audio lane links (local project-settings + cloud fallback).
 * Location: src/lib/scene-audio-lane-link-settings.ts
 */

import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import { resolveDirPathByProjectId } from "@/lib/api-adapter/local-project-resolve";
import {
  readProjectSettings,
  writeProjectSettings,
  type LocalProjectSettings,
} from "@/local/project-settings";
import { isDesktopShell } from "@/runtime/detect-runtime";
import type { SceneAudioLaneLinkMap } from "./scene-audio-lane-link";

const CLOUD_LINKS_KEY = (projectId: string) =>
  `scriptony:scene_audio_lane_links:${projectId}`;

function parseLinkMap(raw: unknown): SceneAudioLaneLinkMap {
  if (!raw || typeof raw !== "object") return {};
  const out: SceneAudioLaneLinkMap = {};
  for (const [nodeId, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") continue;
    const o = value as Record<string, unknown>;
    const laneIndex = o.laneIndex;
    const kind = o.kind;
    if (typeof laneIndex !== "number" || !Number.isFinite(laneIndex)) continue;
    if (kind !== "dialog" && kind !== "sfx") continue;
    out[nodeId] = {
      laneIndex,
      kind,
      ...(typeof o.characterId === "string"
        ? { characterId: o.characterId }
        : {}),
    };
  }
  return out;
}

function readCloudFallback(projectId: string): SceneAudioLaneLinkMap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CLOUD_LINKS_KEY(projectId));
    if (!raw) return null;
    return parseLinkMap(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function writeCloudFallback(
  projectId: string,
  links: SceneAudioLaneLinkMap,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    CLOUD_LINKS_KEY(projectId),
    JSON.stringify(links),
  );
}

export async function readSceneAudioLaneLinks(
  projectId: string,
): Promise<SceneAudioLaneLinkMap> {
  if (isLocalProfile() && isDesktopShell()) {
    const dir = await resolveDirPathByProjectId(projectId);
    if (dir) {
      const settings = await readProjectSettings(dir);
      return parseLinkMap(settings?.scene_audio_lane_links);
    }
  }
  return readCloudFallback(projectId) ?? {};
}

export async function writeSceneAudioLaneLinks(
  projectId: string,
  links: SceneAudioLaneLinkMap,
): Promise<void> {
  if (isLocalProfile() && isDesktopShell()) {
    const dir = await resolveDirPathByProjectId(projectId);
    if (dir) {
      const existing = (await readProjectSettings(dir)) ?? {};
      await writeProjectSettings(dir, {
        ...existing,
        scene_audio_lane_links: links,
      } satisfies LocalProjectSettings);
      return;
    }
  }
  writeCloudFallback(projectId, links);
}
