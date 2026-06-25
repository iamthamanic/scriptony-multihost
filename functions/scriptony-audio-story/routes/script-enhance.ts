/**
 * POST /script/enhance — MVE Voice Script Enhance (T64 / GitHub #7).
 * Location: functions/scriptony-audio-story/routes/script-enhance.ts
 */

import type { RequestLike, ResponseLike } from "../../_shared/http";
import { requireUserBootstrap } from "../../_shared/auth";
import {
  readJsonBody,
  sendJson,
  sendBadRequest,
  sendUnauthorized,
  sendServerError,
  sendMethodNotAllowed,
} from "../../_shared/http";
import { getPathname } from "../../_shared/appwrite-handler";
import { canEditProject } from "../_shared/access";
import { runMveEnhanceScript } from "../../_shared/mve-enhance-script-service";
import {
  EnhanceScriptHttpError,
  tooManyEnhanceRequests,
} from "../../_shared/mve-enhance-script-errors";

const enhanceRate = new Map<string, { n: number; windowStart: number }>();
/** Per warm Appwrite instance only — configure function-level limits in Appwrite for production. */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;

function pruneEnhanceRate(now: number): void {
  for (const [userId, entry] of enhanceRate) {
    if (now - entry.windowStart > RATE_WINDOW_MS) {
      enhanceRate.delete(userId);
    }
  }
}

function allowEnhanceRate(userId: string): boolean {
  const now = Date.now();
  pruneEnhanceRate(now);
  const entry = enhanceRate.get(userId);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    enhanceRate.set(userId, { n: 1, windowStart: now });
    return true;
  }
  if (entry.n >= RATE_MAX) return false;
  entry.n += 1;
  return true;
}

async function enhanceScript(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  if (!allowEnhanceRate(bootstrap.user.id)) {
    const err = tooManyEnhanceRequests();
    sendJson(res, err.statusCode, { error: err.message });
    return;
  }

  let body: unknown;
  try {
    body = await readJsonBody<unknown>(req);
  } catch {
    sendBadRequest(res, "Ungültiger JSON-Body");
    return;
  }

  const projectId =
    typeof body === "object" &&
    body !== null &&
    "projectId" in body &&
    typeof (body as { projectId: unknown }).projectId === "string"
      ? (body as { projectId: string }).projectId
      : "";
  if (projectId && !(await canEditProject(bootstrap.user.id, projectId))) {
    sendUnauthorized(res);
    return;
  }

  try {
    const result = await runMveEnhanceScript(bootstrap.user.id, body);
    sendJson(res, 200, { success: true, ...result });
  } catch (error) {
    if (error instanceof EnhanceScriptHttpError) {
      sendJson(res, error.statusCode, { error: error.message });
      return;
    }
    console.error("[Audio Story] enhance script error:", error);
    sendServerError(res, error);
  }
}

export default async function scriptEnhanceHandler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const pathname = getPathname(req);

  if (req.method === "POST" && pathname === "/script/enhance") {
    await enhanceScript(req, res);
    return;
  }

  sendMethodNotAllowed(res, ["POST"]);
}
