/**
 * Editor-readmodel domain fetchers (S from SOLID).
 *
 * Each fetcher is responsible for exactly one domain.
 * Failures are collected into a shared `errors` array instead of being
 * swallowed so the client can decide whether to show partial-load states.
 */

import { Query } from "node-appwrite";
import { C, listDocumentsFull } from "../../_shared/appwrite-db";
import { mapClip } from "../../_shared/clips-map";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
  getAllProjectNodes,
  getCharactersByProject,
  getShots,
  mapCharacter,
  mapNode,
  mapShot,
} from "../../_shared/timeline";
import { mapAsset, mapSceneAudioTrack, mapScriptBlock } from "./editor-mappers";

type JsonRecord = Record<string, unknown>;

const MAX_BATCH_LIMIT = 5000;

function appendError(errors: string[], domain: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  const entry = `[editor-readmodel] ${domain} failed: ${msg}`;
  console.warn(entry);
  errors.push(entry);
}

/**
 * Nodes are the structural backbone of the editor response.
 * If this fails the entire request must abort (fatal), therefore no try/catch.
 */
export async function fetchNodes(projectId: string): Promise<JsonRecord[]> {
  const nodes = await getAllProjectNodes(projectId);
  return nodes.map(mapNode) as JsonRecord[];
}

export async function fetchCharacters(
  projectId: string,
  errors: string[],
): Promise<JsonRecord[]> {
  try {
    const rows = await getCharactersByProject(projectId);
    return rows.map(mapCharacter) as JsonRecord[];
  } catch (err) {
    appendError(errors, "characters", err);
    return [];
  }
}

export async function fetchShots(
  projectId: string,
  errors: string[],
): Promise<JsonRecord[]> {
  try {
    const rows = await getShots({ projectId });
    return rows.map(mapShot) as JsonRecord[];
  } catch (err) {
    appendError(errors, "shots", err);
    return [];
  }
}

export async function fetchClips(
  projectId: string,
  errors: string[],
): Promise<JsonRecord[]> {
  try {
    const rows = await listDocumentsFull(C.clips, [
      Query.equal("project_id", projectId),
    ]);
    return rows.map(mapClip) as JsonRecord[];
  } catch (err) {
    appendError(errors, "clips", err);
    return [];
  }
}

export async function fetchScriptBlocks(
  projectId: string,
  errors: string[],
): Promise<JsonRecord[]> {
  let scriptId: string | undefined;
  try {
    const scripts = await listDocumentsFull(C.scripts, [
      Query.equal("project_id", projectId),
      Query.limit(1),
    ]);
    scriptId = scripts[0]?.id;
  } catch (err) {
    appendError(errors, "scriptBlocks.scriptLookup", err);
    return [];
  }

  if (!scriptId) return [];

  try {
    const blocks = await listDocumentsFull(C.script_blocks, [
      Query.equal("script_id", String(scriptId)),
      Query.orderAsc("order_index"),
      Query.limit(MAX_BATCH_LIMIT),
    ]);
    if (blocks.length >= MAX_BATCH_LIMIT) {
      errors.push(
        `[editor-readmodel] scriptBlocks truncated at ${MAX_BATCH_LIMIT} — project may have more`,
      );
    }
    return blocks.map((b) => mapScriptBlock(b as JsonRecord));
  } catch (err) {
    appendError(errors, "scriptBlocks.blocksFetch", err);
    return [];
  }
}

export async function fetchSceneAudioTracks(
  projectId: string,
  errors: string[],
): Promise<JsonRecord[]> {
  try {
    const data = await requestGraphql<{
      scene_audio_tracks: JsonRecord[];
    }>(
      `
        query GetSceneAudioTracksByProject($projectId: uuid!) {
          scene_audio_tracks(
            where: { project_id: { _eq: $projectId } }
            order_by: { order_index: asc }
          ) {
            id
            scene_id
            project_id
            type
            content
            character_id
            audio_file_id
            order_index
            start_time
            end_time
            created_at
            updated_at
          }
        }
      `,
      { projectId },
    );
    return (data.scene_audio_tracks || []).map((t) =>
      mapSceneAudioTrack(t as JsonRecord),
    );
  } catch (err) {
    appendError(errors, "sceneAudioTracks", err);
    return [];
  }
}

export async function fetchAssets(
  projectId: string,
  errors: string[],
): Promise<JsonRecord[]> {
  try {
    const rows = await listDocumentsFull(C.assets, [
      Query.equal("project_id", projectId),
      Query.limit(MAX_BATCH_LIMIT),
    ]);
    if (rows.length >= MAX_BATCH_LIMIT) {
      errors.push(
        `[editor-readmodel] assets truncated at ${MAX_BATCH_LIMIT} — project may have more`,
      );
    }
    return rows.map((a) => mapAsset(a as JsonRecord));
  } catch (err) {
    appendError(errors, "assets", err);
    return [];
  }
}

export async function fetchStyle(
  projectId: string,
  errors: string[],
): Promise<{ style: JsonRecord | null; items: JsonRecord[] }> {
  try {
    const styles = await listDocumentsFull(C.project_visual_style, [
      Query.equal("project_id", projectId),
      Query.limit(1),
    ]);
    const style = (styles[0] as JsonRecord) || null;
    if (!style) return { style: null, items: [] };
    const items = await listDocumentsFull(C.project_visual_style_items, [
      Query.equal("project_visual_style_id", String(style.id)),
      Query.limit(MAX_BATCH_LIMIT),
    ]);
    if (items.length >= MAX_BATCH_LIMIT) {
      errors.push(
        `[editor-readmodel] styleItems truncated at ${MAX_BATCH_LIMIT} — project may have more`,
      );
    }
    return { style, items: items as JsonRecord[] };
  } catch (err) {
    appendError(errors, "style", err);
    return { style: null, items: [] };
  }
}
