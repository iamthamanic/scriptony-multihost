/**
 * worldsApiAdapter + shared helpers for worldbuilding.
 * Extracted from worlds-adapter.ts to respect the 300-line file limit (T26).
 */

import { cloudFetch } from "./cloud-fetch";

const WORLDS_API_TIMEOUT_MS = 30000;
import {
  dispatchByRuntime,
  getOpenLocalProjectId,
  localNotSupported,
  requireLocalBackend,
} from "./runtime-dispatch";
import {
  localWorldIdForProject,
  projectIdFromLocalWorldId,
  type LegacyWorld,
} from "./legacy-shape-mappers";


function syntheticLocalWorld(projectId: string, title: string): LegacyWorld {
  const worldId = localWorldIdForProject(projectId);
  const now = new Date().toISOString();
  return {
    id: worldId,
    name: title || "Projekt-Welt",
    description: "Lokale Worldbuilding-Einträge aus diesem Projekt.",
    createdAt: now,
    updatedAt: now,
    updated_at: now,
    organizationId: "local",
    categoryCount: 0,
    itemCount: 0,
  };
}

async function listLocalWorlds(): Promise<LegacyWorld[]> {
  const projectId = getOpenLocalProjectId();
  if (!projectId) return [];
  const backend = requireLocalBackend();
  const project = await backend.projects.get(projectId);
  if (!project) return [];
  return [syntheticLocalWorld(projectId, project.name)];
}

export async function resolveLocalProjectId(worldId: string): Promise<string> {
  const fromWorld = projectIdFromLocalWorldId(worldId);
  if (fromWorld) return fromWorld;
  const open = getOpenLocalProjectId();
  if (open) return open;
  localNotSupported("Kein lokales Projekt geöffnet.");
}

export function categoryIdForSlug(slug: string): string {
  return `local-cat-${slug}`;
}

export const worldsApiAdapter = {
  getAll: (): Promise<LegacyWorld[]> =>
    dispatchByRuntime(async () => {
      const data = await cloudFetch("/worlds", {
        timeout: WORLDS_API_TIMEOUT_MS,
      });
      const list = Array.isArray(data)
        ? data
        : ((data as { worlds?: unknown[] })?.worlds ?? []);
      return list as LegacyWorld[];
    }, listLocalWorlds),

  getOne: (id: string): Promise<LegacyWorld | null> =>
    dispatchByRuntime(
      async () => {
        const data = await cloudFetch(`/worlds/${id}`);
        return ((data as { world?: LegacyWorld })?.world ??
          data) as LegacyWorld;
      },
      async () => {
        const projectId =
          projectIdFromLocalWorldId(id) ?? getOpenLocalProjectId();
        if (!projectId) return null;
        const backend = requireLocalBackend();
        const project = await backend.projects.get(projectId);
        return project ? syntheticLocalWorld(projectId, project.name) : null;
      },
    ),

  create: (_world: Record<string, unknown>): Promise<LegacyWorld> =>
    dispatchByRuntime(
      async () => {
        const data = await cloudFetch("/worlds", {
          method: "POST",
          body: _world,
        });
        return ((data as { world?: LegacyWorld })?.world ??
          data) as LegacyWorld;
      },
      async () => {
        localNotSupported(
          "Separate Welten anlegen ist im lokalen Modus nicht verfügbar. Nutze Worldbuilding-Einträge im geöffneten Projekt.",
        );
      },
    ),

  update: (
    id: string,
    world: Record<string, unknown>,
  ): Promise<LegacyWorld | null> =>
    dispatchByRuntime(
      async () => {
        const data = await cloudFetch(`/worlds/${id}`, {
          method: "PUT",
          body: world,
        });
        return ((data as { world?: LegacyWorld })?.world ??
          data) as LegacyWorld;
      },
      async () => {
        const projectId = await resolveLocalProjectId(id);
        const backend = requireLocalBackend();
        await backend.projects.update(projectId, {
          name: typeof world.name === "string" ? world.name : undefined,
          description:
            typeof world.description === "string"
              ? world.description
              : undefined,
        });
        const p = await backend.projects.get(projectId);
        return p ? syntheticLocalWorld(projectId, p.name) : null;
      },
    ),

  delete: (_id: string, _password: string) =>
    dispatchByRuntime(
      async () => {
        await cloudFetch(`/worlds/${_id}`, {
          method: "DELETE",
          body: { password: _password },
        });
      },
      async () => {
        localNotSupported(
          "Welten löschen ist im lokalen Modus nicht verfügbar.",
        );
      },
    ),
};
