/**
 * Audio clip routes — thin router (CRUD + ripple).
 */

import type { RequestLike, ResponseLike } from "../../_shared/http";
import {
  getParam,
  getQuery,
  sendBadRequest,
  sendMethodNotAllowed,
} from "../../_shared/http";
import {
  createClip,
  deleteClip,
  getClip,
  listClips,
  listClipsByProject,
  updateClip,
} from "./clips-crud";
import { rippleClipUpdates } from "./clips-ripple";

export default async function clipsRoutes(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const method = req.method?.toUpperCase() || "GET";
  const id = getParam(req, "id");
  const pathname = (req.path || req.url || "/") as string;

  if (method === "POST" && pathname.includes("/ripple")) {
    await rippleClipUpdates(req, res);
    return;
  }

  if (method === "GET" && !id) {
    const sceneId = getQuery(req, "sceneId") || getParam(req, "sceneId");
    const projectId =
      getQuery(req, "projectId") ||
      getQuery(req, "project_id") ||
      getParam(req, "projectId") ||
      getParam(req, "project_id");
    if (sceneId) {
      return listClips(req, res);
    }
    if (projectId) {
      return listClipsByProject(req, res);
    }
    sendBadRequest(res, "sceneId or projectId is required");
    return;
  }
  if (method === "GET" && id) return getClip(req, res);
  if (method === "POST") return createClip(req, res);
  if (method === "PUT" && id) return updateClip(req, res);
  if (method === "DELETE" && id) return deleteClip(req, res);

  sendMethodNotAllowed(res, ["GET", "POST", "PUT", "DELETE"]);
}
