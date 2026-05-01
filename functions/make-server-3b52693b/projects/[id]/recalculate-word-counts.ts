/**
 * @deprecated T17 LEGACY_DO_NOT_EXTEND — Nicht in build-appwrite-deploy.mjs registriert.
 *          Nicht deployed. Keine Frontend-Aufrufer. Keine Execution-Logs.
 *          Verbleibt als Archiv bis zur vollstaendigen T17-Entfernung.
 *          Ersatz: scriptony-projects (project listing), Appwrite Console (migrations).
 */

import {
  getParam,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
} from "../../../_shared/http";

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }

  const projectId = getParam(req, "id");
  if (!projectId) {
    sendBadRequest(res, "Project ID is required");
    return;
  }

  sendJson(res, 200, {
    success: true,
    updated: 0,
    projectId,
    note: "Word-count recalculation has not been ported to the Appwrite-backed stack yet.",
  });
}
