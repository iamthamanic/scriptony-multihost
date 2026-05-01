/**
 * T16 — Project shot analytics (legacy Next.js API Route).
 *
 * Ziel: `scriptony-observability` (Appwrite Function).
 * Status: read-only. Keine Business Writes.
 * Aggregation: read-only. Nutzt _shared/observability.ts (multi-Collection).
 * T18: Fachliche Aggregation wird in Ziel-Function extrahiert.
 * Komplexe Cross-Project-Billing-Stats: future/separates System (out-of-scope).
 *
 * @deprecated T16 — Wird in `scriptony-observability` konsolidiert.
 * Neue Stats-Features duerfen hier nicht ergaenzt werden.
 */

import { requireUserBootstrap } from "../../../../../_shared/auth";
import {
  getParam,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
  sendUnauthorized,
} from "../../../../../_shared/http";
import {
  countBy,
  getProjectStatsPayload,
  toDurationSeconds,
} from "../../../../../_shared/observability";
import { requireProjectAccess } from "../../../../../_shared/scriptony";

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

    const payload = await getProjectStatsPayload(projectId);
    const durations = payload.shots
      .map(toDurationSeconds)
      .filter((value) => value > 0);
    const durationStats = durations.length
      ? {
          average: Math.round(
            durations.reduce((sum, value) => sum + value, 0) / durations.length,
          ),
          min: Math.min(...durations),
          max: Math.max(...durations),
          total: durations.reduce((sum, value) => sum + value, 0),
        }
      : { average: 0, min: 0, max: 0, total: 0 };

    sendJson(res, 200, {
      total_shots: payload.shots.length,
      duration_stats: durationStats,
      camera_angles: countBy(payload.shots, "camera_angle", "Not Set"),
      framings: countBy(payload.shots, "framing", "Not Set"),
      lenses: countBy(payload.shots, "lens", "Not Set"),
      movements: countBy(payload.shots, "camera_movement", "Static"),
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
