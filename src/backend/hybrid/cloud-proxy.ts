/**
 * Cloud-Proxy Helper für Hybrid-Modus (Option B).
 *
 * KISS: Ein zentraler Helfer, der Cloud-API-Calls mit Auth macht,
 * wenn ein Token verfügbar ist, und `null` zurückgibt wenn nicht.
 *
 * Location: src/backend/hybrid/cloud-proxy.ts
 */

import { getAuthToken } from "@/lib/auth/getAuthToken";
import { apiClient } from "@/lib/api-client";
import { getAppwritePublicConfig } from "@/lib/env";

/**
 * True, wenn Appwrite-Config im Env vorhanden ist (unabhängig vom Profil).
 * Ein Desktop-User KANN Appwrite-Credentials haben und trotzdem
 * ein lokales Projekt bearbeiten wollen — dann Hybrid.
 */
export function hasCloudAuthConfig(): boolean {
  const cfg = getAppwritePublicConfig();
  return Boolean(cfg?.endpoint && cfg?.projectId);
}

/**
 * Holt einen JWT für Cloud-Calls, auch wenn das aktuelle Profil "local" ist.
 * Nutzt direkt die Appwrite-Account-Session (bypass LocalAuthAdapter Stubs).
 */
export async function getCloudAccessToken(): Promise<string | null> {
  if (!hasCloudAuthConfig()) return null;
  return getAuthToken();
}

export interface CloudCallOptions {
  /** Methode für apiClient */
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Route (z. B. `/ai/image/generate-cover`) */
  route: string;
  /** Optional JSON body für POST/PUT/PATCH */
  body?: Record<string, unknown>;
}

/**
 * Führt einen Cloud-API-Call aus, wenn ein Token verfügbar ist.
 * @returns `{ ok: true, data: T }` oder `{ ok: false }` wenn kein Auth / Fehler.
 */
export async function tryCloudCall<T>(
  options: CloudCallOptions,
): Promise<{ ok: true; data: T } | { ok: false }> {
  const token = await getCloudAccessToken();
  if (!token) {
    return { ok: false };
  }

  try {
    let result: unknown;
    switch (options.method) {
      case "GET":
        result = await apiClient.get<T>(options.route);
        break;
      case "POST":
        result = await apiClient.post<T>(options.route, options.body);
        break;
      case "PUT":
        result = await apiClient.put<T>(options.route, options.body);
        break;
      case "PATCH":
        result = await apiClient.patch<T>(options.route, options.body);
        break;
      case "DELETE":
        result = await apiClient.delete<T>(options.route, options.body);
        break;
      default:
        return { ok: false };
    }
    return { ok: true, data: result as T };
  } catch (e) {
    console.warn(
      `[CloudProxy] ${options.method} ${options.route} fehlgeschlagen:`,
      e instanceof Error ? e.message : e,
    );
    return { ok: false };
  }
}
