/**
 * itemsApiAdapter for worldbuilding items.
 * Extracted from worlds-adapter.ts to respect the 300-line file limit (T26).
 */

import { dispatchByRuntime, requireLocalBackend } from "./runtime-dispatch";
import { resolveLocalProjectId, categoryIdForSlug } from "./worlds-core";
import {
  worldbuildingToLegacyItem,
  type LegacyWorldItem,
} from "./legacy-shape-mappers";
import { cloudFetch } from "./cloud-fetch";

export const itemsApiAdapter = {
  getAll: (worldId: string, categoryId: string) =>
    dispatchByRuntime(
      async () => {
        const data = (await cloudFetch(
          `/worlds/${worldId}/categories/${categoryId}/items`,
        )) as { items?: unknown[] };
        return data.items ?? [];
      },
      async () => {
        const projectId = await resolveLocalProjectId(worldId);
        const backend = requireLocalBackend();
        const slug = categoryId.replace(/^local-cat-/, "");
        const entries = await backend.worldbuilding.list(projectId);
        return entries
          .filter((e) => (e.category || "custom") === slug)
          .map((e) =>
            worldbuildingToLegacyItem(
              e,
              worldId,
              categoryIdForSlug(e.category || "custom"),
            ),
          );
      },
    ),

  getAllForWorld: (worldId: string): Promise<LegacyWorldItem[]> =>
    dispatchByRuntime(
      async () => {
        const data = (await cloudFetch(`/worlds/${worldId}/items`)) as {
          items?: LegacyWorldItem[];
        };
        return data.items ?? [];
      },
      async () => {
        const projectId = await resolveLocalProjectId(worldId);
        const backend = requireLocalBackend();
        const entries = await backend.worldbuilding.list(projectId);
        return entries.map((e) => {
          const slug = e.category || "custom";
          return worldbuildingToLegacyItem(e, worldId, categoryIdForSlug(slug));
        });
      },
    ),

  create: (
    worldId: string,
    categoryId: string,
    item: Record<string, unknown>,
  ) =>
    dispatchByRuntime(
      async () => {
        const data = (await cloudFetch(
          `/worlds/${worldId}/categories/${categoryId}/items`,
          { method: "POST", body: item },
        )) as { item?: unknown };
        return data.item;
      },
      async () => {
        const projectId = await resolveLocalProjectId(worldId);
        const backend = requireLocalBackend();
        const slug = categoryId.replace(/^local-cat-/, "");
        const created = await backend.worldbuilding.create(projectId, {
          category: slug,
          label: typeof item.title === "string" ? item.title : "Eintrag",
          content: typeof item.content === "string" ? item.content : "",
        });
        return worldbuildingToLegacyItem(
          created,
          worldId,
          categoryIdForSlug(created.category),
        );
      },
    ),

  update: (
    worldId: string,
    categoryId: string,
    id: string,
    item: Record<string, unknown>,
  ) =>
    dispatchByRuntime(
      async () => {
        const data = (await cloudFetch(
          `/worlds/${worldId}/categories/${categoryId}/items/${id}`,
          { method: "PUT", body: item },
        )) as { item?: unknown };
        return data.item;
      },
      async () => {
        const backend = requireLocalBackend();
        const updated = await backend.worldbuilding.update(id, {
          label: typeof item.title === "string" ? item.title : undefined,
          content: typeof item.content === "string" ? item.content : undefined,
        });
        return worldbuildingToLegacyItem(
          updated,
          worldId,
          categoryIdForSlug(updated.category),
        );
      },
    ),

  delete: (worldId: string, _categoryId: string, id: string) =>
    dispatchByRuntime(
      async () => {
        await cloudFetch(
          `/worlds/${worldId}/categories/${_categoryId}/items/${id}`,
          {
            method: "DELETE",
          },
        );
      },
      async () => {
        const backend = requireLocalBackend();
        await backend.worldbuilding.delete(id);
      },
    ),
};
