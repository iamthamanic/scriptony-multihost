/**
 * Editor-readmodel response builders (S + KISS).
 *
 * Pure functions: no side effects, no I/O.
 */

import {
  buildProject,
  buildTimeline,
  mapStyleSummary,
  type Timeline,
} from "./editor-mappers";

type JsonRecord = Record<string, unknown>;

export function buildLiteResponse(
  project: JsonRecord,
  nodes: JsonRecord[],
  elapsedMs: number,
  errors?: string[],
): JsonRecord {
  return {
    project: buildProject(project),
    timeline: buildTimeline(nodes),
    errors: errors?.length ? errors : undefined,
    meta: {
      lite: true,
      elapsedMs,
      version: "v1",
    },
  };
}

export function buildFullResponse(
  project: JsonRecord,
  nodes: JsonRecord[],
  characters: JsonRecord[],
  shots: JsonRecord[],
  clips: JsonRecord[],
  scriptBlocks: JsonRecord[],
  sceneAudioTracks: JsonRecord[],
  assets: JsonRecord[],
  styleData: { style: JsonRecord | null; items: JsonRecord[] },
  elapsedMs: number,
  errors?: string[],
): JsonRecord {
  const timeline: Timeline = buildTimeline(nodes);
  const shotIds = new Set(shots.map((s) => String(s.id)));
  const filteredClips = clips.filter((c) => shotIds.has(String(c.shotId)));

  return {
    project: buildProject(project),
    timeline,
    characters,
    shots,
    clips: filteredClips,
    scriptBlocks,
    sceneAudioTracks,
    assets,
    styleSummary: mapStyleSummary(styleData.style, styleData.items),
    errors: errors?.length ? errors : undefined,
    stats: {
      totalNodes: nodes.length,
      acts: timeline.acts.length,
      sequences: timeline.sequences.length,
      scenes: timeline.scenes.length,
      characters: characters.length,
      shots: shots.length,
      clips: filteredClips.length,
      scriptBlocks: scriptBlocks.length,
      sceneAudioTracks: sceneAudioTracks.length,
      assets: assets.length,
      styleItems: styleData.items.length,
    },
    meta: {
      lite: false,
      elapsedMs,
      version: "v1",
      warning:
        nodes.length > 200
          ? "Large project: consider lite=true for faster loads"
          : undefined,
    },
  };
}
