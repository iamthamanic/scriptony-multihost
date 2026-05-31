/**
 * cloudFetch — shared HTTP helper for API adapters.
 * Extracted from multiple adapters to eliminate duplication (DRY/T26).
 */

import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  unwrapApiResult,
} from "@/lib/api-client";

export async function cloudFetch(
  endpoint: string,
  options: { method?: string; body?: unknown; timeout?: number } = {},
): Promise<unknown> {
  const { method = "GET", body, timeout } = options;
  const requestOptions = typeof timeout === "number" ? { timeout } : undefined;
  let result;
  switch (method.toUpperCase()) {
    case "GET":
      result = requestOptions
        ? await apiGet(endpoint, requestOptions)
        : await apiGet(endpoint);
      break;
    case "POST":
      result = await apiPost(endpoint, body);
      break;
    case "PUT":
      result = await apiPut(endpoint, body);
      break;
    case "DELETE":
      result = await apiDelete(endpoint, body);
      break;
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
  return unwrapApiResult(result);
}
