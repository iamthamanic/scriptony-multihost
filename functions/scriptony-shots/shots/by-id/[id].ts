/**
 * Direct shot lookup route for the Scriptony HTTP API.
 *
 * T13 TIMELINE DOMAIN: Shot-CRUD.
 */

import { requireUserBootstrap } from "../../../_shared/auth";
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
} from "../../../_shared/http";
import {
  getAccessibleProject,
  getUserOrganizationIds,
} from "../../../_shared/scriptony";
import { getShotById, mapShot } from "../../../_shared/timeline";

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

    if (req.method !== "GET") {
      sendMethodNotAllowed(res, ["GET"]);
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

    sendJson(res, 200, { shot: mapShot(shot) });
  } catch (error) {
    sendServerError(res, error);
  }
}
