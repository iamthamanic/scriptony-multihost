/**
 * T15 HTTP Auth Wrapper.
 *
 * Bridges auth infrastructure with HTTP response.
 * Small, focused file keeps the large auth.ts under 300 lines.
 */

import type { AuthUser } from "./auth";
import { requireUserBootstrap } from "./auth";
import type { RequestLike, ResponseLike } from "./http";
import { sendUnauthorized } from "./http";

/**
 * Authenticate user and send HTTP 401 if auth fails.
 */
export async function requireAuth(
  req: RequestLike,
  res: ResponseLike,
): Promise<AuthUser | null> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return null;
  }
  return bootstrap.user;
}
