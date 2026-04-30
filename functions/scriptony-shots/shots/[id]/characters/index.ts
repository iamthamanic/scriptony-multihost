/**
 * Shot character assignment routes for the Scriptony HTTP API.
 *
 * @deprecated LEGACY — Character management belongs to scriptony-characters.
 *   This route is frozen; do not extend. Use scriptony-characters endpoints
 *   for new features.
 */

import { requireUserBootstrap } from "../../../../_shared/auth";
import { requestGraphql } from "../../../../_shared/graphql-compat";
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
} from "../../../../_shared/http";
import {
  getAccessibleProject,
  getUserOrganizationIds,
} from "../../../../_shared/scriptony";
import { getShotById, mapShot } from "../../../../_shared/timeline";

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

    if (req.method !== "POST") {
      sendMethodNotAllowed(res, ["POST"]);
      return;
    }

    const shotId = getParam(req, "id");
    if (!shotId) {
      sendBadRequest(res, "id is required");
      return;
    }

    const shot = await getShotById(shotId);
    if (!shot) {
      sendNotFound(res, "Shot not found");
      return;
    }

    const projectId = String(shot.project_id || "");
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

    const body = await readJsonBody<{
      character_id?: string;
      characterId?: string;
    }>(req);
    const characterId = body.character_id ?? body.characterId;
    if (!characterId) {
      sendBadRequest(res, "character_id is required");
      return;
    }

    await requestGraphql(
      `
        mutation AddShotCharacter($shotId: uuid!, $characterId: uuid!) {
          insert_shot_characters_one(
            object: { shot_id: $shotId, character_id: $characterId }
            on_conflict: {
              constraint: shot_characters_pkey
              update_columns: [character_id]
            }
          ) {
            shot_id
          }
        }
      `,
      { shotId, characterId },
    );

    const updated = await getShotById(shotId);
    sendJson(res, 200, {
      shot: updated ? mapShot(updated) : { id: shotId, characters: [] },
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
