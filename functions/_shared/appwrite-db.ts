/**
 * Appwrite Databases admin client and collection helpers for function routes.
 */

import { Client, Databases, ID, Query } from "node-appwrite";
import {
  getAppwriteApiKey,
  getAppwriteDatabaseId,
  getAppwriteEndpoint,
  getAppwriteProjectId,
} from "./env";
import process from "node:process";

let _clientCache: {
  databases: Databases;
  endpoint: string;
  projectId: string;
  apiKey: string;
} | null = null;
const DB_REQUEST_TIMEOUT_MS = Number(
  process.env.SCRIPTONY_DB_REQUEST_TIMEOUT_MS || 7000,
);

function elapsedMs(start: number): number {
  return Date.now() - start;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export function getDatabases(): Databases {
  const endpoint = getAppwriteEndpoint();
  const projectId = getAppwriteProjectId();
  const apiKey = getAppwriteApiKey();

  console.error("[appwrite-db] getDatabases called:", {
    endpoint,
    projectId,
    hasKey: !!apiKey,
    keyPrefix: apiKey ? apiKey.slice(0, 8) : "none",
  });

  const cacheOk =
    _clientCache &&
    _clientCache.endpoint === endpoint &&
    _clientCache.projectId === projectId &&
    _clientCache.apiKey === apiKey;

  if (!cacheOk) {
    const startedAt = Date.now();
    console.error("[appwrite-db] creating Databases client", {
      endpoint,
      projectId,
      hasKey: !!apiKey,
    });
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);
    _clientCache = {
      databases: new Databases(client),
      endpoint,
      projectId,
      apiKey,
    };
    console.error("[appwrite-db] Databases client ready", {
      elapsedMs: elapsedMs(startedAt),
    });
  } else {
    console.error("[appwrite-db] Using cached client", {
      endpoint: _clientCache?.endpoint,
    });
  }
  return _clientCache!.databases;
}

export function dbId(): string {
  return getAppwriteDatabaseId();
}

/** Collection IDs must match attributes created in the Appwrite console (snake_case fields). */
export const C = {
  projects: "projects",
  organizations: "organizations",
  organization_members: "organization_members",
  users: "users",
  worlds: "worlds",
  world_categories: "world_categories",
  world_items: "world_items",
  timeline_nodes: "timeline_nodes",
  shots: "shots",
  /** Editorial timeline segments (NLE); one or more per shot; see Phase 1 Clip domain. */
  clips: "clips",
  shot_audio: "shot_audio",
  shot_characters: "shot_characters",
  characters: "characters",
  scenes: "scenes",
  story_beats: "story_beats",
  scripts: "scripts",
  script_blocks: "script_blocks",
  activity_logs: "activity_logs",
  ai_chat_settings: "ai_chat_settings",
  ai_conversations: "ai_conversations",
  ai_chat_messages: "ai_chat_messages",
  rag_sync_queue: "rag_sync_queue",
  user_integration_tokens: "user_integration_tokens",
  project_inspirations: "project_inspirations",
  project_visual_style: "project_visual_style",
  project_visual_style_items: "project_visual_style_items",
  styleProfiles: "styleProfiles",
  /** Central asset metadata (T05). Physical storage is managed by scriptony-storage. */
  assets: "assets",
  /** Async job queue control plane (T08). */
  jobs: "jobs",
  /** Job snapshot data — serialized script-block references, not inline in job payload (T08). */
  job_snapshots: "job_snapshots",
  /** Puppet-Layer: official render jobs with review lifecycle (Ticket 3). */
  renderJobs: "renderJobs",
  /** Puppet-Layer: exploratory image tasks, no review (Ticket 4). */
  imageTasks: "imageTasks",
  /** Puppet-Layer: guide bundles published from Blender/Bridge (Ticket 7). */
  guideBundles: "guideBundles",
  /** Hörbuch/Hörspiel audio tracks (T07/T08). */
  scene_audio_tracks: "scene_audio_tracks",
  /** Hörbuch/Hörspiel audio clips — temporale Realisierung (T28). */
  audio_clips: "audio_clips",
  /** Hörbuch/Hörspiel recording sessions (T07). */
  audio_sessions: "audio_sessions",
  /** Hörbuch/Hörspiel character voice assignments (T07). */
  character_voice_assignments: "character_voice_assignments",
  /** Puppet-Layer: 2D + 3D stage documents (Ticket 5/8). */
  stageDocuments: "stageDocuments",
} as const;

export type AppwriteDoc = Record<string, unknown>;

export function docToRow(doc: AppwriteDoc): Record<string, any> {
  const id = doc.$id;
  const created_at = doc.$createdAt;
  const updated_at = doc.$updatedAt;
  const {
    $id: _$id,
    $createdAt: _$createdAt,
    $updatedAt: _$updatedAt,
    $permissions: _$permissions,
    $databaseId: _$databaseId,
    $collectionId: _$collectionId,
    ...rest
  } = doc as Record<string, unknown>;
  // Spread rest first: some collections define an attribute `id` that can be null and would
  // otherwise overwrite the real document id derived from $id.
  return { ...rest, id, created_at, updated_at };
}

export async function getDocument(
  collection: string,
  documentId: string,
): Promise<Record<string, any> | null> {
  try {
    const doc = await withTimeout(
      getDatabases().getDocument(dbId(), collection, documentId),
      DB_REQUEST_TIMEOUT_MS,
      `getDocument(${collection})`,
    );
    return docToRow(doc as unknown as AppwriteDoc);
  } catch {
    return null;
  }
}

export async function listDocumentsFull(
  collection: string,
  queries: string[],
  limit = 5000,
): Promise<Record<string, any>[]> {
  const safeLimit = Math.max(1, Math.min(limit, 5000));
  const pageSize = Math.min(100, safeLimit);
  const rows: Record<string, any>[] = [];
  let cursorAfter: string | null = null;

  while (rows.length < safeLimit) {
    const remaining = safeLimit - rows.length;
    const q = [...queries, Query.limit(Math.min(pageSize, remaining))];
    if (cursorAfter) {
      q.push(Query.cursorAfter(cursorAfter));
    }

    const res = await withTimeout(
      getDatabases().listDocuments(dbId(), collection, q),
      DB_REQUEST_TIMEOUT_MS,
      `listDocumentsFull(${collection})`,
    );
    const docs = res.documents as unknown as AppwriteDoc[];
    if (!docs.length) {
      break;
    }

    rows.push(...docs.map((d) => docToRow(d)));
    if (docs.length < Math.min(pageSize, remaining)) {
      break;
    }
    cursorAfter = docs[docs.length - 1].$id as string;
    if (!cursorAfter) {
      break;
    }
  }

  return rows;
}

export async function createDocument(
  collection: string,
  documentId: string | undefined,
  data: Record<string, unknown>,
): Promise<Record<string, any>> {
  const id = documentId || ID.unique();
  const doc = await withTimeout(
    getDatabases().createDocument(dbId(), collection, id, data),
    DB_REQUEST_TIMEOUT_MS,
    `createDocument(${collection})`,
  );
  return docToRow(doc as unknown as AppwriteDoc);
}

export async function updateDocument(
  collection: string,
  documentId: string,
  data: Record<string, unknown>,
): Promise<Record<string, any>> {
  const doc = await withTimeout(
    getDatabases().updateDocument(dbId(), collection, documentId, data),
    DB_REQUEST_TIMEOUT_MS,
    `updateDocument(${collection})`,
  );
  return docToRow(doc as unknown as AppwriteDoc);
}

export async function deleteDocument(
  collection: string,
  documentId: string,
): Promise<void> {
  await withTimeout(
    getDatabases().deleteDocument(dbId(), collection, documentId),
    DB_REQUEST_TIMEOUT_MS,
    `deleteDocument(${collection})`,
  );
}

export async function countDocuments(
  collection: string,
  queries: string[] = [],
): Promise<number> {
  const startedAt = Date.now();
  const databaseId = dbId();
  console.log("[appwrite-db] countDocuments start", {
    databaseId,
    collection,
    timeoutMs: DB_REQUEST_TIMEOUT_MS,
  });
  const res = await withTimeout(
    getDatabases().listDocuments(
      databaseId,
      collection,
      [Query.limit(1), ...queries],
      undefined,
      true,
    ),
    DB_REQUEST_TIMEOUT_MS,
    `countDocuments(${collection})`,
  );
  console.log("[appwrite-db] countDocuments done", {
    collection,
    total: res.total,
    elapsedMs: elapsedMs(startedAt),
  });
  return res.total;
}
