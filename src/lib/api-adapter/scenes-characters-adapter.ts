/**
 * Runtime-aware scenesApi + charactersApi (T53).
 *
 * Location: src/lib/api-adapter/scenes-characters-adapter.ts
 */

import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  unwrapApiResult,
} from "@/lib/api-client";
import { dispatchByRuntime, requireLocalBackend } from "./runtime-dispatch";
import {
  cloudCreateCharacter,
  cloudDeleteCharacter,
  cloudGetCharacters,
  cloudUpdateCharacter,
} from "@/lib/api/project-characters-cloud-http";
import {
  characterToLegacy,
  structureNodeToLegacyScene,
} from "./legacy-shape-mappers";
import type { StructureNode } from "@/backend/ScriptonyBackend";
import type { Character } from "@/lib/types";

function characterPatchFromRecord(
  character: Record<string, unknown>,
): Partial<Character> {
  const role = character.role;
  return {
    name: typeof character.name === "string" ? character.name : undefined,
    role:
      role === "protagonist" ||
      role === "antagonist" ||
      role === "supporting" ||
      role === "minor"
        ? role
        : undefined,
    description:
      typeof character.description === "string"
        ? character.description
        : undefined,
  };
}

async function cloudFetch(
  endpoint: string,
  options: { method?: string; body?: unknown } = {},
): Promise<unknown> {
  const { method = "GET", body } = options;
  let result;
  switch (method.toUpperCase()) {
    case "GET":
      result = await apiGet(endpoint);
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

function filterScenes(nodes: StructureNode[]): StructureNode[] {
  return nodes.filter((n) => n.type === "scene");
}

export const scenesApiAdapter = {
  getAll: (projectId: string) =>
    dispatchByRuntime(
      async () => {
        const data = (await cloudFetch(`/projects/${projectId}/scenes`)) as {
          scenes?: unknown[];
        };
        return data.scenes ?? [];
      },
      async () => {
        const backend = requireLocalBackend();
        const nodes = await backend.structure.getByProject(projectId);
        return filterScenes(nodes).map(structureNodeToLegacyScene);
      },
    ),

  create: (projectId: string, scene: Record<string, unknown>) =>
    dispatchByRuntime(
      async () => {
        const data = (await cloudFetch(`/projects/${projectId}/scenes`, {
          method: "POST",
          body: scene,
        })) as { scene?: unknown };
        return data.scene;
      },
      async () => {
        const backend = requireLocalBackend();
        const node = await backend.structure.create({
          projectId,
          parentId:
            typeof scene.parent_id === "string"
              ? scene.parent_id
              : typeof scene.parentId === "string"
                ? scene.parentId
                : null,
          type: "scene",
          label:
            typeof scene.title === "string"
              ? scene.title
              : typeof scene.name === "string"
                ? scene.name
                : "Neue Szene",
          orderIndex: Number(scene.order_index ?? scene.orderIndex ?? 0),
        });
        return structureNodeToLegacyScene(node);
      },
    ),

  update: (projectId: string, id: string, scene: Record<string, unknown>) =>
    dispatchByRuntime(
      async () => {
        const data = (await cloudFetch(`/projects/${projectId}/scenes/${id}`, {
          method: "PUT",
          body: scene,
        })) as { scene?: unknown };
        return data.scene;
      },
      async () => {
        const backend = requireLocalBackend();
        const node = await backend.structure.update(id, {
          label:
            typeof scene.title === "string"
              ? scene.title
              : typeof scene.name === "string"
                ? scene.name
                : undefined,
          orderIndex:
            scene.order_index != null || scene.orderIndex != null
              ? Number(scene.order_index ?? scene.orderIndex)
              : undefined,
        });
        return structureNodeToLegacyScene(node);
      },
    ),

  delete: (projectId: string, id: string) =>
    dispatchByRuntime(
      async () => {
        await cloudFetch(`/projects/${projectId}/scenes/${id}`, {
          method: "DELETE",
        });
      },
      async () => {
        const backend = requireLocalBackend();
        await backend.structure.delete(id);
      },
    ),
};

export const charactersApiAdapter = {
  getAll: (projectId: string) =>
    dispatchByRuntime(
      async () => {
        const list = await cloudGetCharacters(projectId);
        return list.map(characterToLegacy);
      },
      async () => {
        const backend = requireLocalBackend();
        const list = await backend.characters.list(projectId);
        return list.map(characterToLegacy);
      },
    ),

  create: (projectId: string, character: Record<string, unknown>) =>
    dispatchByRuntime(
      async () => {
        const created = await cloudCreateCharacter(
          projectId,
          characterPatchFromRecord(character),
        );
        return characterToLegacy(created);
      },
      async () => {
        const backend = requireLocalBackend();
        const created = await backend.characters.create(projectId, {
          name:
            typeof character.name === "string" ? character.name : "Character",
          role: character.role as
            | "protagonist"
            | "antagonist"
            | "supporting"
            | undefined,
          description:
            typeof character.description === "string"
              ? character.description
              : undefined,
        });
        return characterToLegacy(created);
      },
    ),

  update: (projectId: string, id: string, character: Record<string, unknown>) =>
    dispatchByRuntime(
      async () => {
        const updated = await cloudUpdateCharacter(
          id,
          characterPatchFromRecord(character),
        );
        return characterToLegacy(updated);
      },
      async () => {
        const backend = requireLocalBackend();
        const updated = await backend.characters.update(id, {
          name: typeof character.name === "string" ? character.name : undefined,
          description:
            typeof character.description === "string"
              ? character.description
              : undefined,
        });
        return characterToLegacy(updated);
      },
    ),

  delete: (projectId: string, id: string) =>
    dispatchByRuntime(
      async () => {
        await cloudDeleteCharacter(id);
      },
      async () => {
        const backend = requireLocalBackend();
        await backend.characters.delete(id);
      },
    ),
};
