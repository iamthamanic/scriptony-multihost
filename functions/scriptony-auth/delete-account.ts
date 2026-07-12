/**
 * DELETE /account — permanently delete the authenticated Appwrite user.
 * Location: functions/scriptony-auth/delete-account.ts
 */

import { Account, Client } from "node-appwrite";
import { deleteAppwriteUserById } from "../_shared/appwrite-users";
import { requireAuthenticatedUser } from "../_shared/auth";
import { getBearerToken } from "../_shared/auth-jwt";
import { getAppwriteEndpoint, getAppwriteProjectId } from "../_shared/env";
import {
  readJsonBody,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
  sendUnauthorized,
} from "../_shared/http";
import { purgeUserCloudData } from "../_shared/user-cloud-purge";
import { parseDeleteAccountBody } from "./delete-account-schema";

async function verifyPasswordWithUserJwt(
  jwt: string,
  email: string,
  password: string,
): Promise<boolean> {
  const client = new Client()
    .setEndpoint(getAppwriteEndpoint())
    .setProject(getAppwriteProjectId())
    .setJWT(jwt);
  const account = new Account(client);
  try {
    const session = await account.createEmailPasswordSession({
      email,
      password,
    });
    try {
      await account.deleteSession({ sessionId: session.$id });
    } catch {
      /* best-effort cleanup of verification session */
    }
    return true;
  } catch {
    return false;
  }
}

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  try {
    if (req.method !== "DELETE") {
      sendMethodNotAllowed(res, ["DELETE"]);
      return;
    }

    const user = await requireAuthenticatedUser(req);
    if (!user?.id || !user.email) {
      sendUnauthorized(res);
      return;
    }

    const rawBody = await readJsonBody<unknown>(req);
    const parsed = parseDeleteAccountBody(rawBody);
    if (!parsed.ok) {
      sendBadRequest(res, parsed.message);
      return;
    }
    const { password } = parsed.data;

    const jwt = getBearerToken(req);
    if (!jwt) {
      sendUnauthorized(res);
      return;
    }

    const passwordOk = await verifyPasswordWithUserJwt(
      jwt,
      user.email,
      password,
    );
    if (!passwordOk) {
      sendUnauthorized(res, "Passwort ist falsch");
      return;
    }

    const purged = await purgeUserCloudData(user.id);
    await deleteAppwriteUserById(user.id);
    sendJson(res, 200, { success: true, purged });
  } catch (error) {
    sendServerError(res, error);
  }
}
