/**
 * @deprecated T17 LEGACY_DO_NOT_EXTEND — Nicht in build-appwrite-deploy.mjs registriert.
 *          Nicht deployed. Keine Frontend-Aufrufer. Keine Execution-Logs.
 *          Verbleibt als Archiv bis zur vollstaendigen T17-Entfernung.
 *          Ersatz: scriptony-projects (project listing), Appwrite Console (migrations).
 */

import {
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendMethodNotAllowed,
} from "../_shared/http";

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  if (req.method !== "GET") {
    sendMethodNotAllowed(res, ["GET"]);
    return;
  }

  sendJson(res, 200, {
    status: "ok",
    service: "make-server-3b52693b",
    provider: "appwrite",
    message:
      "Legacy main-server routes; data plane is Appwrite-backed Scriptony functions.",
    timestamp: new Date().toISOString(),
  });
}
