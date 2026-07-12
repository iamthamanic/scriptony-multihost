/**
 * T16 — Superadmin analytics (legacy Next.js API Route).
 *
 * Ziel: `scriptony-admin` (Appwrite Function).
 * Security-Kontext: superadmin-only (Least Privilege).
 * Security: BROKEN — activeUsers24h und activeUsers7d liefern identische Werte,
 *          da die GraphQL-Query keinen Zeit-Filter hat. Irrefuehrend fuer UI.
 *          Fix: Zeitfilter in Query oder Separate Queries. In T18-Ziel-Function.
 *
 * @deprecated T16 BROKEN — Wird in `scriptony-admin` konsolidiert.
 * Neue Admin-Features duerfen hier nicht ergaenzt werden.
 */

import { requestGraphql } from "../../_shared/graphql-compat";
import {
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
} from "../../_shared/http";
import { requireSuperadmin } from "../_shared";

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  try {
    const bootstrap = await requireSuperadmin(req, res);
    if (!bootstrap) {
      return;
    }

    if (req.method !== "GET") {
      sendMethodNotAllowed(res, ["GET"]);
      return;
    }

    const data = await requestGraphql<{
      activity_logs_aggregate: { aggregate: { count: number } | null };
      activity_logs: Array<{
        user_id: string | null;
        project_id: string | null;
      }>;
      organization_members: Array<{ organization_id: string }>;
    }>(
      `
        query GetSuperadminAnalytics {
          activity_logs_aggregate {
            aggregate { count }
          }
          activity_logs(order_by: { created_at: desc }, limit: 500) {
            user_id
            project_id
          }
          organization_members {
            organization_id
          }
        }
      `,
    );

    const activeUsers = new Set(
      data.activity_logs.map((entry) => entry.user_id).filter(Boolean),
    );
    const activeOrganizations = new Set(
      data.organization_members.map((entry) => entry.organization_id),
    );

    sendJson(res, 200, {
      analytics: {
        totalEvents: data.activity_logs_aggregate.aggregate?.count || 0,
        activeUsers24h: activeUsers.size,
        activeUsers7d: activeUsers.size,
        activeOrganizations: activeOrganizations.size,
      },
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
