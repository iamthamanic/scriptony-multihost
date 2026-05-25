/**
 * API gateway fetch wrapper and convenience HTTP helpers.
 * Location: src/lib/api-gateway/gateway-fetch.ts
 */

import { getBackendConfig, joinUrl } from "../env";
import { getSidecarAuthToken } from "../local/sidecar-lifecycle";
import { ApiGatewayError, type ApiGatewayErrorLayer } from "./gateway-errors";
import {
  buildFunctionBaseUrl,
  EDGE_FUNCTIONS,
  getBackendFunctionForRoute,
} from "./route-map";
import type { ApiGatewayOptions } from "./types";

/** Appwrite/proxy sometimes returns an HTML error page instead of `{ error: string }` JSON. */
function humanizeHtmlOrGatewayError(
  functionName: string,
  status: number,
  raw: string,
): string {
  const trimmed = raw.trim();
  if (status === 408) {
    return (
      `Gateway timeout (408) before the function finished — common for slow image APIs. ` +
      `Restart \`npm run dev\` after vite proxy changes; on self‑hosted stacks increase reverse-proxy read timeouts ` +
      `(e.g. nginx \`proxy_read_timeout\`) in front of the function host. ` +
      `Appwrite → Functions → ${functionName}: execution timeout 300s+; optional env SCRIPTONY_IMAGE_UPSTREAM_TIMEOUT_MS on the function.`
    );
  }
  const looksHtml =
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    /unexpected server error/i.test(trimmed);
  if (!looksHtml) {
    return trimmed.slice(0, 2000);
  }
  return (
    `Appwrite/proxy returned HTML (${status}) instead of JSON — often a function timeout, executor crash, or dev-proxy timeout. ` +
    `Check Appwrite → Functions → ${functionName} (Logs, increase timeout for image generation). ` +
    `After changing vite.config proxy timeouts, restart \`npm run dev\`.`
  );
}

function getResponseErrorCode(errorData: unknown): string | undefined {
  if (!errorData || typeof errorData !== "object" || Array.isArray(errorData)) {
    return undefined;
  }
  const code = (errorData as { code?: unknown }).code;
  return typeof code === "string" && code.trim() ? code.trim() : undefined;
}

function getResponseErrorMessage(
  functionName: string,
  status: number,
  errorData: unknown,
): string {
  if (errorData && typeof errorData === "object" && !Array.isArray(errorData)) {
    const payload = errorData as {
      error?: unknown;
      message?: unknown;
      details?: unknown;
    };
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error.trim();
    }
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message.trim();
    }
    if (typeof payload.details === "string" && payload.details.trim()) {
      return payload.details.trim();
    }
    return JSON.stringify(errorData);
  }

  return humanizeHtmlOrGatewayError(
    functionName,
    status,
    String(errorData ?? ""),
  );
}

/**
 * Makes an API call through the API Gateway
 *
 * Automatically routes the request to the correct backend function
 * based on the route prefix.
 *
 * @example
 * ```typescript
 * // Automatically routed to scriptony-timeline
 * const shots = await apiGateway({
 *   method: 'GET',
 *   route: '/shots/scene-123',
 *   accessToken: token,
 * });
 *
 * // Routed to scriptony-ai (Hono: `/ai/chat`, `/ai/settings`, …)
 * const response = await apiGateway({
 *   method: 'POST',
 *   route: '/ai/chat',
 *   body: { message: 'Hello' },
 *   accessToken: token,
 * });
 * ```
 */
export async function apiGateway<T = any>(
  options: ApiGatewayOptions,
): Promise<T> {
  const { method, route, body, headers = {}, accessToken, timeoutMs } = options;

  // Determine which backend function to use
  const functionName = getBackendFunctionForRoute(route);

  const baseUrl = buildFunctionBaseUrl(functionName);

  const url = joinUrl(baseUrl, route);

  // Build headers
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  const backendConfig = getBackendConfig();
  const sidecarToken =
    route.startsWith("/v1/jobs") &&
    backendConfig.functionsBaseUrl.includes("127.0.0.1")
      ? getSidecarAuthToken()
      : null;
  const bearerToken =
    accessToken || sidecarToken || backendConfig.publicAuthToken;
  if (bearerToken) {
    requestHeaders.Authorization = `Bearer ${bearerToken}`;
  }
  // Note: We do NOT send x-appwrite-user-jwt on browser fetch - it's a non-simple header
  // that triggers CORS preflight. The backend validates the Bearer token instead.

  // Make request with error handling
  let response: Response;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const abortController = new AbortController();
  const clearRequestTimeout = () => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
  };
  try {
    if (typeof timeoutMs === "number" && timeoutMs > 0) {
      timeoutHandle = setTimeout(() => abortController.abort(), timeoutMs);
    }
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: abortController.signal,
    });
  } catch (fetchError: any) {
    clearRequestTimeout();
    const isAbort = fetchError?.name === "AbortError";
    console.error(`[API Gateway] Transport failure`, {
      method,
      route,
      url,
      functionName,
      error: isAbort
        ? `Request timeout after ${timeoutMs}ms`
        : fetchError?.message || String(fetchError),
    });
    throw new ApiGatewayError(
      isAbort
        ? `Request timed out after ${timeoutMs}ms`
        : `Cannot connect to ${functionName}: ${fetchError?.message || "Network request failed"}`,
      {
        layer: "transport",
        functionName,
        route,
        url,
        method,
        status: isAbort ? 408 : undefined,
        statusText: isAbort ? "Request Timeout" : undefined,
        code: isAbort ? "REQUEST_TIMEOUT" : undefined,
        details: fetchError,
      },
    );
  }

  try {
    // Handle response
    if (!response.ok) {
      const errorText = await response.text();

      // Try to parse error as JSON for better logging
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = errorText;
      }

      const errorCode = getResponseErrorCode(errorData);
      const errorMessage = getResponseErrorMessage(
        functionName,
        response.status,
        errorData,
      );
      const layer: ApiGatewayErrorLayer =
        response.status === 401 || response.status === 403
          ? "function-auth"
          : "function-response";

      const logPayload = {
        method,
        route,
        url,
        functionName,
        status: response.status,
        statusText: response.statusText,
        code: errorCode,
        error: errorMessage,
        response: errorData,
      };

      if (layer === "function-auth") {
        console.warn(
          `[API Gateway] Function auth rejected request`,
          logPayload,
        );
      } else {
        console.error(
          `[API Gateway] Function responded with error`,
          logPayload,
        );
      }

      throw new ApiGatewayError(errorMessage, {
        layer,
        functionName,
        route,
        url,
        method,
        status: response.status,
        statusText: response.statusText,
        code: errorCode,
        details: errorData,
      });
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new ApiGatewayError(`Request timed out after ${timeoutMs}ms`, {
        layer: "transport",
        functionName,
        route,
        url,
        method,
        status: 408,
        statusText: "Request Timeout",
        code: "REQUEST_TIMEOUT",
        details: error,
      });
    }
    throw error;
  } finally {
    clearRequestTimeout();
  }
}

/**
 * GET request through API Gateway
 */
export async function apiGet<T = any>(
  route: string,
  accessToken?: string,
): Promise<T> {
  return apiGateway<T>({ method: "GET", route, accessToken });
}

/**
 * POST request through API Gateway
 */
export async function apiPost<T = any>(
  route: string,
  body: any,
  accessToken?: string,
): Promise<T> {
  return apiGateway<T>({ method: "POST", route, body, accessToken });
}

/**
 * PUT request through API Gateway
 */
export async function apiPut<T = any>(
  route: string,
  body: any,
  accessToken?: string,
): Promise<T> {
  return apiGateway<T>({ method: "PUT", route, body, accessToken });
}

/**
 * DELETE request through API Gateway
 */
export async function apiDelete<T = any>(
  route: string,
  accessToken?: string,
): Promise<T> {
  return apiGateway<T>({ method: "DELETE", route, accessToken });
}

/**
 * PATCH request through API Gateway
 */
export async function apiPatch<T = any>(
  route: string,
  body: any,
  accessToken?: string,
): Promise<T> {
  return apiGateway<T>({ method: "PATCH", route, body, accessToken });
}

/**
 * Get API base URL for a specific function
 *
 * @deprecated Use apiGateway() instead for automatic routing
 */
export function getApiBase(functionName: keyof typeof EDGE_FUNCTIONS): string {
  return buildFunctionBaseUrl(EDGE_FUNCTIONS[functionName]);
}
