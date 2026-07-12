/**
 * @deprecated T17 LEGACY_DO_NOT_EXTEND — Nicht in build-appwrite-deploy.mjs registriert.
 *          Nicht deployed. Keine Frontend-Aufrufer. Keine Execution-Logs.
 *          Verbleibt als Archiv bis zur vollstaendigen T17-Entfernung.
 *          Ersatz: scriptony-projects (project listing), Appwrite Console (migrations).
 */

import {
  type RequestLike,
  type ResponseLike,
  sendMethodNotAllowed,
  sendNotImplemented,
} from "../_shared/http";

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }

  sendNotImplemented(
    res,
    "KV-to-Postgres migration is obsolete. Use Appwrite schema changes or your own migration tooling, not this endpoint.",
  );
}
