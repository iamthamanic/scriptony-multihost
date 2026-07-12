/**
 * Ultra batch timeline load route for the Scriptony HTTP API.
 *
 * @deprecated Use GET /editor/projects/:projectId/state from scriptony-editor-readmodel instead.
 *   ultra-batch-load is frozen; new aggregation fields (script blocks, audio tracks,
 *   assets, style) are only added to the read-model endpoint.
 */

import { Query } from "node-appwrite";
import { C, listDocumentsFull } from "../../_shared/appwrite-db";
import { requireUserBootstrap } from "../../_shared/auth";
import { mapClip } from "../../_shared/clips-map";
import {
  getQuery,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
  sendUnauthorized,
} from "../../_shared/http";
import { requireProjectAccess } from "../../_shared/scriptony";
import {
  buildTimeline,
  getAllProjectNodes,
  getCharactersByProject,
  getShots,
  mapCharacter,
  mapNode,
  mapShot,
  stripContentFromNodes,
} from "../../_shared/timeline";

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method !== "GET") {
      sendMethodNotAllowed(res, ["GET"]);
      return;
    }

    const projectId = getQuery(req, "project_id") || getQuery(req, "projectId");
    if (!projectId) {
      sendBadRequest(res, "project_id is required");
      return;
    }

    const _project = await requireProjectAccess(
      projectId,
      bootstrap.user.id,
      res,
    );
    if (!_project) return;

    const includeShots = (getQuery(req, "include_shots") || "true") !== "false";
    const excludeContent =
      (getQuery(req, "exclude_content") || "false") === "true";

    const [nodes, characters, shots, clipRows] = await Promise.all([
      getAllProjectNodes(projectId),
      getCharactersByProject(projectId),
      includeShots ? getShots({ projectId }) : Promise.resolve([]),
      listDocumentsFull(C.clips, [Query.equal("project_id", projectId)]),
    ]);

    const mappedNodes = excludeContent
      ? stripContentFromNodes(nodes.map(mapNode))
      : nodes.map(mapNode);
    const { acts, sequences, scenes } = buildTimeline(mappedNodes);
    const mappedCharacters = characters.map(mapCharacter);
    const mappedShots = shots.map(mapShot);
    const mappedClips = clipRows.map(mapClip);

    sendJson(res, 200, {
      timeline: {
        acts,
        sequences,
        scenes,
      },
      characters: mappedCharacters,
      shots: mappedShots,
      clips: mappedClips,
      stats: {
        totalNodes: mappedNodes.length,
        acts: acts.length,
        sequences: sequences.length,
        scenes: scenes.length,
        characters: mappedCharacters.length,
        shots: mappedShots.length,
        clips: mappedClips.length,
      },
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
