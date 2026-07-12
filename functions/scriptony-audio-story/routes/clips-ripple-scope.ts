/**
 * Validates ripple request payloads: all referenced IDs belong to one project.
 */

import { C, getDocument } from "../../_shared/appwrite-db";

function clipProjectId(raw: Record<string, unknown>): string {
  return String(raw.projectId ?? raw.project_id ?? "");
}

export async function assertRipplePayloadInProject(
  projectId: string,
  allClips: unknown[],
  allScenes: unknown[],
  allSequences: unknown[],
  allActs: unknown[],
): Promise<void> {
  for (const raw of allClips) {
    const item = raw as Record<string, unknown>;
    const id = String(item.id ?? "");
    if (!id) continue;
    const doc = await getDocument(C.audio_clips, id);
    if (!doc || String(doc.project_id) !== projectId) {
      throw new Error(`Clip ${id} is outside project scope`);
    }
    const bodyProject = clipProjectId(item);
    if (bodyProject && bodyProject !== projectId) {
      throw new Error(`Clip ${id} declares foreign project_id`);
    }
  }

  const nodeIds = new Set<string>();
  for (const list of [allScenes, allSequences, allActs]) {
    for (const raw of list) {
      const item = raw as Record<string, unknown>;
      const id = String(item.id ?? "");
      if (id) nodeIds.add(id);
    }
  }

  for (const nodeId of nodeIds) {
    const doc = await getDocument(C.timeline_nodes, nodeId);
    if (!doc || String(doc.project_id) !== projectId) {
      throw new Error(`Timeline node ${nodeId} is outside project scope`);
    }
  }
}
