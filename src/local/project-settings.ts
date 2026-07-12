/**
 * Local project UI settings — persisted beside scriptony.json (T61).
 *
 * Stores ProjectsPage metadata that does not fit the slim SQLite projects row.
 * Location: src/local/project-settings.ts
 */

import { isDesktopShell } from "@/runtime/detect-runtime";

export const PROJECT_SETTINGS_FILENAME = "project-settings.json" as const;

/** Shape aligned with ProjectsPage / cloud project PUT body. */
export interface LocalProjectSettings {
  logline?: string;
  genre?: string;
  duration?: string;
  linkedWorldId?: string | null;
  concept_blocks?: unknown[];
  episode_layout?: string;
  season_engine?: string;
  narrative_structure?: string;
  beat_template?: string;
  target_pages?: number;
  words_per_page?: number;
  reading_speed_wpm?: number;
  inspirations?: string[];
  cover_image_url?: string;
  /** Character IDs in mixer column order (dialog lanes 0..n-1). */
  dialog_lane_order?: string[];
  /** Scene or shot id → linked audio DAW lane (dialog or SFX). */
  scene_audio_lane_links?: Record<
    string,
    {
      laneIndex: number;
      kind: "dialog" | "sfx";
      characterId?: string;
    }
  >;
  /** Default project style profile (not exclusive). */
  activeStyleProfileId?: string | null;
}

export function parseProjectTypeFromPayload(
  project: Record<string, unknown>,
  fallback = "film",
): string {
  if (typeof project.type === "string" && project.type.trim()) {
    return project.type.trim();
  }
  if (typeof project.project_type === "string" && project.project_type.trim()) {
    return project.project_type.trim();
  }
  if (typeof project.projectType === "string" && project.projectType.trim()) {
    return project.projectType.trim();
  }
  return fallback;
}

export function parseLoglineFromPayload(
  project: Record<string, unknown>,
): string | undefined {
  if (typeof project.logline === "string") return project.logline;
  if (typeof project.description === "string") return project.description;
  return undefined;
}

/** Map API update/create body → settings file + SQLite/manifest fields. */
export function apiPayloadToLocalSettings(
  project: Record<string, unknown>,
): LocalProjectSettings {
  const settings: LocalProjectSettings = {};

  const logline = parseLoglineFromPayload(project);
  if (logline !== undefined) settings.logline = logline;

  if (typeof project.genre === "string") settings.genre = project.genre;

  if (typeof project.duration === "string")
    settings.duration = project.duration;

  if (project.linkedWorldId !== undefined) {
    settings.linkedWorldId =
      project.linkedWorldId === null ? null : String(project.linkedWorldId);
  }

  if (Array.isArray(project.concept_blocks)) {
    settings.concept_blocks = project.concept_blocks;
  }

  if (typeof project.episode_layout === "string") {
    settings.episode_layout = project.episode_layout;
  }
  if (typeof project.season_engine === "string") {
    settings.season_engine = project.season_engine;
  }
  if (typeof project.narrative_structure === "string") {
    settings.narrative_structure = project.narrative_structure;
  }
  if (typeof project.beat_template === "string") {
    settings.beat_template = project.beat_template;
  }

  if (typeof project.target_pages === "number") {
    settings.target_pages = project.target_pages;
  }
  if (typeof project.words_per_page === "number") {
    settings.words_per_page = project.words_per_page;
  }
  if (typeof project.reading_speed_wpm === "number") {
    settings.reading_speed_wpm = project.reading_speed_wpm;
  }
  if (Array.isArray(project.inspirations)) {
    settings.inspirations = project.inspirations.filter(
      (x): x is string => typeof x === "string",
    );
  }
  if (Array.isArray(project.dialog_lane_order)) {
    settings.dialog_lane_order = project.dialog_lane_order.filter(
      (x): x is string => typeof x === "string",
    );
  }
  if (typeof project.cover_image_url === "string") {
    settings.cover_image_url = project.cover_image_url;
  }
  if (project.activeStyleProfileId !== undefined) {
    settings.activeStyleProfileId =
      project.activeStyleProfileId === null
        ? null
        : String(project.activeStyleProfileId);
  }
  if (project.active_style_profile_id !== undefined) {
    settings.activeStyleProfileId =
      project.active_style_profile_id === null
        ? null
        : String(project.active_style_profile_id);
  }

  return settings;
}

/** Merge settings into legacy project shape for ProjectsPage. */
export function localSettingsToLegacyFields(
  settings: LocalProjectSettings | null | undefined,
): Record<string, unknown> {
  if (!settings) return {};
  return {
    logline: settings.logline,
    genre: settings.genre,
    duration: settings.duration,
    linkedWorldId: settings.linkedWorldId,
    world_id: settings.linkedWorldId,
    concept_blocks: settings.concept_blocks,
    episode_layout: settings.episode_layout,
    season_engine: settings.season_engine,
    narrative_structure: settings.narrative_structure,
    beat_template: settings.beat_template,
    target_pages: settings.target_pages,
    words_per_page: settings.words_per_page,
    reading_speed_wpm: settings.reading_speed_wpm,
    inspirations: settings.inspirations,
    cover_image_url: settings.cover_image_url,
    dialog_lane_order: settings.dialog_lane_order,
    activeStyleProfileId: settings.activeStyleProfileId,
    active_style_profile_id: settings.activeStyleProfileId,
  };
}

export async function readProjectSettings(
  dirPath: string,
): Promise<LocalProjectSettings | null> {
  if (!isDesktopShell()) return null;
  try {
    const { join } = await import("@tauri-apps/api/path");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const raw = await readTextFile(
      await join(dirPath, PROJECT_SETTINGS_FILENAME),
    );
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as LocalProjectSettings;
  } catch {
    return null;
  }
}

export async function writeProjectSettings(
  dirPath: string,
  settings: LocalProjectSettings,
): Promise<void> {
  if (!isDesktopShell()) return;
  const { join } = await import("@tauri-apps/api/path");
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");
  await writeTextFile(
    await join(dirPath, PROJECT_SETTINGS_FILENAME),
    JSON.stringify(settings, null, 2),
  );
}
