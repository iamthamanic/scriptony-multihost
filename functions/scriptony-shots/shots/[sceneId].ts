/**
 * Scene-scoped shot routes for the Scriptony HTTP API.
 *
 * T13 TIMELINE DOMAIN: Shot-CRUD und Reorder.
 *   Neue Timeline-Features nur mit expliziter Zielentscheidung.
 *   Siehe docs/timeline-domain-decision.md
 */

import { z } from "zod";
import { requireUserBootstrap } from "../../_shared/auth";
import {
  getParam,
  getQuery,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
} from "../../_shared/http";
import {
  getAccessibleProject,
  getUserOrganizationIds,
} from "../../_shared/scriptony";
import { getShots, mapShot, getNodeById } from "../../_shared/timeline";

const sceneIdSchema = z.string().min(1).max(128);

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

    const rawSceneId = getParam(req, "sceneId");
    const parsedSceneId = sceneIdSchema.safeParse(rawSceneId);
    if (!parsedSceneId.success) {
      sendBadRequest(res, "sceneId is required");
      return;
    }
    const sceneId = parsedSceneId.data;

    // Resolve scene to project via timeline_nodes (avoids requiring project_id query param).
    const sceneNode = await getNodeById(sceneId);
    if (!sceneNode) {
      sendNotFound(res, "Scene not found");
      return;
    }
    const projectId = String(sceneNode.project_id || "");
    if (!projectId) {
      sendBadRequest(res, "Scene has no project_id");
      return;
    }

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

    const shots = await getShots({ sceneId });

    // Defense-in-depth: optional project_id query param must match inferred project.
    const explicitProjectId =
      getQuery(req, "project_id") || getQuery(req, "projectId");
    if (explicitProjectId && explicitProjectId !== projectId) {
      sendJson(res, 403, { error: "Project not found or access denied" });
      return;
    }

    sendJson(res, 200, { shots: shots.map(mapShot) });
  } catch (error) {
    sendServerError(res, error);
  }
}
