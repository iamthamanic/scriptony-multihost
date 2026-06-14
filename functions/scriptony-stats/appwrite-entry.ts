/**
 * Appwrite Function Entry: scriptony-stats
 * Legacy T16 Stats Routes — zentraler Router fuer alle Stats-Handler.
 */

import {
  createAppwriteHandler,
  getPathname,
} from "../_shared/appwrite-handler";
import type { RequestLike, ResponseLike } from "../_shared/http";
import overviewHandler from "./stats/project/[id]/overview";
import charactersHandler from "./stats/project/[id]/characters";
import mediaHandler from "./stats/project/[id]/media";
import shotsHandler from "./stats/project/[id]/shots";
import nodeStatsHandler from "./stats/[nodeType]/[id]/index";
import detailedHandler from "./stats/[nodeType]/[id]/detailed";

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  const pathname = getPathname(req);

  // Health check
  if (pathname === "/" || pathname === "/health") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        status: "ok",
        service: "scriptony-stats",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }

  // /stats/project/:id/overview
  const projectOverview = pathname.match(
    /^\/stats\/project\/([^/]+)\/overview$/,
  );
  if (projectOverview) {
    req.params = { ...(req.params || {}), id: projectOverview[1] };
    await overviewHandler(req, res);
    return;
  }

  // /stats/project/:id/characters
  const projectChars = pathname.match(
    /^\/stats\/project\/([^/]+)\/characters$/,
  );
  if (projectChars) {
    req.params = { ...(req.params || {}), id: projectChars[1] };
    await charactersHandler(req, res);
    return;
  }

  // /stats/project/:id/media
  const projectMedia = pathname.match(/^\/stats\/project\/([^/]+)\/media$/);
  if (projectMedia) {
    req.params = { ...(req.params || {}), id: projectMedia[1] };
    await mediaHandler(req, res);
    return;
  }

  // /stats/project/:id/shots
  const projectShots = pathname.match(/^\/stats\/project\/([^/]+)\/shots$/);
  if (projectShots) {
    req.params = { ...(req.params || {}), id: projectShots[1] };
    await shotsHandler(req, res);
    return;
  }

  // /stats/:nodeType/:id
  const nodeStats = pathname.match(/^\/stats\/([^/]+)\/([^/]+)$/);
  if (nodeStats) {
    req.params = {
      ...(req.params || {}),
      nodeType: nodeStats[1],
      id: nodeStats[2],
    };
    await nodeStatsHandler(req, res);
    return;
  }

  // /stats/:nodeType/:id/detailed
  const detailed = pathname.match(/^\/stats\/([^/]+)\/([^/]+)\/detailed$/);
  if (detailed) {
    req.params = {
      ...(req.params || {}),
      nodeType: detailed[1],
      id: detailed[2],
    };
    await detailedHandler(req, res);
    return;
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: "Not found", path: pathname }));
}

export default createAppwriteHandler(dispatch);
