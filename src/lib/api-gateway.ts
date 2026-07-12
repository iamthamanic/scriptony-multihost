/**
 * Backward-compatible barrel for `src/lib/api-gateway/`.
 * Existing imports from `./api-gateway` keep working.
 *
 * Location: src/lib/api-gateway.ts
 */

export type { ApiGatewayErrorLayer } from "./api-gateway/gateway-errors";
export { ApiGatewayError } from "./api-gateway/gateway-errors";
export {
  apiDelete,
  apiGateway,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  getApiBase,
} from "./api-gateway/gateway-fetch";
export {
  BACKEND_FUNCTIONS,
  buildFunctionBaseUrl,
  buildFunctionRouteUrl,
  EDGE_FUNCTIONS,
} from "./api-gateway/route-map";
export type { ApiGatewayOptions } from "./api-gateway/types";
