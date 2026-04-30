/**
 * Shot character removal routes for the Scriptony HTTP API.
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
import { getShotById } from "../../../../_shared/timeline";

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

    if (req.method !== "DELETE") {
      sendMethodNotAllowed(res, ["DELETE"]);
      return;
    }

    const shotId = getParam(req, "id");
    const characterId = getParam(req, "characterId");
    if (!shotId || !characterId) {
      sendBadRequest(res, "id and characterId are required");
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

    await requestGraphql(
      `
        mutation RemoveShotCharacter($shotId: uuid!, $characterId: uuid!) {
          delete_shot_characters_by_pk(
            shot_id: $shotId
            character_id: $characterId
          ) {
            shot_id
          }
        }
      `,
      { shotId, characterId },
    );

    sendJson(res, 200, { success: true });
  } catch (error) {
    sendServerError(res, error);
  }
}
