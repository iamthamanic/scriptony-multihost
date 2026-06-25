/**
 * Appwrite Function Entry: scriptony-audio-story (Node.js)
 * Hörbuch/Hörspiel Audio Production Management
 * - Recording Sessions
 * - Audio Tracks (Dialog/Musik/SFX/Atmo)
 * - Voice Casting (Human/TTS)
 * - Stem Mixing & Export
 */

import {
  createAppwriteHandler,
  getPathname,
  sendRouteNotFound,
  withParams,
} from "../_shared/appwrite-handler";
import type { RequestLike, ResponseLike } from "../_shared/http";

// Import route handlers
import clipsHandler from "./routes/clips";
import scenesHandler from "./routes/scenes";
import sessionsHandler from "./routes/sessions";
import tracksHandler from "./routes/tracks";
import voicesHandler from "./routes/voices";
import audioProductionHandler from "./routes/audio-production";

import ttsHandler from "./routes/tts";
import scriptEnhanceHandler from "./routes/script-enhance";

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  const pathname = getPathname(req);

  // Health check
  if (pathname === "/" || pathname === "/health") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        status: "ok",
        service: "scriptony-audio-story",
        version: "1.0.0",
        message: "Hörspiel Audio Production API",
        endpoints: {
          sessions: "/sessions - Recording Sessions",
          tracks: "/tracks - Audio Track Management",
          clips: "/audio-clips - Audio Clip Management (Ist-Ebene)",
          scenesReorder: "/scenes/reorder — Scene order (timeline_nodes)",
          voices: "/voices - Voice Casting & TTS",
          audioProduction: "/audio-production - T08 Orchestration",
          tts: "/tts - TTS Pipeline (T31)",
          scriptEnhance: "/script/enhance - MVE Enhance Script (T64)",
        },
      }),
    );
    return;
  }

  // Scenes reorder (T30)
  if (pathname.startsWith("/scenes")) {
    await scenesHandler(req, res);
    return;
  }

  // Sessions routes
  if (pathname.startsWith("/sessions")) {
    await sessionsHandler(req, res);
    return;
  }

  // Clips routes (T28)
  if (pathname.startsWith("/audio-clips")) {
    const clipIdMatch = pathname.match(/^\/audio-clips\/([^/]+)$/);
    await clipsHandler(
      clipIdMatch ? withParams(req, { id: clipIdMatch[1] }) : req,
      res,
    );
    return;
  }

  // Tracks routes
  if (pathname.startsWith("/tracks")) {
    await tracksHandler(req, res);
    return;
  }

  // Voices routes
  if (pathname.startsWith("/voices")) {
    await voicesHandler(req, res);
    return;
  }

  // Audio Production Orchestration (T08)
  if (pathname.startsWith("/audio-production")) {
    await audioProductionHandler(req, res);
    return;
  }

  // TTS Pipeline (T31)
  if (pathname.startsWith("/tts")) {
    await ttsHandler(req, res);
    return;
  }

  // MVE Enhance Script (T64)
  if (pathname.startsWith("/script")) {
    await scriptEnhanceHandler(req, res);
    return;
  }

  sendRouteNotFound("scriptony-audio-story", req, res);
}

export default createAppwriteHandler(dispatch);
