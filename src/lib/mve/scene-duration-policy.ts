/**
 * Scene duration policy per project type (MVE line content sync).
 * Audio/Hörspiel: content drives scene size. Film: shots drive scene (Slice 2).
 *
 * Location: src/lib/mve/scene-duration-policy.ts
 */

import { isAudioProjectType } from "@/lib/project-type-audio";

export type SceneDurationMode = "contentDriven" | "structureDriven";

export function sceneDurationModeForProjectType(
  projectType?: string | null,
): SceneDurationMode {
  if (isAudioProjectType(projectType)) return "contentDriven";
  return "structureDriven";
}

export function isContentDrivenSceneDuration(
  projectType?: string | null,
): boolean {
  return sceneDurationModeForProjectType(projectType) === "contentDriven";
}
