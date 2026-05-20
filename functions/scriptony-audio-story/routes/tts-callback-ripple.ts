/**
 * TTS-Callback Ripple — berechnet und persistiert Ripple nach TTS-Abschluss.
 *
 * T31: Aus tts-callback.ts extrahiert um das 500-Zeilen-Limit einzuhalten.
 * Fehler hier blockieren NICHT den TTS-Job.
 */

import { Databases } from "node-appwrite";
import { calculateRipple } from "../../_shared/ripple-engine";
import { buildRipplePersistDelta } from "../../_shared/ripple-persist";
import { requestGraphql } from "../../_shared/graphql-compat";
import { fetchAllProjectDocuments } from "./tts-callback-helpers";
import { getDbClient } from "./tts-job";

export interface RippleAfterTtsInput {
  clipId: string;
  newEndSec: number;
  previousEndSec: number;
  projectId: string;
}

export async function triggerRippleAfterTts(
  input: RippleAfterTtsInput,
): Promise<void> {
  const { clipId, newEndSec, previousEndSec, projectId } = input;

  const dbClient = getDbClient();
  const databases = new Databases(dbClient);
  const dbId = process.env.APPWRITE_DATABASE_ID || "scriptony";

  const clipDocs = await fetchAllProjectDocuments(
    databases,
    dbId,
    "audio_clips",
    projectId,
  );
  const nodeDocs = await fetchAllProjectDocuments(
    databases,
    dbId,
    "timeline_nodes",
    projectId,
  );

  // Den geladenen Clip auf die alte end_sec zuruecksetzen,
  //   damit calculateRipple das korrekte Delta berechnet.
  //   (Nach DB-Update hat der Clip bereits newEndSec.)
  const mappedClips = clipDocs.map((doc: Record<string, unknown>) => {
    const id = String(doc.$id);
    const endSec = id === clipId ? previousEndSec : Number(doc.end_sec ?? 0);
    return {
      id,
      sceneId: String(doc.scene_id ?? ""),
      startSec: Number(doc.start_sec ?? 0),
      endSec,
      crossScene: Boolean(doc.cross_scene ?? false),
    };
  });

  const nodes = nodeDocs.map((doc: Record<string, unknown>) => ({
    id: String(doc.$id),
    nodeType: String(doc.node_type ?? ""),
    parentId: String(doc.parent_id ?? ""),
    startSec: Number(doc.start_sec ?? 0),
    endSec: Number(doc.end_sec ?? 0),
    durationSec: Number(doc.duration_sec ?? 0),
    orderIndex: Number(doc.order_index ?? 0),
  }));

  const parentMap = new Map<string, string>();
  for (const n of nodes) {
    if (n.parentId) parentMap.set(n.id, n.parentId);
  }

  // Validierung: Szenen muessen eine parentId (sequenceId) haben,
  //   Sequenzen muessen eine parentId (actId) haben.
  //   Ohne parentId wuerde die Ripple-Hierarchie kollabieren.
  const nodesMissingParent = nodes.filter(
    (n) => (n.nodeType === "scene" || n.nodeType === "sequence") && !n.parentId,
  );
  if (nodesMissingParent.length > 0) {
    console.error(
      "[tts/callback] Ripple-Abbruch: Knoten ohne parent_id:",
      nodesMissingParent.map((n) => `${n.nodeType}/${n.id}`),
    );
    return;
  }

  const mappedScenes = nodes
    .filter((n) => n.nodeType === "scene")
    .map((n) => ({
      id: n.id,
      sequenceId: parentMap.get(n.id) ?? null,
      startSec: n.startSec,
      endSec: n.endSec,
      durationSec: n.durationSec,
      orderIndex: n.orderIndex,
    }));

  const mappedSequences = nodes
    .filter((n) => n.nodeType === "sequence")
    .map((n) => ({
      id: n.id,
      actId: parentMap.get(n.id) ?? null,
      startSec: n.startSec,
      endSec: n.endSec,
      durationSec: n.durationSec,
      orderIndex: n.orderIndex,
    }));

  const mappedActs = nodes
    .filter((n) => n.nodeType === "act")
    .map((n) => ({
      id: n.id,
      startSec: n.startSec,
      endSec: n.endSec,
      durationSec: n.durationSec,
      orderIndex: n.orderIndex,
    }));

  const rippleResult = calculateRipple({
    changedClipId: clipId,
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
    rippleResult,
  );

  if (clip_patches.length || timeline_node_patches.length) {
    const persistResult = await requestGraphql<{
      persistRipple: { ok: boolean };
    }>(
      `mutation PersistRipple(
          $projectId: uuid!
          $clip_patches: json!
          $timeline_node_patches: json!
        ) {
          persistRipple(
            projectId: $projectId
            clip_patches: $clip_patches
            timeline_node_patches: $timeline_node_patches
          ) {
            ok
          }
        }`,
      {
        projectId,
        clip_patches,
        timeline_node_patches,
      },
    );
    if (!persistResult.persistRipple?.ok) {
      console.error(
        "[tts/callback] persistRipple returned false:",
        persistResult,
      );
    }
  }
}
