/**
 * Audio clip routes — thin router (CRUD + ripple).
 */

import type { RequestLike, ResponseLike } from "../../_shared/http";
import { getParam, sendMethodNotAllowed } from "../../_shared/http";
import {
  createClip,
  deleteClip,
  getClip,
  listClips,
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

  if (method === "GET" && !id) return listClips(req, res);
  if (method === "GET" && id) return getClip(req, res);
  if (method === "POST") return createClip(req, res);
  if (method === "PUT" && id) return updateClip(req, res);
  if (method === "DELETE" && id) return deleteClip(req, res);

  sendMethodNotAllowed(res, ["GET", "POST", "PUT", "DELETE"]);
}
