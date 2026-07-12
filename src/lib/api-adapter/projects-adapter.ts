/**
 * Runtime-aware projectsApi (T53/T59).
 * REFACTORED: extracted projects-local.ts (T26).
 *
 * Location: src/lib/api-adapter/projects-adapter.ts
 */

import { cloudFetch } from "./cloud-fetch";
import { isDesktopShell } from "@/runtime/detect-runtime";
import {
  createTauriWorkspaceFs,
  getWorkspaceRoot,
  listWorkspaceProjects,
  restoreWorkspaceScope,
} from "@/local/workspace";
import { dispatchByRuntime, isLocalProfile } from "./runtime-dispatch";
import {
  listLocalProjects,
  getLocalProject,
  createLocalProject,
  updateLocalProject,
  deleteLocalProject,
} from "./projects-local";
import { type LegacyProject } from "./legacy-shape-mappers";

export const projectsApiAdapter = {
  getAll: (): Promise<LegacyProject[]> =>
    dispatchByRuntime(async () => {
      const data = await cloudFetch("/projects");
      const list = Array.isArray(data)
        ? data
        : ((data as { projects?: LegacyProject[] })?.projects ?? []);
      return list as LegacyProject[];
    }, listLocalProjects),

  getOne: (id: string): Promise<LegacyProject | null> =>
    dispatchByRuntime(
      async () => {
        const data = await cloudFetch(`/projects/${id}`);
        const raw = (data as { project?: LegacyProject })?.project ?? data;
        return raw as LegacyProject;
      },
      () => getLocalProject(id),
    ),

  create: (project: Record<string, unknown>): Promise<LegacyProject> =>
    dispatchByRuntime(
      async () => {
        const data = await cloudFetch("/projects", {
          method: "POST",
          body: project,
        });
        const raw = (data as { project?: LegacyProject })?.project ?? data;
        return raw as LegacyProject;
      },
      () => createLocalProject(project),
    ),

  update: (
    id: string,
    project: Record<string, unknown>,
  ): Promise<LegacyProject> =>
    dispatchByRuntime(
      async () => {
        const data = await cloudFetch(`/projects/${id}`, {
          method: "PUT",
          body: project,
        });
        const raw = (data as { project?: LegacyProject })?.project ?? data;
        return raw as LegacyProject;
      },
      () => updateLocalProject(id, project),
    ),

  delete: async (id: string, confirmation: string): Promise<void> => {
    const root = await getWorkspaceRoot();
    if (root && isDesktopShell()) {
      await restoreWorkspaceScope();
      const fs = await createTauriWorkspaceFs();
      const entries = await listWorkspaceProjects(root, fs);
      if (entries.some((e) => e.projectId === id)) {
        await deleteLocalProject(id, confirmation);
        return;
      }
    }
    return dispatchByRuntime(
      async () => {
        await cloudFetch(`/projects/${id}`, {
          method: "DELETE",
        });
      },
      () => deleteLocalProject(id, confirmation),
    );
  },
};

export function isProjectsApiLocal(): boolean {
  return isLocalProfile() && isDesktopShell();
}
