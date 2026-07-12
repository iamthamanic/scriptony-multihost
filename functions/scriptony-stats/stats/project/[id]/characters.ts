/**
 * T16 — Project character analytics route (legacy Next.js API Route).
 *
 * Ziel: `scriptony-observability` (Appwrite Function).
 * Status: read-only. Keine Business Writes.
 * Aggregation: max 2 Collections (shots + shot_characters).
 * Komplexe Cross-Project-Billing-Stats: future/separates System (out-of-scope).
 *
 * @deprecated T16 — Wird in `scriptony-observability` konsolidiert.
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
import {
  getProjectStatsPayload,
  getShotCharacterCounts,
} from "../../../../_shared/observability";
import { requireProjectAccess } from "../../../../_shared/scriptony";

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

    const projectId = getParam(req, "id");
    if (!projectId) {
      sendBadRequest(res, "id is required");
      return;
    }

    const project = await requireProjectAccess(
      projectId,
      bootstrap.user.id,
      res,
    );
    if (!project) return;

    const [payload, appearances] = await Promise.all([
      getProjectStatsPayload(projectId),
      getShotCharacterCounts(projectId),
    ]);

    sendJson(res, 200, {
      total_characters: payload.characters.length,
      appearances,
      most_featured: appearances[0] || null,
      least_featured: appearances.length
        ? appearances[appearances.length - 1]
        : null,
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
