/**
 * AppwriteStructureRepository — cloud structure nodes via API gateway (T40).
 */

import type {
  StructureNode,
  StructureRepository,
} from "../ScriptonyBackend";
import type { AuthClient } from "@/lib/auth/AuthClient";
import { apiPost, unwrapApiResult } from "@/lib/api-client";
import type { TimelineNode } from "@/lib/api/timeline-api-v2";

function mapNodeTypeToLevel(nodeType: string): 1 | 2 | 3 | 4 {
  const t = nodeType.toLowerCase();
  if (t === "act" || t === "root") return 1;
  if (t === "sequence" || t === "chapter") return 2;
  if (t === "scene") return 3;
  return 4;
}

function mapTimelineToStructureNode(
  raw: TimelineNode,
  projectId: string,
  fallbackType: string,
  orderIndex: number,
): StructureNode {
  const id = String(raw.id ?? "");
  return {
    id,
    projectId,
    parentId: raw.parentId ?? null,
    type: fallbackType,
    label: raw.title ?? "Node",
    orderIndex: raw.orderIndex ?? orderIndex,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

export class AppwriteStructureRepository implements StructureRepository {
  constructor(private readonly auth: AuthClient) {}

  private async requireToken(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) {
      throw new Error("Cloud auth required for structure operations");
    }
    return token;
  }

  async getByProject(_projectId: string): Promise<StructureNode[]> {
    throw new Error("AppwriteStructureRepository.getByProject not implemented");
  }

  async getNode(_id: string): Promise<StructureNode | null> {
    throw new Error("AppwriteStructureRepository.getNode not implemented");
  }

  async create(
    node: Omit<StructureNode, "id" | "createdAt" | "updatedAt">,
  ): Promise<StructureNode> {
    const token = await this.requireToken();
    const result = await apiPost<{ node?: TimelineNode } & TimelineNode>(
      "/nodes",
      {
        projectId: node.projectId,
        templateId: "four-act-structure",
        level: mapNodeTypeToLevel(node.type),
        parentId: node.parentId ?? null,
        nodeNumber: node.orderIndex + 1,
        title: node.label,
        description: "",
      },
      { accessToken: token },
    );
    const data = unwrapApiResult(result);
    const created =
      (data as { node?: TimelineNode })?.node ?? (data as TimelineNode);
    return mapTimelineToStructureNode(
      created,
      node.projectId,
      node.type,
      node.orderIndex,
    );
  }

  async update(
    _id: string,
    _patch: Partial<StructureNode>,
  ): Promise<StructureNode> {
    throw new Error("AppwriteStructureRepository.update not implemented");
  }

  async delete(_id: string): Promise<void> {
    throw new Error("AppwriteStructureRepository.delete not implemented");
  }
}
