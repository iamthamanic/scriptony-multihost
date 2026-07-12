/**
 * categoriesApiAdapter for worldbuilding categories.
 * Extracted from worlds-adapter.ts to respect the 300-line file limit (T26).
 */

import {
  dispatchByRuntime,
  localNotSupported,
  requireLocalBackend,
} from "./runtime-dispatch";
import { resolveLocalProjectId, categoryIdForSlug } from "./worlds-core";
import { cloudFetch } from "./cloud-fetch";

export const categoriesApiAdapter = {
  getAll: (worldId: string) =>
    dispatchByRuntime(
      async () => {
        const data = (await cloudFetch(`/worlds/${worldId}/categories`)) as {
          categories?: unknown[];
        };
        return data.categories ?? [];
      },
      async () => {
        const projectId = await resolveLocalProjectId(worldId);
        const backend = requireLocalBackend();
        const entries = await backend.worldbuilding.list(projectId);
        const slugs = [...new Set(entries.map((e) => e.category || "custom"))];
        const now = new Date().toISOString();
        return slugs.map((slug) => ({
          id: categoryIdForSlug(slug),
          worldId,
          name: slug,
          type: slug,
          createdAt: now,
          updatedAt: now,
          itemCount: entries.filter((e) => e.category === slug).length,
        }));
      },
    ),

  create: (worldId: string, category: Record<string, unknown>) =>
    dispatchByRuntime(
      async () => {
        const data = (await cloudFetch(`/worlds/${worldId}/categories`, {
          method: "POST",
          body: category,
        })) as { category?: unknown };
        return data.category;
      },
      async () => {
        const slug =
          typeof category.type === "string"
            ? category.type
            : typeof category.name === "string"
              ? category.name
              : "custom";
        const now = new Date().toISOString();
        return {
          id: categoryIdForSlug(slug),
          worldId,
          name: typeof category.name === "string" ? category.name : slug,
          type: slug,
          createdAt: now,
          updatedAt: now,
        };
      },
    ),

  update: (worldId: string, id: string, category: Record<string, unknown>) =>
    dispatchByRuntime(
      async () => {
        const data = (await cloudFetch(`/worlds/${worldId}/categories/${id}`, {
          method: "PUT",
          body: category,
        })) as { category?: unknown };
        return data.category;
      },
      async () => ({ id, worldId, ...category }),
    ),

  delete: (worldId: string, id: string) =>
    dispatchByRuntime(
      async () => {
        await cloudFetch(`/worlds/${worldId}/categories/${id}`, {
          method: "DELETE",
        });
      },
      async () => {
        localNotSupported(
          "Kategorien löschen im lokalen Modus: Einträge einzeln entfernen.",
        );
      },
    ),
};
