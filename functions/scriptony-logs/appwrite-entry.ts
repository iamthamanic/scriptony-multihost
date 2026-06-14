/**
 * Appwrite Function Entry: scriptony-logs
 * Legacy T16 Logs Routes — zentraler Router fuer alle Log-Handler.
 */

import {
  createAppwriteHandler,
  getPathname,
} from "../_shared/appwrite-handler";
import type { RequestLike, ResponseLike } from "../_shared/http";
import projectLogsHandler from "./logs/project/[id]/recent";
import nodeLogsHandler from "./logs/[nodeType]/[id]/recent";

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  const pathname = getPathname(req);

  // Health check
  if (pathname === "/" || pathname === "/health") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        status: "ok",
        service: "scriptony-logs",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }

  // /logs/project/:id/recent
  const projectLogs = pathname.match(/^\/logs\/project\/([^/]+)\/recent$/);
  if (projectLogs) {
    req.params = { ...(req.params || {}), id: projectLogs[1] };
    await projectLogsHandler(req, res);
    return;
  }

  // /logs/:nodeType/:id/recent
  const nodeLogs = pathname.match(/^\/logs\/([^/]+)\/([^/]+)\/recent$/);
  if (nodeLogs) {
    req.params = {
      ...(req.params || {}),
      nodeType: nodeLogs[1],
      id: nodeLogs[2],
    };
    await nodeLogsHandler(req, res);
    return;
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: "Not found", path: pathname }));
}

export default createAppwriteHandler(dispatch);
