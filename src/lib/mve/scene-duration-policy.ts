/**
 * Scene duration policy per project type (MVE line content sync).
 * Audio/Hörspiel: content drives scene size. Film: shots drive scene (Slice 2).
 *
 * Location: src/lib/mve/scene-duration-policy.ts
 */

export type SceneDurationMode = "contentDriven" | "structureDriven";

export function sceneDurationModeForProjectType(
  projectType?: string | null,
): SceneDurationMode {
  const t = (projectType ?? "").toLowerCase().trim();
  if (t === "audio") return "contentDriven";
  return "structureDriven";
}

export function isContentDrivenSceneDuration(
  projectType?: string | null,
): boolean {
  return sceneDurationModeForProjectType(projectType) === "contentDriven";
}
