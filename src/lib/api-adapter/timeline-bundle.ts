/**
 * Runtime-aware timeline bundle loader (T53).
 * Cloud: ultra-batch / editor-readmodel; Local: SQLite project_nodes via LocalBackend.
 *
 * Location: src/lib/api-adapter/timeline-bundle.ts
 */

import type { StructureNode } from "@/backend/ScriptonyBackend";
import type { TimelineNode } from "../api/timeline-api-v2";
import { nodeToAct, nodeToSequence, nodeToScene } from "../api/timeline-api";
import * as TimelineAPIV2 from "../api/timeline-api-v2";
import * as ShotsAPI from "../api/shots-api";
import * as ClipsAPI from "../api/clips-api";
import type { TimelineData } from "../../components/structure/DropdownView";
import type { BookTimelineData } from "../../components/book/BookDropdownView";
import type { Clip, Shot } from "../types";
import {
  ultraBatchToTimelineData,
  batchTimelineToTimelineData,
  enrichBookTimelineData,
} from "../timeline-map";
import { dispatchByRuntime, requireLocalBackend } from "./runtime-dispatch";
import {
  normalizeSceneImageStoragePath,
} from "@/lib/local-asset-display-url";
import type { Scene } from "../types";

const LOCAL_TEMPLATE_ID = "film";

const NODE_LEVEL: Record<string, 1 | 2 | 3> = {
  act: 1,
  sequence: 2,
  scene: 3,
};

function parseNodeMetadata(node: StructureNode): Record<string, unknown> {
  return node.metadata ?? {};
}

function structureNodeToTimelineNode(
  node: StructureNode,
  nodeNumber: number,
): TimelineNode {
  const level = NODE_LEVEL[node.type] ?? 3;
  return {
    id: node.id,
    projectId: node.projectId,
    templateId: LOCAL_TEMPLATE_ID,
    level,
    parentId: node.parentId ?? null,
    nodeNumber,
    title: node.label,
    description: "",
    orderIndex: node.orderIndex,
    metadata: parseNodeMetadata(node),
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
}

function assignNodeNumbers(nodes: StructureNode[]): Map<string, number> {
  const byType = new Map<string, StructureNode[]>();
  for (const n of nodes) {
    const list = byType.get(n.type) ?? [];
    list.push(n);
    byType.set(n.type, list);
  }
  const numbers = new Map<string, number>();
  for (const list of byType.values()) {
    list
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .forEach((n, idx) => numbers.set(n.id, idx + 1));
  }
  return numbers;
}

function normalizeSceneImageUrls(scenes: Scene[]): Scene[] {
  return scenes.map((scene) => {
    const normalized = normalizeSceneImageStoragePath(scene.imageUrl);
    if (!normalized || normalized === scene.imageUrl) return scene;
    return { ...scene, imageUrl: normalized };
  });
}

async function loadLocalProjectTimelineBundle(
  projectId: string,
  isBook: boolean,
): Promise<TimelineData | BookTimelineData> {
  const backend = requireLocalBackend(projectId);
  const raw = await backend.timeline.getByProject(projectId);
  const nodes = raw as StructureNode[];
  const numbers = assignNodeNumbers(nodes);

  const acts = nodes
    .filter((n) => n.type === "act")
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((n) =>
      nodeToAct(structureNodeToTimelineNode(n, numbers.get(n.id) ?? 1)),
    );

  const sequences = nodes
    .filter((n) => n.type === "sequence")
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((n) =>
      nodeToSequence(structureNodeToTimelineNode(n, numbers.get(n.id) ?? 1)),
    );

  const scenes = normalizeSceneImageUrls(
    nodes
      .filter((n) => n.type === "scene")
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((n) =>
        nodeToScene(structureNodeToTimelineNode(n, numbers.get(n.id) ?? 1)),
      ),
  );

  const shots = nodes
    .filter((n) => n.type === "shot")
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((n) => {
      const imageUrl =
        typeof n.metadata?.imageUrl === "string"
          ? normalizeSceneImageStoragePath(n.metadata.imageUrl) ??
            n.metadata.imageUrl
          : undefined;
      return {
        id: n.id,
        sceneId: n.parentId ?? "",
        projectId: n.projectId,
        shotNumber: String(numbers.get(n.id) ?? n.orderIndex + 1),
        description: n.label,
        orderIndex: n.orderIndex,
        imageUrl,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      } satisfies Shot;
    });

  const base = {
    acts,
    sequences,
    scenes,
    shots,
    clips: [] as Clip[],
  };

  if (isBook) {
    return enrichBookTimelineData({
      acts: base.acts,
      sequences: base.sequences,
      scenes: base.scenes,
    });
  }

  return base;
}

export async function loadCloudProjectTimelineBundle(
  projectId: string,
  token: string,
  isBook: boolean,
): Promise<TimelineData | BookTimelineData> {
  let loadedActs: ReturnType<typeof nodeToAct>[];
  let allSequences: ReturnType<typeof nodeToSequence>[];
  let allScenes: ReturnType<typeof nodeToScene>[];
  let allShots: Shot[];
  let allClips: Clip[];

  try {
    const ultraData = await TimelineAPIV2.ultraBatchLoadProject(
      projectId,
      token,
      {
        includeShots: true,
        excludeContent: true,
      },
    );
    const film = ultraBatchToTimelineData(ultraData);
    loadedActs = film.acts;
    allSequences = film.sequences;
    allScenes = film.scenes;
    allShots = film.shots ?? [];
    allClips = film.clips || [];
  } catch {
    const batchData = await TimelineAPIV2.batchLoadTimeline(projectId, token, {
      excludeContent: true,
    }).catch(() => ({
      acts: [],
      sequences: [],
      scenes: [],
      stats: { totalNodes: 0, acts: 0, sequences: 0, scenes: 0 },
    }));
    let fallbackShots: unknown[];
    try {
      fallbackShots = await ShotsAPI.getAllShotsByProject(projectId, token);
    } catch {
      fallbackShots = [];
    }
    const film = batchTimelineToTimelineData(batchData, fallbackShots);
    loadedActs = film.acts;
    allSequences = film.sequences;
    allScenes = film.scenes;
    allShots = film.shots ?? [];
    try {
      allClips = await ClipsAPI.listClipsByProject(projectId, token);
    } catch {
      allClips = [];
    }
  }

  if (isBook) {
    return enrichBookTimelineData({
      acts: loadedActs,
      sequences: allSequences,
      scenes: allScenes,
    });
  }

  return {
    acts: loadedActs,
    sequences: allSequences,
    scenes: allScenes,
    shots: allShots as Shot[],
    clips: allClips,
  };
}

/** Load timeline bundle for cloud or local runtime. */
export async function loadProjectTimelineBundleForRuntime(
  projectId: string,
  token: string,
  isBook: boolean,
): Promise<TimelineData | BookTimelineData> {
  return dispatchByRuntime(
    () => loadCloudProjectTimelineBundle(projectId, token, isBook),
    () => loadLocalProjectTimelineBundle(projectId, isBook),
  );
}
