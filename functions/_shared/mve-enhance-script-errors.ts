/**
 * Typed HTTP errors for MVE Enhance Script route.
 * Location: functions/_shared/mve-enhance-script-errors.ts
 */

export class EnhanceScriptHttpError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "EnhanceScriptHttpError";
    this.statusCode = statusCode;
  }
}

export function badEnhanceRequest(message: string): EnhanceScriptHttpError {
  return new EnhanceScriptHttpError(message, 400);
}

export function tooManyEnhanceRequests(): EnhanceScriptHttpError {
  return new EnhanceScriptHttpError(
    "Zu viele Anfragen. Bitte kurz warten.",
    429,
  );
}
