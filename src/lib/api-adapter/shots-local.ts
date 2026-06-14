/**
 * Local shot operations via StructureRepository (T55).
 *
 * Location: src/lib/api-adapter/shots-local.ts
 */

import type { StructureNode } from "@/backend/ScriptonyBackend";
import type { Shot } from "@/lib/types";
import { requireLocalBackend } from "./runtime-dispatch";

function structureToShot(node: StructureNode): Shot {
  const imageUrl =
    typeof node.metadata?.imageUrl === "string"
      ? node.metadata.imageUrl
      : undefined;
  const shotImageMime =
    typeof node.metadata?.shotImageMime === "string"
      ? node.metadata.shotImageMime
      : undefined;
  return {
    id: node.id,
    sceneId: node.parentId ?? "",
    projectId: node.projectId,
    shotNumber: String(node.orderIndex + 1),
    description: node.label,
    orderIndex: node.orderIndex,
    imageUrl,
    shotImageMime,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
}

async function shotsForScene(sceneId: string): Promise<Shot[]> {
  const backend = requireLocalBackend();
  const scene = await backend.structure.getNode(sceneId);
  if (!scene) return [];
  const nodes = await backend.structure.getByProject(scene.projectId);
  return nodes
    .filter((n) => n.type === "shot" && n.parentId === sceneId)
    .map(structureToShot);
}

export async function localGetShots(sceneId: string): Promise<Shot[]> {
  return shotsForScene(sceneId);
}

export async function localGetShot(shotId: string): Promise<Shot> {
  const backend = requireLocalBackend();
  const node = await backend.structure.getNode(shotId);
  if (!node || node.type !== "shot") {
    throw new Error(`Shot ${shotId} not found`);
  }
  return structureToShot(node);
}

export async function localCreateShot(
  sceneId: string,
  shotData: Partial<Shot>,
): Promise<Shot> {
  const backend = requireLocalBackend();
  const scene = await backend.structure.getNode(sceneId);
  if (!scene) throw new Error(`Scene ${sceneId} not found`);
  const projectId = shotData.projectId ?? scene.projectId;
  const node = await backend.structure.create({
    projectId,
    parentId: sceneId,
    type: "shot",
    label: shotData.description ?? `Shot ${shotData.shotNumber ?? ""}`,
    orderIndex: Number(shotData.orderIndex ?? 0),
  });
  return structureToShot(node);
}

export async function localUpdateShot(
  shotId: string,
  updates: Partial<Shot>,
): Promise<Shot> {
  const backend = requireLocalBackend();
  const existing = await backend.structure.getNode(shotId);
  if (!existing || existing.type !== "shot") {
    throw new Error(`Shot ${shotId} not found`);
  }

  const metadata = { ...(existing.metadata ?? {}) };
  if (updates.imageUrl !== undefined) {
    metadata.imageUrl = updates.imageUrl;
  }
  if (updates.shotImageMime !== undefined) {
    metadata.shotImageMime = updates.shotImageMime;
  }

  const node = await backend.structure.update(shotId, {
    label: updates.description ?? updates.shotNumber?.toString(),
    orderIndex: updates.orderIndex,
    metadata,
  });
  return structureToShot(node);
}

export async function localDeleteShot(shotId: string): Promise<void> {
  const backend = requireLocalBackend();
  await backend.structure.delete(shotId);
}

export async function localGetAllShotsByProject(
  projectId: string,
): Promise<Shot[]> {
  const backend = requireLocalBackend(projectId);
  const nodes = await backend.structure.getByProject(projectId);
  return nodes.filter((n) => n.type === "shot").map(structureToShot);
}
