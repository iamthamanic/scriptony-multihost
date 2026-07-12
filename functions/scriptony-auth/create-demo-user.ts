/**
 * Demo-user bootstrap endpoint for local testing.
 *
 * This preserves the old helper used by the app's debug and seed utilities.
 *
 * @deprecated T17 — Nur fuer lokale Entwicklung/Seed. Nicht fuer Production.
 *          Verbleibt als Compat-Route. Neue Demo-User-Logik muss explizit opt-in sein.
 */

import {
  createEmailPasswordUser,
  findUserByEmail,
  isAppwriteConflictError,
  toAuthUser,
} from "../_shared/appwrite-users";
import { ensureUserBootstrap } from "../_shared/auth";
import { getDemoUserCredentials } from "../_shared/env";
import {
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
} from "../_shared/http";

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }

  try {
    const credentials = getDemoUserCredentials();
    let user;
    let created = false;

    try {
      user = await createEmailPasswordUser({
        email: credentials.email,
        password: credentials.password,
        name: credentials.displayName,
      });
      created = true;
    } catch (error) {
      if (!isAppwriteConflictError(error)) {
        throw error;
      }

      user = await findUserByEmail(credentials.email);
      if (!user) {
        throw error;
      }
    }

    await ensureUserBootstrap(toAuthUser(user));

    sendJson(res, 200, {
      success: true,
      email: credentials.email,
      password: credentials.password,
      message: created ? "Demo user created" : "Demo user already exists",
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
