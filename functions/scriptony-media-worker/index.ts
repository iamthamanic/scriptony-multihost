/**
 * T15 scriptony-media-worker — Worker-Grenze für schwere Medienjobs.
 *
 * SOLID/SRP: Validiert Payload, erstellt Job, gibt sofort jobId zurück.
 * Keine Medienverarbeitung (FFmpeg, Mixing, Rendering) im eigenen Prozess.
 *
 * Langfristig: Externer Container/Queue-Worker holt Jobs aus der
 * jobs-Collection und führt die Arbeit aus.
 *
 * Endpoints:
 *   POST /v1/worker/media/:action   — Job erstellen (202 + jobId)
 *   GET  /health                      — Health check
 */

import { createAppwriteHandler } from "../_shared/appwrite-handler";
import {
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendNotFound,
  sendServerError,
} from "../_shared/http";
import { SUPPORTED_MEDIA_ACTIONS } from "./config/supported-actions";
import { handleDispatch } from "./handlers/dispatch";

const HEALTH_DATA = {
  status: "ok",
  service: "scriptony-media-worker",
  version: "1.0.0",
  supported_actions: Object.keys(SUPPORTED_MEDIA_ACTIONS),
};

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  const pathname =
    (typeof req?.path === "string" && req.path) ||
    (typeof req?.url === "string"
      ? new URL(req.url, "http://localhost").pathname
      : "/");

  if (pathname === "/" || pathname === "/health") {
    sendJson(res, 200, HEALTH_DATA);
    return;
  }

  try {
    // POST /v1/worker/media/:action
    // Validation happens inside handleDispatch (single source of truth).
    const actionMatch = pathname.match(/^\/v1\/worker\/media\/([^/]+)$/);
    if (actionMatch && req.method === "POST") {
      await handleDispatch(req, res, actionMatch[1]);
      return;
    }

    sendNotFound(res, `Route not found: ${pathname}`);
  } catch (e) {
    sendServerError(res, e);
  }
}

export default createAppwriteHandler(dispatch);
