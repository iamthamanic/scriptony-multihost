/**
 * T16 — Superadmin users (legacy Next.js API Route).
 *
 * Ziel: `scriptony-admin` (Appwrite Function).
 * Security-Kontext: superadmin-only (Least Privilege).
 *
 * @deprecated T16 — Wird in `scriptony-admin` konsolidiert.
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
      users: Array<Record<string, any>>;
    }>(
      `
        query GetSuperadminUsers {
          users(order_by: { created_at: desc }) {
            id
            email
            name
            created_at
            avatar_url
          }
        }
      `,
    );

    sendJson(res, 200, {
      users: data.users.map((user) => ({
        id: user.id,
        email: user.email || "unknown",
        name: user.name || "Unknown",
        role: "user",
        lastSignIn: null,
        createdAt: user.created_at,
        emailConfirmed: Boolean(user.email),
      })),
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
