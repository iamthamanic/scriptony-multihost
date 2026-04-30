/**
 * Shot reorder route for the Scriptony HTTP API.
 *
 * T13 TIMELINE DOMAIN: Shot-Reihenfolge.
 *   Neue Timeline-Features nur mit expliziter Zielentscheidung.
 *   Legacy: Character-Audio-Routen sind Asset/Audio-Domain, nicht hier.
 *   Siehe docs/timeline-domain-decision.md
 */

import { z } from "zod";
import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
  type RequestLike,
  type ResponseLike,
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
} from "../../_shared/http";
import {
  getAccessibleProject,
  getUserOrganizationIds,
} from "../../_shared/scriptony";
import { getProjectIdFromShot, getShotById } from "../../_shared/timeline";

const reorderSchema = z.object({
  shot_ids: z.array(z.string().min(1)).max(500).optional(),
  shotIds: z.array(z.string().min(1)).max(500).optional(),
});

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

    if (req.method !== "POST") {
      sendMethodNotAllowed(res, ["POST"]);
      return;
    }

    const body = await readJsonBody<unknown>(req);
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      sendBadRequest(
        res,
        `Invalid body: ${parsed.error.errors.map((e) => e.message).join(", ")}`,
      );
      return;
    }

    const shotIds = parsed.data.shot_ids ?? parsed.data.shotIds ?? [];
    if (shotIds.length === 0) {
      sendBadRequest(res, "shot_ids is required");
      return;
    }

    // Security: verify all shots belong to the same project the user can access.
    const shots = await Promise.all(shotIds.map((id) => getShotById(id)));
    if (shots.some((s) => !s)) {
      sendNotFound(res, "Shot not found");
      return;
    }

    const projectIds = new Set(shots.map((s) => getProjectIdFromShot(s) || ""));
    if (projectIds.size !== 1) {
      sendBadRequest(res, "All shot_ids must belong to the same project");
      return;
    }
    const projectId = Array.from(projectIds)[0];

    const organizationIds = await getUserOrganizationIds(bootstrap.user.id);
    const project = await getAccessibleProject(
      projectId,
      bootstrap.user.id,
      organizationIds,
    );
    if (!project) {
      sendJson(res, 403, { error: "Project not found or access denied" });
      return;
    }

    await Promise.all(
      shotIds.map((id, index) =>
        requestGraphql(
          `
            mutation ReorderShot($id: uuid!, $orderIndex: Int!, $userId: uuid!) {
              update_shots_by_pk(
                pk_columns: { id: $id }
                _set: { order_index: $orderIndex, user_id: $userId }
              ) {
                id
              }
            }
          `,
          { id, orderIndex: index, userId: bootstrap.user.id },
        ),
      ),
    );

    sendJson(res, 200, { success: true });
  } catch (error) {
    sendServerError(res, error);
  }
}
