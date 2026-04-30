/**
 * T12: Editor State Route — Read-only View-Model.
 *
 * GET /editor/projects/:projectId/state?lite=true&exclude_content=true
 *   lite=true         → project + timeline nodes only
 *   lite=false        → full aggregation (default)
 *   exclude_content   → strip metadata.content from nodes to reduce payload
 *
 * Verboten: createDocument, updateDocument, deleteDocument, Storage Writes,
 *           Provider Calls, Job-Erstellung.
 */

import { z } from "zod";
import { requireUserBootstrap } from "../../_shared/auth";
import {
  getQuery,
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
  sendUnauthorized,
} from "../../_shared/http";
import { requireProjectAccess } from "../../_shared/scriptony";
import {
  buildFullResponse,
  buildLiteResponse,
} from "../services/editor-builders";
import {
  fetchAssets,
  fetchCharacters,
  fetchClips,
  fetchNodes,
  fetchSceneAudioTracks,
  fetchScriptBlocks,
  fetchShots,
  fetchStyle,
} from "../services/editor-fetchers";
import { stripContentFromNodes } from "../services/editor-mappers";

const querySchema = z.object({
  lite: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional()
    .default(false),
  exclude_content: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional()
    .default(false),
});

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const startedAt = Date.now();

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

    const projectId = req.params?.projectId || "";
    if (!projectId) {
      sendJson(res, 400, { error: "projectId is required" });
      return;
    }

    const project = await requireProjectAccess(
      projectId,
      bootstrap.user.id,
      res,
    );
    if (!project) return;

    const raw = querySchema.safeParse({
      lite: getQuery(req, "lite") || undefined,
      exclude_content: getQuery(req, "exclude_content") || undefined,
    });

    if (!raw.success) {
      sendJson(res, 400, {
        error: "Invalid query parameters",
        details: raw.error.format(),
      });
      return;
    }

    const { lite: isLite, exclude_content: isExcludeContent } = raw.data;
    const errors: string[] = [];

    // Nodes are fetched in parallel with extended domains when in full mode.
    const nodesPromise = fetchNodes(projectId);

    if (isLite) {
      const nodes = await nodesPromise;
      const nodesToReturn = isExcludeContent
        ? stripContentFromNodes(nodes)
        : nodes;
      sendJson(
        res,
        200,
        buildLiteResponse(
          project,
          nodesToReturn,
          Date.now() - startedAt,
          errors.length ? errors : undefined,
        ),
      );
      return;
    }

    const [
      nodes,
      characters,
      shots,
      clips,
      scriptBlocks,
      sceneAudioTracks,
      assets,
      styleData,
    ] = await Promise.all([
      nodesPromise,
      fetchCharacters(projectId, errors),
      fetchShots(projectId, errors),
      fetchClips(projectId, errors),
      fetchScriptBlocks(projectId, errors),
      fetchSceneAudioTracks(projectId, errors),
      fetchAssets(projectId, errors),
      fetchStyle(projectId, errors),
    ]);

    const nodesToReturn = isExcludeContent
      ? stripContentFromNodes(nodes)
      : nodes;

    sendJson(
      res,
      200,
      buildFullResponse(
        project,
        nodesToReturn,
        characters,
        shots,
        clips,
        scriptBlocks,
        sceneAudioTracks,
        assets,
        styleData,
        Date.now() - startedAt,
        errors.length ? errors : undefined,
      ),
    );
  } catch (error) {
    console.error("[editor-readmodel] unhandled error:", error);
    sendServerError(res, error);
  }
}
