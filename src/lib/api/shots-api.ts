/**
 * Shot API Client
 *
 * @deprecated Use `timeline-domain-api.ts` for new code.
 *   This module remains functional for backward compatibility.
 *   See docs/timeline-domain-decision.md (T13).
 *
 * 🚀 MIGRATED TO API GATEWAY + AUDIO MICROSERVICE
 *
 * Helper functions for Shot CRUD operations, file uploads, and character management.
 * - Shot CRUD / image upload → API Gateway → scriptony-shots
 * - Audio operations → API Gateway → scriptony-audio
 */

import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  unwrapApiResult,
} from "../api-client";
import type { Shot, ShotAudio } from "../types";
import { buildFunctionRouteUrl, EDGE_FUNCTIONS } from "../api-gateway";
import {
  prepareImageFileForUpload,
  type ImageUploadGifMode,
} from "../image-upload-prep";
import {
  assertPreparedImageWithinUploadLimit,
  fileToBase64,
} from "./image-upload-api";
import {
  hasOpenLocalProject,
  usesCloudHttpForDomain,
} from "@/lib/api-adapter/domain-access";
import { requireLocalBackend } from "@/lib/api-adapter/runtime-dispatch";
import { localUpdateShot } from "@/lib/api-adapter/shots-local";
import { normalizeSceneImageStoragePath } from "@/lib/local-asset-display-url";
import { restoreWorkspaceScope } from "@/local/workspace";
import { getActs } from "./timeline-api";
import { initializeProject } from "./timeline-api-v2";
import { narrativeStructureToInitializeProjectPayload } from "../narrative-structure-init";

// API Base URLs for direct file uploads
const SHOTS_API_BASE = buildFunctionRouteUrl(EDGE_FUNCTIONS.SHOTS);
const AUDIO_API_BASE = buildFunctionRouteUrl(EDGE_FUNCTIONS.AUDIO);

// =============================================================================
// SHOT CRUD
// =============================================================================

export {
  getShots,
  getShot,
  createShot,
  updateShot,
  deleteShot,
  getAllShotsByProject,
} from "@/lib/api-adapter/shots-adapter";

export async function reorderShots(
  sceneId: string,
  shotIds: string[],
  accessToken: string,
): Promise<void> {
  const result = await apiPost("/shots/reorder", {
    scene_id: sceneId,
    shot_ids: shotIds,
  });
  unwrapApiResult(result);
}

// =============================================================================
// FILE UPLOADS
// =============================================================================

export async function uploadShotImage(
  shotId: string,
  file: File,
  accessToken: string,
  prepOptions?: { gifMode?: ImageUploadGifMode },
): Promise<string> {
  if (!usesCloudHttpForDomain()) {
    if (!hasOpenLocalProject()) {
      throw new Error(
        "Bitte zuerst ein lokales .scriptony-Projekt im Workspace öffnen.",
      );
    }
    return localUploadShotImage(shotId, file, prepOptions);
  }
  return cloudUploadShotImage(shotId, file, accessToken, prepOptions);
}

async function localUploadShotImage(
  shotId: string,
  file: File,
  prepOptions?: { gifMode?: ImageUploadGifMode },
): Promise<string> {
  const backend = requireLocalBackend();
  const shotNode = await backend.structure.getNode(shotId);
  if (!shotNode || shotNode.type !== "shot") {
    throw new Error(`Shot ${shotId} nicht gefunden`);
  }

  if (backend.localProject.projectId !== shotNode.projectId) {
    throw new Error(
      "Geöffnetes lokales Projekt stimmt nicht mit dem Shot überein.",
    );
  }

  await restoreWorkspaceScope();

  const ready = await prepareImageFileForUpload(file, prepOptions);
  assertPreparedImageWithinUploadLimit(ready, 5);

  const asset = await backend.assets.importAsset({
    projectId: shotNode.projectId,
    file: ready,
    type: "image",
    originalFilename: ready.name,
  });

  const storedPath =
    asset.storage.mode === "local" ? asset.storage.relativePath : "";
  if (!storedPath) {
    throw new Error("Bild konnte nicht im Projekt gespeichert werden");
  }

  const normalized = normalizeSceneImageStoragePath(storedPath) ?? storedPath;

  await localUpdateShot(shotId, {
    imageUrl: normalized,
    shotImageMime: ready.type || undefined,
  });

  return normalized;
}

async function cloudUploadShotImage(
  shotId: string,
  file: File,
  accessToken: string,
  prepOptions?: { gifMode?: ImageUploadGifMode },
): Promise<string> {
  const ready = await prepareImageFileForUpload(file, prepOptions);
  assertPreparedImageWithinUploadLimit(ready, 5);
  const base64 = await fileToBase64(ready);
  // Route through API Gateway to avoid browser-side CORS preflight failures
  // against direct function origins.
  const result = await apiPost(`/shots/${shotId}/upload-image`, {
    fileBase64: base64,
    fileName: ready.name,
    mimeType: ready.type,
  });
  const data = unwrapApiResult(result) as {
    imageUrl?: string;
    image_url?: string;
    data?: { imageUrl?: string };
  };
  const url = data?.imageUrl ?? data?.image_url ?? data?.data?.imageUrl;
  if (!url || typeof url !== "string") {
    throw new Error(
      "Upload antwortete ohne imageUrl — bitte scriptony-shots deployen und Logs prüfen.",
    );
  }
  return url;
}

/**
 * Lädt ein StageDocument (JSON) in den stage-documents Bucket und setzt stage2d_file_id / stage3d_file_id am Shot.
 */
export async function uploadShotStageDocument(
  shotId: string,
  document: unknown,
  kind: "stage2d" | "stage3d",
  _accessToken: string,
): Promise<{ fileId?: string; fileUrl?: string }> {
  const result = await apiPost(`/shots/${shotId}/upload-stage-document`, {
    kind,
    document,
  });
  const data = unwrapApiResult(result) as {
    fileId?: string;
    fileUrl?: string;
    shot?: Shot;
  };
  return { fileId: data?.fileId, fileUrl: data?.fileUrl };
}

export async function uploadShotAudio(
  shotId: string,
  file: File,
  type: "music" | "sfx",
  accessToken: string,
  label?: string,
  startTime?: number,
  endTime?: number,
  fadeIn?: number,
  fadeOut?: number,
): Promise<ShotAudio> {
  console.log(`[Shots API] Uploading audio to scriptony-audio function:`, {
    shotId,
    fileName: file.name,
    type,
  });

  const base64 = await fileToBase64(file);

  const response = await fetch(
    `${AUDIO_API_BASE}/shots/${shotId}/upload-audio`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileBase64: base64,
        fileName: file.name,
        mimeType: file.type,
        type,
        ...(label !== undefined && { label }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(fadeIn !== undefined && { fadeIn }),
        ...(fadeOut !== undefined && { fadeOut }),
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Shots API] Audio upload failed:`, {
      status: response.status,
      errorText,
    });
    throw new Error(`Failed to upload audio: ${response.statusText}`);
  }

  const { audio } = await response.json();
  console.log(`[Shots API] Audio uploaded successfully:`, audio);
  return audio;
}

export async function updateShotAudio(
  audioId: string,
  updates: {
    label?: string;
    startTime?: number;
    endTime?: number;
    fadeIn?: number;
    fadeOut?: number;
  },
  accessToken: string,
): Promise<ShotAudio> {
  console.log(`[Shots API] Updating audio via scriptony-audio:`, {
    audioId,
    updates,
  });

  const response = await fetch(`${AUDIO_API_BASE}/shots/audio/${audioId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Shots API] Audio update failed:`, {
      status: response.status,
      errorText,
    });
    throw new Error(`Failed to update audio: ${response.statusText}`);
  }

  const { audio } = await response.json();
  console.log(`[Shots API] Audio updated successfully:`, audio);
  return audio;
}

export async function deleteShotAudio(
  audioId: string,
  accessToken: string,
): Promise<void> {
  console.log(`[Shots API] Deleting audio via scriptony-audio:`, { audioId });

  const response = await fetch(`${AUDIO_API_BASE}/shots/audio/${audioId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Shots API] Audio deletion failed:`, {
      status: response.status,
      errorText,
    });
    throw new Error(`Failed to delete audio: ${response.statusText}`);
  }

  console.log(`[Shots API] Audio deleted successfully`);
}

export async function getShotAudio(
  shotId: string,
  accessToken: string,
): Promise<ShotAudio[]> {
  console.log(`[Shots API] Getting audio for shot via scriptony-audio:`, {
    shotId,
  });

  const response = await fetch(`${AUDIO_API_BASE}/shots/${shotId}/audio`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Shots API] Get shot audio failed:`, {
      status: response.status,
      errorText,
    });
    throw new Error(`Failed to get shot audio: ${response.statusText}`);
  }

  const { audio } = await response.json();
  console.log(`[Shots API] Got ${audio?.length || 0} audio files for shot`);
  return audio || [];
}

/**
 * BATCH: Get audio for multiple shots in one request
 * This is much more efficient than calling getShotAudio() for each shot individually
 */
export async function getBatchShotAudio(
  shotIds: string[],
  accessToken: string,
): Promise<Record<string, ShotAudio[]>> {
  if (shotIds.length === 0) {
    return {};
  }

  console.log(`[Shots API] BATCH: Getting audio for ${shotIds.length} shots`);

  const response = await fetch(
    `${AUDIO_API_BASE}/shots/audio/batch?shot_ids=${shotIds.join(",")}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Shots API] Batch audio fetch failed:`, {
      status: response.status,
      errorText,
    });
    throw new Error(`Failed to get batch audio: ${response.statusText}`);
  }

  const { audio } = await response.json();
  console.log(
    `[Shots API] BATCH: Got audio for ${Object.keys(audio).length} shots`,
  );
  return audio;
}

// =============================================================================
// CHARACTER MANAGEMENT
// =============================================================================

export async function addCharacterToShot(
  shotId: string,
  characterId: string,
  accessToken: string,
): Promise<{
  id: string;
  projectId: string;
  sceneId: string;
  characters: any[];
}> {
  const response = await fetch(`${SHOTS_API_BASE}/shots/${shotId}/characters`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      character_id: characterId,
    }),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: response.statusText }));
    console.error("[Shots API] Error adding character to shot:", errorData);
    throw new Error(
      `Failed to add character to shot: ${errorData.error || response.statusText}`,
    );
  }

  const { shot } = await response.json();
  return shot;
}

export async function removeCharacterFromShot(
  shotId: string,
  characterId: string,
  accessToken: string,
): Promise<void> {
  const response = await fetch(
    `${SHOTS_API_BASE}/shots/${shotId}/characters/${characterId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to remove character from shot: ${response.statusText}`,
    );
  }
}

// =============================================================================
// BULK LOADERS - Performance Optimized 🚀
// =============================================================================

// =============================================================================
// PROJECT INITIALIZATION
// =============================================================================

/**
 * One in-flight init chain per project. Call only from explicit flows (e.g. user
 * button in FilmDropdown, script import / persist, optional new-project script path).
 * Loaders and prefetch must not call this — avoids duplicate parallel inits.
 */
const threeActInitTailByProject = new Map<string, Promise<unknown>>();

/**
 * Initialize top-level timeline nodes from project `narrative_structure` (V2 initialize-project).
 * Throws if the structure is not mapped — callers must check mapping first for UX.
 */
export async function initializeTimelineStructureFromNarrative(
  projectId: string,
  accessToken: string,
  narrativeStructure: string | null | undefined,
): Promise<any> {
  const body = narrativeStructureToInitializeProjectPayload(narrativeStructure);
  if (!body) {
    throw new Error("NARRATIVE_INIT_UNSUPPORTED");
  }

  const queuedAfter =
    threeActInitTailByProject.get(projectId) ?? Promise.resolve();

  const run = queuedAfter.then(async () => {
    const acts = await getActs(projectId, accessToken);
    if (acts && acts.length > 0) {
      return { nodes: acts };
    }

    const nodes = await initializeProject({
      projectId,
      ...body,
    });

    return { nodes };
  });

  threeActInitTailByProject.set(
    projectId,
    run.catch(() => undefined),
  );

  return run;
}

/**
 * Backwards-compatible alias: classic 3-act film acts (same as `narrative_structure` `3-act`).
 */
export async function initializeThreeActStructure(
  projectId: string,
  accessToken: string,
): Promise<any> {
  return initializeTimelineStructureFromNarrative(
    projectId,
    accessToken,
    "3-act",
  );
}
