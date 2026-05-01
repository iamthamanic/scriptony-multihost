/**
 * @deprecated T17 — Unwired old entrypoint. Aktiver Entrypoint ist appwrite-entry.ts.
 *          Nicht in build-appwrite-deploy.mjs registriert. Nicht deployed.
 *          Verbleibt als Archiv-Referenz bis zur vollstaendigen Entfernung.
 */

import { createAppwriteHandler } from "../_shared/appwrite-handler";
import { type RequestLike, type ResponseLike, sendJson } from "../_shared/http";

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  sendJson(res, 410, {
    status: "gone",
    message: "scriptony-auth/index.ts ist deprecated. Nutze appwrite-entry.ts.",
    timestamp: new Date().toISOString(),
  });
}

export default createAppwriteHandler(dispatch);
