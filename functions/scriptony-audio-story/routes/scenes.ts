/**
 * Scene (timeline node) reorder — PUT /scenes/reorder.
 * With ripple payload: repacks absolute times + PersistRipple.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
  readJsonBody,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
  sendForbidden,
} from "../../_shared/http";
import { getNodeById } from "../../_shared/timeline";
import { getPathname } from "../../_shared/appwrite-handler";
import { canEditProject } from "../_shared/access";
import { calculateSceneReorderRipple } from "../../_shared/ripple-engine";
import { buildRipplePersistDelta } from "../../_shared/ripple-persist";
import { SceneReorderInputSchema } from "./clips-schemas";
import {
  mapToRippleAct,
  mapToRippleClip,
  mapToRippleScene,
  mapToRippleSequence,
} from "./clips-mappers";
import { assertRipplePayloadInProject } from "./clips-ripple-scope";

export default async function scenesRoutes(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  try {
    const pathname = getPathname(req);
    if (!pathname.includes("/reorder")) {
      sendNotFound(res, "Unknown scenes route");
      return;
    }

    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    const method = req.method?.toUpperCase() || "";
    if (method !== "PUT" && method !== "POST") {
      sendMethodNotAllowed(res, ["PUT", "POST"]);
      return;
    }

    const body = await readJsonBody<Record<string, unknown>>(req);
    const parseResult = SceneReorderInputSchema.safeParse(body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      sendBadRequest(
        res,
        `Invalid reorder input: ${firstIssue?.path.join(".")} — ${firstIssue?.message}`,
      );
      return;
    }

    const { sceneIds, allClips, allScenes, allSequences, allActs } =
      parseResult.data;

    const firstNode = await getNodeById(sceneIds[0]);
    const projectId = firstNode?.project_id as string | undefined;
    if (!projectId) {
      sendNotFound(res, "Scene not found");
      return;
    }
    if (!(await canEditProject(bootstrap.user.id, projectId))) {
      sendForbidden(res);
      return;
    }

    for (const id of sceneIds) {
      const node = await getNodeById(id);
      if (!node?.project_id) {
        sendNotFound(res, `Scene not found: ${id}`);
        return;
      }
      if (String(node.project_id) !== projectId) {
        sendForbidden(res);
        return;
      }
    }

    const hasRippleContext =
      Array.isArray(allClips) &&
      Array.isArray(allScenes) &&
      allClips.length > 0 &&
      allScenes.length > 0;

    if (hasRippleContext) {
      await assertRipplePayloadInProject(
        projectId,
        allClips,
        allScenes,
        allSequences ?? [],
        allActs ?? [],
      );

      const mappedClips = allClips.map(mapToRippleClip);
      const mappedScenes = allScenes.map(mapToRippleScene);
      const mappedSequences = (allSequences ?? []).map(mapToRippleSequence);
      const mappedActs = (allActs ?? []).map(mapToRippleAct);

      const result = calculateSceneReorderRipple({
        orderedSceneIds: sceneIds,
        allClips: mappedClips,
        allScenes: mappedScenes,
        allSequences: mappedSequences,
        allActs: mappedActs,
      });

      const { clip_patches, timeline_node_patches } = buildRipplePersistDelta(
        mappedClips,
        mappedScenes,
        mappedSequences,
        mappedActs,
        result,
      );

      const patchById = new Map(
        timeline_node_patches.map((p) => [p.id, { ...p }]),
      );
      sceneIds.forEach((id, index) => {
        const scene = result.updatedScenes.find((s) => s.id === id);
        if (!scene) return;
        patchById.set(id, {
          id,
          start_sec: scene.startSec,
          end_sec: scene.endSec,
          duration_sec: scene.durationSec,
          order_index: index,
        });
      });
      const mergedTimelinePatches = [...patchById.values()];

      const persistResult = await requestGraphql<{
        persistRipple: { ok: boolean };
      }>(
        `
			mutation PersistRipple(
				$projectId: uuid!
				$clip_patches: json!
				$timeline_node_patches: json!
			) {
				persistRipple
			}
			`,
        {
          projectId,
          clip_patches,
          timeline_node_patches: mergedTimelinePatches,
        },
      );

      if (!persistResult.persistRipple?.ok) {
        throw new Error("PersistRipple did not confirm success");
      }

      sendJson(res, 200, {
        success: true,
        stats: result.stats,
        scenes: result.updatedScenes.map((s) => ({
          id: s.id,
          start_sec: s.startSec,
          end_sec: s.endSec,
          duration_sec: s.durationSec,
          order_index: s.orderIndex,
          sequence_id: s.sequenceId,
        })),
        sequences: result.updatedSequences.map((sq) => ({
          id: sq.id,
          start_sec: sq.startSec,
          end_sec: sq.endSec,
          duration_sec: sq.durationSec,
          order_index: sq.orderIndex,
          act_id: sq.actId,
        })),
        acts: result.updatedActs.map((a) => ({
          id: a.id,
          start_sec: a.startSec,
          end_sec: a.endSec,
          duration_sec: a.durationSec,
          order_index: a.orderIndex,
        })),
      });
      return;
    }

    for (let i = 0; i < sceneIds.length; i++) {
      const id = sceneIds[i];
      await requestGraphql(
        `
          mutation ReorderTimelineNode($id: uuid!, $orderIndex: Int!) {
            update_timeline_nodes_by_pk(
              pk_columns: { id: $id }
              _set: { order_index: $orderIndex }
            ) {
              id
            }
          }
        `,
        { id, orderIndex: i },
      );
    }

    sendJson(res, 200, { success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("outside project scope") ||
      message.includes("foreign project")
    ) {
      sendForbidden(res);
      return;
    }
    sendServerError(res, error);
  }
}
