/**
 * POST …/ripple — calculate ripple and persist via single PersistRipple mutation.
 */

import { calculateRipple } from "../../_shared/ripple-engine";
import { buildRipplePersistDelta } from "../../_shared/ripple-persist";
import type { RequestLike, ResponseLike } from "../../_shared/http";
import { requireUserBootstrap } from "../../_shared/auth";
import {
  readJsonBody,
  sendJson,
  sendBadRequest,
  sendUnauthorized,
  sendServerError,
  sendNotFound,
  sendForbidden,
} from "../../_shared/http";
import { requestGraphql } from "../../_shared/graphql-compat";
import { canEditProject } from "../_shared/access";
import { RippleInputSchema } from "./clips-schemas";
import {
  mapToRippleAct,
  mapToRippleClip,
  mapToRippleScene,
  mapToRippleSequence,
} from "./clips-mappers";
import { getClipProjectId } from "./clips-helpers";
import { assertRipplePayloadInProject } from "./clips-ripple-scope";

export async function rippleClipUpdates(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const body = await readJsonBody<Record<string, unknown>>(req);
  const parseResult = RippleInputSchema.safeParse(body);
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    sendBadRequest(
      res,
      `Invalid ripple input: ${firstIssue?.path.join(".")} — ${firstIssue?.message}`,
    );
    return;
  }

  const {
    changedClipId,
    newEndSec,
    allClips,
    allScenes,
    allSequences,
    allActs,
  } = parseResult.data;

  const projectId = await getClipProjectId(changedClipId);
  if (!projectId) {
    sendNotFound(res, "Audio clip not found");
    return;
  }
  if (!(await canEditProject(bootstrap.user.id, projectId))) {
    sendForbidden(res);
    return;
  }

  try {
    await assertRipplePayloadInProject(
      projectId,
      allClips,
      allScenes,
      allSequences,
      allActs,
    );

    const mappedClips = allClips.map(mapToRippleClip);
    const mappedScenes = allScenes.map(mapToRippleScene);
    const mappedSequences = allSequences.map(mapToRippleSequence);
    const mappedActs = allActs.map(mapToRippleAct);

    const result = calculateRipple({
      changedClipId,
      newEndSec,
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
        timeline_node_patches,
      },
    );

    if (!persistResult.persistRipple?.ok) {
      throw new Error("PersistRipple did not confirm success");
    }

    const updatedClips = result.updatedClips.filter((c) => {
      const orig = mappedClips.find((o) => o.id === c.id);
      if (!orig) return false;
      return orig.startSec !== c.startSec || orig.endSec !== c.endSec;
    });

    const snakeCaseScenes = result.updatedScenes.map((s) => ({
      id: s.id,
      start_sec: s.startSec,
      end_sec: s.endSec,
      duration_sec: s.durationSec,
      order_index: s.orderIndex,
      sequence_id: s.sequenceId,
    }));
    const snakeCaseSequences = result.updatedSequences.map((sq) => ({
      id: sq.id,
      start_sec: sq.startSec,
      end_sec: sq.endSec,
      duration_sec: sq.durationSec,
      order_index: sq.orderIndex,
      act_id: sq.actId,
    }));
    const snakeCaseActs = result.updatedActs.map((a) => ({
      id: a.id,
      start_sec: a.startSec,
      end_sec: a.endSec,
      duration_sec: a.durationSec,
      order_index: a.orderIndex,
    }));

    sendJson(res, 200, {
      stats: result.stats,
      updatedClips: updatedClips.length,
      scenes: snakeCaseScenes,
      sequences: snakeCaseSequences,
      acts: snakeCaseActs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("outside project scope") ||
      message.includes("foreign project")
    ) {
      sendForbidden(res);
      return;
    }
    console.error("[Audio Story] Ripple failed:", error);
    sendServerError(res, error);
  }
}
