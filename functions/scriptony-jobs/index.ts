/**
 * T14 ACTIVE JOB CONTROL PLANE — Node.js Appwrite Function.
 *
 * Einzige aktive Job-Queue für Scriptony.
 * Schema: docs/job-schema.md
 * Legacy: jobs-handler/ (Deno-only, nicht deployed)
 *
 * Endpoints:
 *   POST /v1/jobs/:functionName   — Job erstellen
 *   GET  /v1/jobs/:jobId/status   — Status abfragen
 *   GET  /v1/jobs/:jobId/result   — Ergebnis holen
 *   POST /v1/jobs/:jobId/cancel  — Job abbrechen
 *   POST /v1/jobs/:jobId/retry   — Job wiederholen
 *   POST /v1/jobs/cleanup         — Alte Jobs aufräumen
 */

import { z } from "zod";
import { createAppwriteHandler } from "../_shared/appwrite-handler";
import {
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendNotFound,
  sendServerError,
} from "../_shared/http";
import { SUPPORTED_JOBS } from "./config/supported-jobs";
import { handleCleanup } from "./handlers/cleanup";
import { handleCancel, handleRetry } from "./handlers/lifecycle";
import {
  handleCreateJob,
  handleGetResult,
  handleGetStatus,
} from "./handlers/read";

const JobIdParam = z.string().min(1).max(64);

const HEALTH_DATA = {
  status: "ok",
  service: "scriptony-jobs",
  version: "1.0.0",
  supported_jobs: Object.keys(SUPPORTED_JOBS),
};

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  const pathname =
    (typeof req?.path === "string" && req.path) ||
    (typeof req?.url === "string"
      ? new URL(req.url, "http://localhost").pathname
      : "/");

  if (pathname === "/" || pathname === "/health") {
    sendJson(res, 200, HEALTH_DATA);
    return;
  }

  try {
    const createMatch = pathname.match(/^\/v1\/jobs\/([^/]+)$/);
    if (createMatch && req.method === "POST") {
      await handleCreateJob(req, res, createMatch[1]);
      return;
    }

    const statusMatch = pathname.match(/^\/v1\/jobs\/([^/]+)\/status$/);
    if (statusMatch && req.method === "GET") {
      const valid = JobIdParam.safeParse(statusMatch[1]);
      if (!valid.success) {
        sendJson(res, 400, { error: "Invalid jobId" });
        return;
      }
      await handleGetStatus(req, res, statusMatch[1]);
      return;
    }

    const resultMatch = pathname.match(/^\/v1\/jobs\/([^/]+)\/result$/);
    if (resultMatch && req.method === "GET") {
      const valid = JobIdParam.safeParse(resultMatch[1]);
      if (!valid.success) {
        sendJson(res, 400, { error: "Invalid jobId" });
        return;
      }
      await handleGetResult(req, res, resultMatch[1]);
      return;
    }

    const cancelMatch = pathname.match(/^\/v1\/jobs\/([^/]+)\/cancel$/);
    if (cancelMatch && req.method === "POST") {
      const valid = JobIdParam.safeParse(cancelMatch[1]);
      if (!valid.success) {
        sendJson(res, 400, { error: "Invalid jobId" });
        return;
      }
      await handleCancel(req, res, cancelMatch[1]);
      return;
    }

    const retryMatch = pathname.match(/^\/v1\/jobs\/([^/]+)\/retry$/);
    if (retryMatch && req.method === "POST") {
      const valid = JobIdParam.safeParse(retryMatch[1]);
      if (!valid.success) {
        sendJson(res, 400, { error: "Invalid jobId" });
        return;
      }
      await handleRetry(req, res, retryMatch[1]);
      return;
    }

    if (pathname === "/v1/jobs/cleanup" && req.method === "POST") {
      await handleCleanup(req, res);
      return;
    }

    sendNotFound(res, `Route not found: ${pathname}`);
  } catch (e) {
    sendServerError(res, e);
  }
}

export default createAppwriteHandler(dispatch);
