/**
 * T16 — Detailed node stats (legacy Next.js API Route).
 *
 * Ziel: `scriptony-observability` (Appwrite Function).
 * Status: read-only. Keine Business Writes.
 * Aggregation: read-only. Nutzt _shared/observability.ts (multi-Collection).
 * T18: Fachliche Aggregation wird in Ziel-Function extrahiert.
 * Security: BROKEN — Kein Node-Zugriffscheck. Jeder authentifizierte User kann Daten
 *          zu jedem Node abfragen, wenn er die nodeId kennt. Node-Scope erfordert
 *          Projekt-Auflösung + `requireProjectAccess`. Fix in T18-Ziel-Function.
 * @deprecated T16 BROKEN — Wird in `scriptony-observability` konsolidiert.
 * Neue Stats-Features duerfen hier nicht ergaenzt werden.
 */

import { requireUserBootstrap } from "../../../../_shared/auth";
import {
  getParam,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
  sendUnauthorized,
} from "../../../../_shared/http";

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

    const nodeType = getParam(req, "nodeType");
    const id = getParam(req, "id");
    if (!nodeType || !id) {
      sendBadRequest(res, "nodeType and id are required");
      return;
    }

    sendJson(res, 200, {
      timeline_analytics: [],
      character_analytics: [],
      media_analytics: { audio: 0, images: 0 },
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
