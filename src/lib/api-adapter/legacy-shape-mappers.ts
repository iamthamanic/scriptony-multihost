/**
 * Map ScriptonyBackend domain types to legacy utils/api shapes (T53).
 *
 * Location: src/lib/api-adapter/legacy-shape-mappers.ts
 */

import type {
  Project,
  StructureNode,
  WorldbuildingEntry,
} from "@/backend/ScriptonyBackend";
import type { Character } from "@/lib/types";
import type { WorkspaceProjectEntry } from "@/local/workspace";

/** Legacy project shape expected by ProjectsPage / HomePage. */
export interface LegacyProject {
  id: string;
  title: string;
  description?: string;
  project_type?: string;
  projectType?: string;
  type?: string;
  cover_image_url?: string;
  linkedWorldId?: string | null;
  world_id?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lastEdited?: string;
  last_edited?: string;
  localDirPath?: string;
  user_id?: string;
  organizationId?: string;
  [key: string]: unknown;
}

export function toLegacyProject(
  p: Project,
  extras?: Partial<LegacyProject>,
): LegacyProject {
  const projectId = p.$id;
  return {
    id: projectId,
    title: p.name,
    description: p.description,
    project_type: p.projectType,
    projectType: p.projectType,
    type: p.projectType,
    linkedWorldId: `local-world-${projectId}`,
    world_id: `local-world-${projectId}`,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    user_id: p.userId,
    organizationId: "local",
    ...extras,
  };
}

export function workspaceEntryToLegacyProject(
  entry: WorkspaceProjectEntry,
): LegacyProject {
  const type = entry.projectType ?? "film";
  return {
    id: entry.projectId,
    title: entry.title,
    project_type: type,
    projectType: type,
    type,
    localDirPath: entry.dirPath,
    linkedWorldId: `local-world-${entry.projectId}`,
    world_id: `local-world-${entry.projectId}`,
    createdAt: entry.updatedAt,
    updatedAt: entry.updatedAt,
    lastEdited: entry.updatedAt,
    last_edited: entry.updatedAt,
    organizationId: "local",
  };
}

export interface LegacyScene {
  id: string;
  project_id: string;
  projectId: string;
  title: string;
  [key: string]: unknown;
}

export function structureNodeToLegacyScene(node: StructureNode): LegacyScene {
  return {
    id: node.id,
    project_id: node.projectId,
    projectId: node.projectId,
    title: node.label,
    name: node.label,
    order_index: node.orderIndex,
    orderIndex: node.orderIndex,
    parent_id: node.parentId,
    parentId: node.parentId,
    type: node.type,
    created_at: node.createdAt,
    updated_at: node.updatedAt,
  };
}

export function characterToLegacy(character: Character): Character {
  return character;
}

export function worldbuildingToLegacyItem(
  entry: WorldbuildingEntry,
  worldId: string,
  categoryId: string,
): LegacyWorldItem {
  return {
    id: entry.id,
    worldId,
    world_id: worldId,
    categoryId,
    category_id: categoryId,
    title: entry.label,
    content: entry.content,
    tags: [],
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

/** Legacy world row for WorldbuildingPage / HomePage. */
export interface LegacyWorld {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  updated_at?: string;
  created_at?: string;
  linkedProjectId?: string | null;
  organizationId?: string;
  categoryCount?: number;
  itemCount?: number;
  [key: string]: unknown;
}

/** Legacy world item row. */
export interface LegacyWorldItem {
  id: string;
  worldId?: string;
  world_id?: string;
  categoryId?: string;
  category_id?: string;
  title?: string;
  name?: string;
  content?: string;
  lastEdited?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export function localWorldIdForProject(projectId: string): string {
  return `local-world-${projectId}`;
}

export function projectIdFromLocalWorldId(worldId: string): string | null {
  if (!worldId.startsWith("local-world-")) return null;
  return worldId.slice("local-world-".length);
}
