/**
 * API gateway error types for transport, auth, and function response failures.
 * Location: src/lib/api-gateway/gateway-errors.ts
 */

export type ApiGatewayErrorLayer =
  | "transport"
  | "function-auth"
  | "function-response";

type ApiGatewayErrorInit = {
  layer: ApiGatewayErrorLayer;
  functionName: string;
  route: string;
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  code?: string;
  details?: unknown;
};

export class ApiGatewayError extends Error {
  readonly layer: ApiGatewayErrorLayer;
  readonly functionName: string;
  readonly route: string;
  readonly url: string;
  readonly method: string;
  readonly status?: number;
  readonly statusText?: string;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, init: ApiGatewayErrorInit) {
    super(message);
    this.name = "ApiGatewayError";
    this.layer = init.layer;
    this.functionName = init.functionName;
    this.route = init.route;
    this.url = init.url;
    this.method = init.method;
    this.status = init.status;
    this.statusText = init.statusText;
    this.code = init.code;
    this.details = init.details;
  }
}
