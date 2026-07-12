/**
 * T16 — Timeline-node activity logs (legacy Next.js API Route).
 *
 * Ziel: `scriptony-observability` (Appwrite Function).
 * Status: read-only. Keine Business Writes.
 * Limit: max 100 Eintraege pro Query.
 * Security: BROKEN — Kein Node-Zugriffscheck. Jeder authentifizierte User kann Logs
 *          zu jedem Node abfragen, wenn er die nodeId kennt. Fix in T18-Ziel-Function.
 *
 * @deprecated T16 BROKEN — Wird in `scriptony-observability` konsolidiert.
 * Neue Log-Features duerfen hier nicht ergaenzt werden.
 */

import { requireUserBootstrap } from "../../../../_shared/auth";
import { requestGraphql } from "../../../../_shared/graphql-compat";
import {
  getParam,
  getQuery,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
  sendUnauthorized,
} from "../../../../_shared/http";

const ENTITY_TYPE_MAP: Record<string, string> = {
  act: "Act",
  sequence: "Sequence",
  scene: "Scene",
  shot: "Shot",
};

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

    const entityType = ENTITY_TYPE_MAP[nodeType];
    if (!entityType) {
      sendBadRequest(res, `Unsupported nodeType: ${nodeType}`);
      return;
    }

    const limit = Math.min(Number(getQuery(req, "limit") || "20"), 50);
    const data = await requestGraphql<{
      activity_logs: Array<Record<string, any>>;
    }>(
      `
        query GetNodeLogs($entityType: String!, $entityId: uuid!, $limit: Int!) {
          activity_logs(
            where: {
              entity_type: { _eq: $entityType }
              entity_id: { _eq: $entityId }
            }
            order_by: { created_at: desc }
            limit: $limit
          ) {
            id
            created_at
            user_id
            entity_type
            entity_id
            action
            details
          }
        }
      `,
      { entityType, entityId: id, limit },
    );

    sendJson(res, 200, {
      logs: data.activity_logs.map((log) => ({
        id: log.id,
        timestamp: log.created_at,
        user: null,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        action: log.action,
        details: log.details,
        parent_path: [],
      })),
      count: data.activity_logs.length,
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
