/**
 * T19 — Zentraler Auth-Fetch Helper fuer legacy stats/logs endpoints.
 *
 * @deprecated — Frontend soll langfristig auf apiClient (API Gateway) migrieren.
 */

import { getAuthToken } from "../auth/getAuthToken";

export async function fetchWithAuth(
	url: string,
	options?: Omit<RequestInit, "headers"> & { body?: unknown },
): Promise<Response> {
	const token = await getAuthToken();
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	return fetch(url, {
		...options,
		headers,
		...(options?.body ? { body: JSON.stringify(options.body) } : {}),
	});
}
