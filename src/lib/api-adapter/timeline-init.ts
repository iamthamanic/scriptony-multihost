/**
 * timeline-init.ts — project initialization for timeline structure.
 * Extracted from timeline-local.ts to respect the 300-line file limit (T26).
 */

import { requireLocalBackend } from "./runtime-dispatch";
import { structureToTimelineNode } from "./timeline-local";
import type {
  TimelineNode,
  InitializeProjectRequest,
} from "@/lib/api/timeline-api-v2";

export async function localInitializeProject(
  request: InitializeProjectRequest,
): Promise<TimelineNode[]> {
  const backend = requireLocalBackend();
  const created: TimelineNode[] = [];
  const { projectId, structure, predefinedNodes } = request;
  const l1 = structure.level_1_count;
  const l2 = structure.level_2_per_parent ?? 0;
  const l3 = structure.level_3_per_parent ?? 0;

  for (let a = 1; a <= l1; a++) {
    const actTitle =
      predefinedNodes?.level_1?.find((n) => n.number === a)?.title ??
      `Act ${a}`;
    const act = await backend.structure.create({
      projectId,
      parentId: null,
      type: "act",
      label: actTitle,
      orderIndex: a - 1,
    });
    created.push(structureToTimelineNode(act, request.templateId));
    for (let s = 1; s <= l2; s++) {
      const seqTitle =
        predefinedNodes?.level_2?.find((n) => n.number === s)?.title ??
        `Sequence ${s}`;
      const seq = await backend.structure.create({
        projectId,
        parentId: act.id,
        type: "sequence",
        label: seqTitle,
        orderIndex: s - 1,
      });
      created.push(structureToTimelineNode(seq, request.templateId));
      for (let sc = 1; sc <= l3; sc++) {
        const sceneTitle =
          predefinedNodes?.level_3?.find((n) => n.number === sc)?.title ??
          `Scene ${sc}`;
        const scene = await backend.structure.create({
          projectId,
          parentId: seq.id,
          type: "scene",
          label: sceneTitle,
          orderIndex: sc - 1,
        });
        created.push(structureToTimelineNode(scene, request.templateId));
      }
    }
  }
  return created;
}
