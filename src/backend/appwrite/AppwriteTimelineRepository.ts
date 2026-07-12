/**
 * AppwriteTimelineRepository — Cloud Timeline CRUD via timeline-api-v2.
 *
 * DRY: Dünner Wrapper um den existierenden timeline-api-v2 Client.
 * Location: src/backend/appwrite/AppwriteTimelineRepository.ts
 */

import type { TimelineRepository } from "../ScriptonyBackend";
import {
  getNodes,
  getNode,
  getNodeChildren,
  createNode,
  updateNode,
  deleteNode,
} from "@/lib/api/timeline-api-v2";
import type {
  CreateNodeRequest,
  UpdateNodeRequest,
} from "@/lib/api/timeline-api-v2";

export class AppwriteTimelineRepository implements TimelineRepository {
  async getByProject(projectId: string): Promise<unknown[]> {
    return getNodes({ projectId });
  }

  async getByScene(sceneId: string): Promise<unknown[]> {
    return getNodeChildren(sceneId, false);
  }

  async create(projectId: string, payload: unknown): Promise<unknown> {
    const p = payload as Record<string, unknown>;
    const req: CreateNodeRequest = {
      projectId,
      templateId: String(p.templateId ?? "default"),
      level: (p.level as 1 | 2 | 3 | 4) ?? 3,
      nodeNumber: (p.nodeNumber as number) ?? 1,
      title: String(p.title ?? "New Node"),
      parentId: (p.parentId as string | null) ?? null,
      description: p.description as string | undefined,
      color: p.color as string | undefined,
      metadata: (p.metadata as Record<string, unknown>) ?? undefined,
    };
    return createNode(req);
  }

  async update(id: string, payload: unknown): Promise<unknown> {
    const p = payload as Record<string, unknown>;
    const req: UpdateNodeRequest = {
      nodeNumber: p.nodeNumber as number | undefined,
      title: p.title as string | undefined,
      description: p.description as string | undefined,
      color: p.color as string | undefined,
      orderIndex: p.orderIndex as number | undefined,
      parentId: (p.parentId as string | null) ?? undefined,
      metadata: (p.metadata as Record<string, unknown>) ?? undefined,
      wordCount: p.wordCount as number | undefined,
    };
    return updateNode(id, req);
  }

  async delete(id: string): Promise<void> {
    return deleteNode(id);
  }
}
