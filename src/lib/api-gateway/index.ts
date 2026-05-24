/**
 * API gateway: maps SPA routes to deployed Scriptony HTTP functions.
 *
 * Responsibility (single): choose which `scriptony-*` function serves a path (`ROUTE_MAP` +
 * small special cases). URL joining uses `joinUrl` from `env.ts` (DRY).
 * Adding a feature surface: extend `ROUTE_MAP` and implement the handler under `functions/`.
 *
 * Location: src/lib/api-gateway/index.ts
 */

export type { ApiGatewayErrorLayer } from "./gateway-errors";
export { ApiGatewayError } from "./gateway-errors";
export {
  apiDelete,
  apiGateway,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  getApiBase,
} from "./gateway-fetch";
export {
  BACKEND_FUNCTIONS,
  buildFunctionBaseUrl,
  buildFunctionRouteUrl,
  EDGE_FUNCTIONS,
} from "./route-map";
export type { ApiGatewayOptions } from "./types";
