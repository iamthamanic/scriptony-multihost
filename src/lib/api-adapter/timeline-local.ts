/**
 * Local timeline operations via StructureRepository (T55).
 * REFACTORED: extracted timeline-batch.ts, timeline-init.ts (T26).
 *
 * Location: src/lib/api-adapter/timeline-local.ts
 */

import type { StructureNode } from "@/backend/ScriptonyBackend";
import type {
  BulkCreateRequest,
  CreateNodeRequest,
  TimelineNode,
  UpdateNodeRequest,
} from "@/lib/api/timeline-api-v2";
import { requireLocalBackend } from "./runtime-dispatch";

const TYPE_LEVEL: Record<string, 1 | 2 | 3 | 4> = {
  act: 1,
  season: 1,
  part: 1,
  sequence: 2,
  episode: 2,
  chapter: 2,
  scene: 3,
  section: 3,
  beat: 3,
  shot: 4,
};

const LEVEL_TYPE: Record<number, string> = {
  1: "act",
  2: "sequence",
  3: "scene",
  4: "shot",
};

function levelForType(type: string): 1 | 2 | 3 | 4 {
  return TYPE_LEVEL[type] ?? 3;
}

export function structureToTimelineNode(
  node: StructureNode,
  templateId = "film",
): TimelineNode {
  return {
    id: node.id,
    projectId: node.projectId,
    templateId,
    level: levelForType(node.type),
    parentId: node.parentId ?? null,
    nodeNumber: node.orderIndex + 1,
    title: node.label,
    orderIndex: node.orderIndex,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    metadata: { node_type: node.type },
  };
}

async function allNodes(projectId: string): Promise<StructureNode[]> {
  const backend = requireLocalBackend();
  return backend.structure.getByProject(projectId);
}

export async function localGetNodes(filters: {
  projectId: string;
  level?: 1 | 2 | 3 | 4;
  parentId?: string | null;
  templateId?: string;
}): Promise<TimelineNode[]> {
  const nodes = await allNodes(filters.projectId);
  const templateId = filters.templateId ?? "film";
  return nodes
    .filter((n) => {
      if (
        filters.level !== undefined &&
        levelForType(n.type) !== filters.level
      ) {
        return false;
      }
      if (filters.parentId !== undefined) {
        const pid = n.parentId ?? null;
        if (pid !== filters.parentId) return false;
      }
      return true;
    })
    .map((n) => structureToTimelineNode(n, templateId));
}

export async function localGetNode(nodeId: string): Promise<TimelineNode> {
  const backend = requireLocalBackend();
  const node = await backend.structure.getNode(nodeId);
  if (!node) throw new Error(`Node ${nodeId} not found`);
  return structureToTimelineNode(node);
}

export async function localGetNodeChildren(
  nodeId: string,
  recursive = false,
): Promise<TimelineNode[]> {
  const backend = requireLocalBackend();
  const parent = await backend.structure.getNode(nodeId);
  if (!parent) return [];
  const nodes = await backend.structure.getByProject(parent.projectId);
  const direct = nodes.filter((n) => n.parentId === nodeId);
  if (!recursive) {
    return direct.map((n) => structureToTimelineNode(n));
  }
  const ids = new Set<string>([nodeId]);
  const out: StructureNode[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of nodes) {
      if (n.parentId && ids.has(n.parentId) && !ids.has(n.id)) {
        ids.add(n.id);
        out.push(n);
        changed = true;
      }
    }
  }
  return out.map((n) => structureToTimelineNode(n));
}

export async function localCreateNode(
  request: CreateNodeRequest,
): Promise<TimelineNode> {
  const backend = requireLocalBackend();
  const type = LEVEL_TYPE[request.level] ?? "scene";
  const node = await backend.structure.create({
    projectId: request.projectId,
    parentId: request.parentId ?? null,
    type,
    label: request.title,
    orderIndex: request.nodeNumber - 1,
  });
  return structureToTimelineNode(node, request.templateId);
}

export async function localUpdateNode(
  nodeId: string,
  updates: UpdateNodeRequest,
): Promise<TimelineNode> {
  const backend = requireLocalBackend();
  const node = await backend.structure.update(nodeId, {
    label: updates.title,
    orderIndex: updates.orderIndex,
    parentId: updates.parentId ?? undefined,
  });
  return structureToTimelineNode(node);
}

export async function localDeleteNode(nodeId: string): Promise<void> {
  const backend = requireLocalBackend();
  await backend.structure.delete(nodeId);
}

export async function localReorderNodes(nodeIds: string[]): Promise<void> {
  const backend = requireLocalBackend();
  for (let i = 0; i < nodeIds.length; i++) {
    await backend.structure.update(nodeIds[i], { orderIndex: i });
  }
}

export async function localBulkCreateNodes(
  request: BulkCreateRequest,
): Promise<TimelineNode[]> {
  const out: TimelineNode[] = [];
  for (const node of request.nodes) {
    out.push(await localCreateNode(node));
  }
  return out;
}

export async function localGetAllProjectNodes(
  projectId: string,
): Promise<TimelineNode[]> {
  return localGetNodes({ projectId });
}

export async function localGetActs(projectId: string): Promise<TimelineNode[]> {
  return localGetNodes({ projectId, level: 1 });
}

export async function localGetSequences(
  projectId: string,
  parentId?: string,
): Promise<TimelineNode[]> {
  return localGetNodes({
    projectId,
    level: 2,
    ...(parentId !== undefined ? { parentId } : {}),
  });
}

export async function localGetScenes(
  projectId: string,
  parentId?: string,
): Promise<TimelineNode[]> {
  return localGetNodes({
    projectId,
    level: 3,
    ...(parentId !== undefined ? { parentId } : {}),
  });
}

export async function localGetShots(
  projectId: string,
  parentId?: string,
): Promise<TimelineNode[]> {
  return localGetNodes({
    projectId,
    level: 4,
    ...(parentId !== undefined ? { parentId } : {}),
  });
}

export async function localGetNodePath(
  nodeId: string,
): Promise<TimelineNode[]> {
  const backend = requireLocalBackend();
  const nodes = await backend.structure.getNode(nodeId);
  if (!nodes) return [];
  const all = await backend.structure.getByProject(nodes.projectId);
  const byId = new Map(all.map((n) => [n.id, n]));
  const path: StructureNode[] = [];
  let current: StructureNode | undefined = nodes;
  while (current) {
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path.map((n) => structureToTimelineNode(n));
}

// Re-exports from extracted modules (T26)
export {
  localBatchLoadTimeline,
  localUltraBatchLoadProject,
} from "./timeline-batch";
export { localInitializeProject } from "./timeline-init";
