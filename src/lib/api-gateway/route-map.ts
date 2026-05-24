/**
 * Route → backend function mapping and function base URL builders.
 * Location: src/lib/api-gateway/route-map.ts
 */

import {
  backendConfig,
  devFunctionUrlUsePlainHttp,
  joinUrl,
  upgradeHttpFunctionUrlForSecurePage,
} from "../env";

// =============================================================================
// BACKEND FUNCTION DEFINITIONS
// =============================================================================

/**
 * Backend function names exposed by the current provider.
 */
export const BACKEND_FUNCTIONS = {
  MAIN_SERVER: "make-server-3b52693b", // legacy unified server / special routes
  PROJECTS: "scriptony-projects",
  PROJECT_NODES: "scriptony-project-nodes", // template engine / nodes
  SHOTS: "scriptony-shots",
  /** Editorial timeline clips (NLE segments). */
  CLIPS: "scriptony-clips",
  CHARACTERS: "scriptony-characters",
  /** Style Guide (project_visual_style + items). Deploy `scriptony-style-guide`. */
  STYLE_GUIDE: "scriptony-style-guide",
  AUDIO: "scriptony-audio", // selected in getBackendFunctionForRoute for paths under /shots/... (audio)
  /** Hörbuch/Hörspiel Audio Production: sessions, tracks, voices, mixing. */
  AUDIO_STORY: "scriptony-audio-story",
  BEATS: "scriptony-beats",
  WORLDBUILDING: "scriptony-worldbuilding",
  /** Unified AI service: `/ai/*`, feature config, provider keys (replaces assistant for gateway `/ai`). */
  AI: "scriptony-ai",
  ASSISTANT: "scriptony-assistant",
  IMAGE: "scriptony-image",
  /** Puppet-Layer: render-job orchestrator (accept/reject/complete lifecycle). */
  STAGE: "scriptony-stage",
  /** Puppet-Layer: 2D layer & repair endpoints. */
  STAGE2D: "scriptony-stage2d",
  /** Puppet-Layer: 3D view-state endpoints. */
  STAGE3D: "scriptony-stage3d",
  /** Puppet-Layer: style-profile CRUD + apply. */
  STYLE: "scriptony-style",
  /** Puppet-Layer: Blender ingress (sync metadata only). */
  SYNC: "scriptony-sync",
  GYM: "scriptony-gym",
  /** Asset metadata and upload orchestration. */
  ASSETS: "scriptony-assets",
  AUTH: "scriptony-auth",
  /** T12: Read-only editor view-model aggregation. */
  EDITOR_READMODEL: "scriptony-editor-readmodel",
  /** T14: Job queue control plane. */
  JOBS: "scriptony-jobs",
  SUPERADMIN: "scriptony-superadmin",
  STATS: "scriptony-stats",
  LOGS: "scriptony-logs",
  /** Internal MCP-style capability host (thin HTTP entry). */
  MCP_APPWRITE: "scriptony-mcp-appwrite",
} as const;

export const EDGE_FUNCTIONS = BACKEND_FUNCTIONS;

/**
 * Backend function base URLs
 */
export function buildFunctionBaseUrl(functionName: string): string {
  /**
   * Dev-only: same-origin proxy in vite.config.ts avoids browser CORS when
   * Appwrite's executor returns errors without CORS headers (cold starts, crashes).
   * Works for ALL functions that have an entry in VITE_BACKEND_FUNCTION_DOMAIN_MAP.
   */
  if (import.meta.env.DEV && backendConfig.functionDomainMap?.[functionName]) {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    return `${origin}/__dev-proxy/${functionName}`.replace(/\/+$/, "");
  }

  const domain = backendConfig.functionDomainMap?.[functionName]?.trim();
  if (domain) {
    return domain.replace(/\/+$/, "");
  }

  if (!backendConfig.functionsBaseUrl?.trim()) {
    throw new Error(
      `Backend function "${functionName}" is not configured: add it to VITE_BACKEND_FUNCTION_DOMAIN_MAP or set VITE_BACKEND_API_BASE_URL / VITE_APPWRITE_FUNCTIONS_BASE_URL.`,
    );
  }

  if (!backendConfig.functionsBaseUrl) {
    throw new Error(
      `Backend function URL is not configured for ${functionName}.`,
    );
  }

  return upgradeHttpFunctionUrlForSecurePage(
    devFunctionUrlUsePlainHttp(
      joinUrl(backendConfig.functionsBaseUrl, functionName),
    ),
  );
}

export function buildFunctionRouteUrl(
  functionName: string,
  route = "",
): string {
  const baseUrl = buildFunctionBaseUrl(functionName);
  return route ? joinUrl(baseUrl, route) : baseUrl;
}

// =============================================================================
// ROUTE MAPPING
// =============================================================================

/**
 * Maps URL path prefixes (SPA route argument to apiGateway) → function slug.
 * Resolution: longest matching prefix wins (`route.startsWith(prefix)`); see getBackendFunctionForRoute
 * for exceptions (e.g. audio under /shots/* → AUDIO before this map is used for /shots).
 */
const ROUTE_MAP: Record<string, string> = {
  // scriptony-auth
  "/signup": BACKEND_FUNCTIONS.AUTH,
  "/create-demo-user": BACKEND_FUNCTIONS.AUTH,
  "/profile": BACKEND_FUNCTIONS.AUTH,
  "/organizations": BACKEND_FUNCTIONS.AUTH,
  "/integration-tokens": BACKEND_FUNCTIONS.AUTH,
  "/storage": BACKEND_FUNCTIONS.AUTH,
  "/storage-providers": BACKEND_FUNCTIONS.AUTH,

  // scriptony-projects
  "/projects": BACKEND_FUNCTIONS.PROJECTS,

  // scriptony-style-guide (prefix before shorter routes)
  "/style-guide": BACKEND_FUNCTIONS.STYLE_GUIDE,

  // scriptony-project-nodes
  "/nodes": BACKEND_FUNCTIONS.PROJECT_NODES,
  "/initialize-project": BACKEND_FUNCTIONS.PROJECT_NODES,

  // scriptony-shots (audio-specific paths handled in getBackendFunctionForRoute → AUDIO)
  "/shots": BACKEND_FUNCTIONS.SHOTS,

  // scriptony-clips (editorial timeline; must not prefix-match /shots)
  "/clips": BACKEND_FUNCTIONS.CLIPS,

  // scriptony-characters
  "/characters": BACKEND_FUNCTIONS.CHARACTERS,
  "/timeline-characters": BACKEND_FUNCTIONS.CHARACTERS,

  // scriptony-stats, scriptony-logs
  "/stats": BACKEND_FUNCTIONS.STATS,
  "/logs": BACKEND_FUNCTIONS.LOGS,

  // scriptony-beats
  "/beats": BACKEND_FUNCTIONS.BEATS,

  // scriptony-worldbuilding
  "/worlds": BACKEND_FUNCTIONS.WORLDBUILDING,
  "/locations": BACKEND_FUNCTIONS.WORLDBUILDING,

  // scriptony-mcp-appwrite (longer prefix before shorter assistant routes if path overlaps)
  "/scriptony-mcp": BACKEND_FUNCTIONS.MCP_APPWRITE,

  // scriptony-image (must be above /ai prefix)
  "/ai/image": BACKEND_FUNCTIONS.IMAGE,

  // scriptony-audio-story (T31: TTS Pipeline)
  "/tts": BACKEND_FUNCTIONS.AUDIO_STORY,

  // ---------------------------------------------------------------------------
  // Puppet-Layer surfaces (longer prefixes before shorter /ai catch-all)
  // ---------------------------------------------------------------------------

  // scriptony-jobs (T14: job queue control plane)
  "/v1/jobs": BACKEND_FUNCTIONS.JOBS,

  // scriptony-stage: render-job orchestrator + repair dispatch
  "/ai/jobs": BACKEND_FUNCTIONS.STAGE,
  "/ai/stage": BACKEND_FUNCTIONS.STAGE,
  "/stage": BACKEND_FUNCTIONS.STAGE,

  // scriptony-stage2d: 2D document & layer endpoints
  "/ai/stage2d": BACKEND_FUNCTIONS.STAGE2D,

  // scriptony-stage3d: 3D view-state endpoints
  "/ai/stage3d": BACKEND_FUNCTIONS.STAGE3D,

  // scriptony-style: style-profile CRUD + apply
  "/ai/style": BACKEND_FUNCTIONS.STYLE,

  // scriptony-sync: Blender ingress (sync metadata only, no product decisions)
  "/ai/sync": BACKEND_FUNCTIONS.SYNC,
  "/sync": BACKEND_FUNCTIONS.SYNC,

  // ---------------------------------------------------------------------------
  // scriptony-assistant: canonical /ai/assistant/* + legacy /ai/{chat,settings,…}
  // scriptony-assistant accepts both prefixes (dual-prefix normalisation).
  // ---------------------------------------------------------------------------
  "/ai/assistant": BACKEND_FUNCTIONS.ASSISTANT,

  // Legacy assistant paths — T11 bereinigt:
  //   /ai/settings, /ai/models, /ai/validate-key -> scriptony-ai
  //   /ai/gym -> scriptony-gym
  //   /mcp -> scriptony-mcp-appwrite
  "/ai/chat": BACKEND_FUNCTIONS.ASSISTANT,
  "/ai/conversations": BACKEND_FUNCTIONS.ASSISTANT,
  "/ai/rag": BACKEND_FUNCTIONS.ASSISTANT,
  "/ai/settings": BACKEND_FUNCTIONS.AI,
  "/ai/models": BACKEND_FUNCTIONS.AI,
  "/ai/validate-key": BACKEND_FUNCTIONS.AI,
  "/ai/count-tokens": BACKEND_FUNCTIONS.ASSISTANT,
  "/ai/gym": BACKEND_FUNCTIONS.GYM,

  // scriptony-ai control plane (provider registry, feature routing, key storage)
  // ---------------------------------------------------------------------------
  "/providers": BACKEND_FUNCTIONS.AI,
  "/api-keys": BACKEND_FUNCTIONS.AI,
  "/features": BACKEND_FUNCTIONS.AI,
  "/settings": BACKEND_FUNCTIONS.AI,

  // scriptony-ai catch-all for remaining /ai/* (route-request, future control-plane routes)
  "/ai": BACKEND_FUNCTIONS.AI,

  // Remaining standalone assistant-only routes (legacy non-/ai paths)
  "/conversations": BACKEND_FUNCTIONS.ASSISTANT,
  "/rag": BACKEND_FUNCTIONS.ASSISTANT,
  "/mcp": BACKEND_FUNCTIONS.MCP_APPWRITE,

  // scriptony-audio-story (Hörspiel/audiobook tracks, sessions, voices, mixing)
  "/tracks": BACKEND_FUNCTIONS.AUDIO_STORY,
  "/sessions": BACKEND_FUNCTIONS.AUDIO_STORY,
  "/voices": BACKEND_FUNCTIONS.AUDIO_STORY,
  "/mixing": BACKEND_FUNCTIONS.AUDIO_STORY,
  "/audio-clips": BACKEND_FUNCTIONS.AUDIO_STORY,

  // scriptony-gym
  "/exercises": BACKEND_FUNCTIONS.GYM,
  "/progress": BACKEND_FUNCTIONS.GYM,
  "/achievements": BACKEND_FUNCTIONS.GYM,
  "/categories": BACKEND_FUNCTIONS.GYM,
  "/daily-challenge": BACKEND_FUNCTIONS.GYM,

  // scriptony-editor-readmodel (T12: read-only aggregation)
  "/editor": BACKEND_FUNCTIONS.EDITOR_READMODEL,

  // scriptony-superadmin
  "/superadmin": BACKEND_FUNCTIONS.SUPERADMIN,
};

/**
 * Determines which backend function to use for a given route.
 */
export function getBackendFunctionForRoute(route: string): string {
  // Assets routes must be resolved before /audio or other prefix collisions
  if (route.startsWith("/assets")) return BACKEND_FUNCTIONS.ASSETS;

  // Audio routes live under /shots/... but must hit scriptony-audio, not scriptony-shots.
  if (
    route.includes("/upload-audio") ||
    route.includes("/shots/audio/") ||
    route.match(/\/shots\/[^/]+\/audio$/)
  ) {
    return BACKEND_FUNCTIONS.AUDIO;
  }

  // Longest-prefix match (more specific routes win over shorter shared prefixes)
  const sortedPrefixes = Object.keys(ROUTE_MAP).sort(
    (a, b) => b.length - a.length,
  );
  const matchedPrefix = sortedPrefixes.find((prefix) =>
    route.startsWith(prefix),
  );

  if (!matchedPrefix) {
    console.warn(`[API Gateway] No backend function found for route: ${route}`);
    // Fallback to projects function for unknown routes
    return BACKEND_FUNCTIONS.PROJECTS;
  }

  return ROUTE_MAP[matchedPrefix];
}
