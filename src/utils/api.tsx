/**
 * Legacy API Wrapper - Backwards Compatibility Layer
 *
 * This file maintains the old API interface for existing code.
 * New code should use /lib/api-client.ts directly.
 *
 * @deprecated Use /lib/api-client.ts instead
 */

// Import directly from api-client to avoid dependency on formatters
import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  unwrapApiResult,
} from "../lib/api-client";
import { API_CONFIG } from "../lib/config";
import {
  projectsApiAdapter,
  worldsApiAdapter,
  categoriesApiAdapter,
  itemsApiAdapter,
} from "../lib/api-adapter";

/**
 * @deprecated Use apiGet, apiPost, etc. from /lib/api-client.ts
 */
async function apiFetch(
  endpoint: string,
  options: { method?: string; body?: any; timeout?: number } = {},
) {
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
      result = requestOptions
        ? await apiPost(endpoint, body, requestOptions)
        : await apiPost(endpoint, body);
      break;
    case "PUT":
      result = requestOptions
        ? await apiPut(endpoint, body, requestOptions)
        : await apiPut(endpoint, body);
      break;
    case "DELETE":
      result = requestOptions
        ? await apiDelete(endpoint, body, requestOptions)
        : await apiDelete(endpoint, body);
      break;
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }

  // Unwrap result (throw on error to maintain backward compatibility)
  return unwrapApiResult(result);
}

// ==================== PROJECTS (runtime-aware via api-adapter) ====================

export const projectsApi = projectsApiAdapter;

// ==================== SCENES ====================

export const scenesApi = {
  getAll: async (projectId: string) => {
    const data = await apiFetch(`/projects/${projectId}/scenes`);
    return data.scenes;
  },

  create: async (projectId: string, scene: any) => {
    const data = await apiFetch(`/projects/${projectId}/scenes`, {
      method: "POST",
      body: scene,
    });
    return data.scene;
  },

  update: async (projectId: string, id: string, scene: any) => {
    const data = await apiFetch(`/projects/${projectId}/scenes/${id}`, {
      method: "PUT",
      body: scene,
    });
    return data.scene;
  },

  delete: async (projectId: string, id: string) => {
    await apiFetch(`/projects/${projectId}/scenes/${id}`, { method: "DELETE" });
  },
};

// ==================== CHARACTERS ====================

export const charactersApi = {
  getAll: async (projectId: string) => {
    const data = await apiFetch(`/projects/${projectId}/characters`);
    return data.characters;
  },

  create: async (projectId: string, character: any) => {
    const data = await apiFetch(`/projects/${projectId}/characters`, {
      method: "POST",
      body: character,
    });
    return data.character;
  },

  update: async (projectId: string, id: string, character: any) => {
    const data = await apiFetch(`/projects/${projectId}/characters/${id}`, {
      method: "PUT",
      body: character,
    });
    return data.character;
  },

  delete: async (projectId: string, id: string) => {
    await apiFetch(`/projects/${projectId}/characters/${id}`, {
      method: "DELETE",
    });
  },
};

// ==================== WORLDS / CATEGORIES / ITEMS (runtime-aware) ====================

export const worldsApi = worldsApiAdapter;
export const categoriesApi = categoriesApiAdapter;
export const itemsApi = itemsApiAdapter;
