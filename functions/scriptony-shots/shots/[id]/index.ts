/**
 * Shot item routes for the Scriptony HTTP API.
 *
 * T13 TIMELINE DOMAIN: Shot-CRUD (GET / PUT / DELETE single shot).
 *   Neue Timeline-Features nur mit expliziter Zielentscheidung.
 *   Legacy: Character-Audio-Routen sind Asset/Audio-Domain, nicht hier.
 *   Siehe docs/timeline-domain-decision.md
 */

import { Query } from "node-appwrite";
import { z } from "zod";
import {
  C,
  deleteDocument,
  listDocumentsFull,
} from "../../../_shared/appwrite-db";
import { requireUserBootstrap } from "../../../_shared/auth";
import { requestGraphql } from "../../../_shared/graphql-compat";
import {
  getParam,
  type RequestLike,
  type ResponseLike,
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
} from "../../../_shared/http";
import {
  getAccessibleProject,
  getUserOrganizationIds,
} from "../../../_shared/scriptony";
import {
  getShotById,
  mapShot,
  normalizeShotInput,
} from "../../../_shared/timeline";

const shotIdSchema = z.string().min(1).max(128);

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    const rawShotId = getParam(req, "id");
    const parsedShotId = shotIdSchema.safeParse(rawShotId);
    if (!parsedShotId.success) {
      sendBadRequest(res, "id is required");
      return;
    }
    const shotId = parsedShotId.data;

    const row = await getShotById(shotId);
    if (!row) {
      sendNotFound(res, "Shot not found");
      return;
    }

    const projectId = String(row.project_id || "");
    const organizationIds = await getUserOrganizationIds(bootstrap.user.id);
    const project = await getAccessibleProject(
      projectId,
      bootstrap.user.id,
      organizationIds,
    );
    if (!project) {
      sendJson(res, 403, { error: "Project not found or access denied" });
      return;
    }

    if (req.method === "GET") {
      sendJson(res, 200, { shot: mapShot(row) });
      return;
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      const body = await readJsonBody<Record<string, any>>(req);
      const updates = normalizeShotInput(body);
      delete updates.scene_id;
      delete updates.project_id;
      delete updates.user_id;
      delete updates.shot_number;

      const updated = await requestGraphql<{
        update_shots_by_pk: Record<string, any> | null;
      }>(
        `
          mutation UpdateShot($id: uuid!, $changes: shots_set_input!) {
            update_shots_by_pk(pk_columns: { id: $id }, _set: $changes) {
              id
              scene_id
              project_id
              shot_number
              description
              camera_angle
              camera_movement
              framing
              lens
              duration
              shotlength_minutes
              shotlength_seconds
              composition
              lighting_notes
              image_url
              stage2d_file_id
              stage3d_file_id
              shot_image_mime
              sound_notes
              storyboard_url
              reference_image_url
              dialog
              notes
              order_index
              user_id
              created_at
              updated_at
              shot_characters {
                character {
                  id
                  project_id
                  world_id
                  organization_id
                  name
                  role
                  description
                  image_url
                  avatar_url
                  backstory
                  personality
                  color
                  created_at
                  updated_at
                }
              }
              shot_audio(order_by: { created_at: asc }) {
                id
                shot_id
                type
                file_url
                file_name
                label
                file_size
                start_time
                end_time
                fade_in
                fade_out
                waveform_data
                duration
                created_at
              }
            }
          }
        `,
        {
          id: shotId,
          changes: {
            // Keep only schema-safe keys for Appwrite collection `shots`.
            ...(updates.title !== undefined ? { title: updates.title } : {}),
            ...(updates.description !== undefined
              ? { description: updates.description }
              : {}),
            ...(updates.image_url !== undefined
              ? { image_url: updates.image_url }
              : {}),
            ...(updates.storyboard_url !== undefined
              ? { storyboard_url: updates.storyboard_url }
              : {}),
            ...(updates.dialog !== undefined ? { dialog: updates.dialog } : {}),
            ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
            ...(updates.order_index !== undefined
              ? { order_index: updates.order_index }
              : {}),
            ...(updates.duration !== undefined && updates.duration !== null
              ? { duration: updates.duration }
              : {}),
            ...(updates.shotlength_minutes !== undefined &&
            updates.shotlength_minutes !== null
              ? { shotlength_minutes: updates.shotlength_minutes }
              : {}),
            ...(updates.shotlength_seconds !== undefined &&
            updates.shotlength_seconds !== null
              ? { shotlength_seconds: updates.shotlength_seconds }
              : {}),
            ...(updates.stage2d_file_id !== undefined
              ? { stage2d_file_id: updates.stage2d_file_id }
              : {}),
            ...(updates.stage3d_file_id !== undefined
              ? { stage3d_file_id: updates.stage3d_file_id }
              : {}),
            ...(updates.shot_image_mime !== undefined
              ? { shot_image_mime: updates.shot_image_mime }
              : {}),
            user_id: bootstrap.user.id,
          },
        },
      );

      sendJson(res, 200, {
        shot: mapShot(updated.update_shots_by_pk || row),
      });
      return;
    }

    if (req.method === "DELETE") {
      // PHASE1: cascade-delete editorial clips for this shot (Appwrite `clips` collection).
      const clipRows = await listDocumentsFull(C.clips, [
        Query.equal("shot_id", shotId),
      ]);
      for (const c of clipRows) {
        if (c?.id) await deleteDocument(C.clips, String(c.id));
      }

      await requestGraphql(
        `
          mutation DeleteShot($id: uuid!) {
            delete_shots_by_pk(id: $id) {
              id
            }
          }
        `,
        { id: shotId },
      );

      sendJson(res, 200, { success: true });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "PUT", "PATCH", "DELETE"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
