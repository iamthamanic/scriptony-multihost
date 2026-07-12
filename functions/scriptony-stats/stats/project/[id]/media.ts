/**
 * T16 — Project media analytics (legacy Next.js API Route).
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

import { requireUserBootstrap } from "../../../../_shared/auth";
import { requestGraphql } from "../../../../_shared/graphql-compat";
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
import { getProjectStatsPayload } from "../../../../_shared/observability";
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

    const [payload, audioCount] = await Promise.all([
      getProjectStatsPayload(projectId),
      requestGraphql<{
        shot_audio_aggregate: { aggregate: { count: number } | null };
      }>(
        `
          query GetProjectAudioCount($projectId: uuid!) {
            shot_audio_aggregate(where: { shot: { project_id: { _eq: $projectId } } }) {
              aggregate {
                count
              }
            }
          }
        `,
        { projectId },
      ),
    ]);

    const images = payload.shots.filter(
      (shot) => shot.image_url || shot.storyboard_url,
    ).length;

    sendJson(res, 200, {
      audio_files: audioCount.shot_audio_aggregate.aggregate?.count || 0,
      images,
      total_storage: "N/A",
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
