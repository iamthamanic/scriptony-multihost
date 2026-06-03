/**
 * Audio clip CRUD handlers (list, create, get, update, delete).
 */

import type { RequestLike, ResponseLike } from "../../_shared/http";
import { requireUserBootstrap } from "../../_shared/auth";
import {
  getQuery,
  getParam,
  readJsonBody,
  sendJson,
  sendBadRequest,
  sendUnauthorized,
  sendServerError,
  sendNotFound,
  sendForbidden,
} from "../../_shared/http";
import { requestGraphql } from "../../_shared/graphql-compat";
import { canEditProject, canReadProject } from "../_shared/access";
import { ClipInputSchema } from "./clips-schemas";
import { getClipProjectId, sanitizeClipInput } from "./clips-helpers";

export async function listClips(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const sceneId = getQuery(req, "sceneId") || getParam(req, "sceneId");
  if (!sceneId) {
    sendBadRequest(res, "sceneId is required");
    return;
  }

  try {
    const data = await requestGraphql<{
      audio_clips: Array<Record<string, unknown>>;
    }>(
      `
			query GetAudioClips($sceneId: uuid!) {
				audio_clips(
					where: { scene_id: { _eq: $sceneId } }
					order_by: [{ lane_index: asc }, { order_index: asc }]
				) {
					id
					track_id
					scene_id
					project_id
					start_sec
					end_sec
					lane_index
					order_index
					audio_file_id
					waveform_data
					cross_scene
					fx_preset_id
					track_type
					content
					character_id
					created_at
					updated_at
				}
			}
			`,
      { sceneId },
    );

    const clips = data.audio_clips ?? [];
    if (clips.length > 0) {
      const projectId = (clips[0]?.project_id as string) || "";
      if (projectId && !(await canReadProject(bootstrap.user.id, projectId))) {
        sendForbidden(res);
        return;
      }
    }

    sendJson(res, 200, { clips });
  } catch (error) {
    console.error("[Audio Story] Error fetching clips:", error);
    sendServerError(res, "Failed to fetch audio clips");
  }
}

export async function listClipsByProject(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const projectId =
    getQuery(req, "projectId") ||
    getQuery(req, "project_id") ||
    getParam(req, "projectId") ||
    getParam(req, "project_id");
  if (!projectId) {
    sendBadRequest(res, "projectId is required");
    return;
  }

  try {
    const data = await requestGraphql<{
      audio_clips: Array<Record<string, unknown>>;
    }>(
      `
			query GetAudioClipsByProject($projectId: uuid!) {
				audio_clips(
					where: { project_id: { _eq: $projectId } }
					order_by: [{ lane_index: asc }, { order_index: asc }]
				) {
					id
					track_id
					scene_id
					project_id
					start_sec
					end_sec
					lane_index
					order_index
					audio_file_id
					waveform_data
					cross_scene
					fx_preset_id
					track_type
					content
					character_id
					created_at
					updated_at
				}
			}
			`,
      { projectId },
    );

    const clips = data.audio_clips ?? [];
    if (clips.length > 0) {
      const firstProjectId = (clips[0]?.project_id as string) || "";
      if (
        firstProjectId &&
        !(await canReadProject(bootstrap.user.id, firstProjectId))
      ) {
        sendForbidden(res);
        return;
      }
    }

    sendJson(res, 200, { clips });
  } catch (error) {
    console.error("[Audio Story] Error fetching clips by project:", error);
    sendServerError(res, "Failed to fetch audio clips");
  }
}

export async function createClip(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const body = await readJsonBody<Record<string, unknown>>(req);
  const parseResult = ClipInputSchema.safeParse(body);
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    sendBadRequest(
      res,
      `Invalid input: ${firstIssue?.path.join(".")} — ${firstIssue?.message}`,
    );
    return;
  }

  const { project_id: projectId } = parseResult.data;

  if (!(await canEditProject(bootstrap.user.id, projectId))) {
    sendUnauthorized(res);
    return;
  }

  try {
    const data = await requestGraphql<{
      insert_audio_clips_one: Record<string, unknown>;
    }>(
      `
			mutation CreateAudioClip($object: audio_clips_insert_input!) {
				insert_audio_clips_one(object: $object) {
					id
					track_id
					scene_id
					project_id
					start_sec
					end_sec
					lane_index
					order_index
					created_at
					updated_at
				}
			}
			`,
      { object: parseResult.data },
    );

    sendJson(res, 201, { clip: data.insert_audio_clips_one });
  } catch (error) {
    console.error("[Audio Story] Error creating clip:", error);
    sendServerError(res, "Failed to create audio clip");
  }
}

export async function getClip(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const clipId = getParam(req, "id");
  if (!clipId) {
    sendBadRequest(res, "clip id is required");
    return;
  }

  const projectId = await getClipProjectId(clipId);
  if (!projectId) {
    sendNotFound(res, "Audio clip not found");
    return;
  }
  if (!(await canReadProject(bootstrap.user.id, projectId))) {
    sendForbidden(res);
    return;
  }

  try {
    const data = await requestGraphql<{
      audio_clips_by_pk: Record<string, unknown> | null;
    }>(
      `
			query GetAudioClip($id: uuid!) {
				audio_clips_by_pk(id: $id) {
					id
					track_id
					scene_id
					project_id
					start_sec
					end_sec
					lane_index
					order_index
					audio_file_id
					waveform_data
					cross_scene
					fx_preset_id
					track_type
					content
					character_id
					created_at
					updated_at
				}
			}
			`,
      { id: clipId },
    );

    if (!data.audio_clips_by_pk) {
      sendNotFound(res, "Audio clip not found");
      return;
    }

    sendJson(res, 200, { clip: data.audio_clips_by_pk });
  } catch (error) {
    console.error("[Audio Story] Error fetching clip:", error);
    sendServerError(res, "Failed to fetch audio clip");
  }
}

export async function updateClip(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const clipId = getParam(req, "id");
  if (!clipId) {
    sendBadRequest(res, "clip id is required");
    return;
  }

  const projectId = await getClipProjectId(clipId);
  if (!projectId) {
    sendNotFound(res, "Audio clip not found");
    return;
  }
  if (!(await canEditProject(bootstrap.user.id, projectId))) {
    sendForbidden(res);
    return;
  }

  const body = await readJsonBody<Record<string, unknown>>(req);
  const updates = sanitizeClipInput(body);
  if (Object.keys(updates).length === 0) {
    sendBadRequest(res, "No valid fields to update");
    return;
  }

  try {
    const data = await requestGraphql<{
      update_audio_clips_by_pk: Record<string, unknown>;
    }>(
      `
			mutation UpdateAudioClip($id: uuid!, $set: audio_clips_set_input!) {
				update_audio_clips_by_pk(pk_columns: { id: $id }, _set: $set) {
					id
					track_id
					scene_id
					project_id
					start_sec
					end_sec
					lane_index
					order_index
					updated_at
				}
			}
			`,
      { id: clipId, set: updates },
    );

    sendJson(res, 200, { clip: data.update_audio_clips_by_pk });
  } catch (error) {
    console.error("[Audio Story] Error updating clip:", error);
    sendServerError(res, "Failed to update audio clip");
  }
}

export async function deleteClip(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const clipId = getParam(req, "id");
  if (!clipId) {
    sendBadRequest(res, "clip id is required");
    return;
  }

  const projectId = await getClipProjectId(clipId);
  if (!projectId) {
    sendNotFound(res, "Audio clip not found");
    return;
  }
  if (!(await canEditProject(bootstrap.user.id, projectId))) {
    sendForbidden(res);
    return;
  }

  try {
    await requestGraphql<{ delete_audio_clips_by_pk: { id: string } }>(
      `
			mutation DeleteAudioClip($id: uuid!) {
				delete_audio_clips_by_pk(id: $id) {
					id
				}
			}
			`,
      { id: clipId },
    );

    sendJson(res, 200, { deleted: true, id: clipId });
  } catch (error) {
    console.error("[Audio Story] Error deleting clip:", error);
    sendServerError(res, "Failed to delete audio clip");
  }
}
