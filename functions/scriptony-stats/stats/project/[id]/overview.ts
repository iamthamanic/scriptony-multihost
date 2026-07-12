/**
 * T16 — Project overview stats (legacy Next.js API Route).
 *
 * Ziel: `scriptony-observability` (Appwrite Function).
 * Status: read-only. Keine Business Writes.
 * Aggregation: read-only. Nutzt `getProjectStatsPayload` (5 Collections).
 * T18: Fachliche Aggregation wird in `scriptony-observability` extrahiert.
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
  toDurationSeconds,
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

    const payload = await getProjectStatsPayload(projectId);
    const totalDuration = payload.shots.reduce(
      (sum, shot) => sum + toDurationSeconds(shot),
      0,
    );

    sendJson(res, 200, {
      timeline: {
        acts: payload.nodes.filter((node) => node.level === 1).length,
        sequences: payload.nodes.filter((node) => node.level === 2).length,
        scenes: payload.nodes.filter((node) => node.level === 3).length,
        shots: payload.shots.length,
        total_duration: totalDuration,
      },
      content: {
        characters: payload.characters.length,
        worlds: payload.worlds.length,
      },
      metadata: {
        type: payload.project?.type || "film",
        genre: payload.project?.genre || null,
        created_at: payload.project?.created_at || null,
        updated_at: payload.project?.updated_at || null,
      },
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
