/**
 * Shared API gateway request types.
 * Location: src/lib/api-gateway/types.ts
 */

export interface ApiGatewayOptions {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  route: string;
  body?: any;
  headers?: Record<string, string>;
  accessToken?: string;
  timeoutMs?: number;
}
