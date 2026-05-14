"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// functions/scriptony-audio-story/routes/tracks.ts
var tracks_exports = {};
__export(tracks_exports, {
  default: () => handler
});
module.exports = __toCommonJS(tracks_exports);

// functions/_shared/graphql-operations/handlers-all.ts
var import_node_appwrite3 = require("node-appwrite");

// functions/_shared/appwrite-db.ts
var import_node_appwrite = require("node-appwrite");

// functions/_shared/env.ts
var import_node_process = __toESM(require("node:process"), 1);
function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}
function getOptionalEnv(name) {
  const value = import_node_process.default.env[name]?.trim();
  return value ? value : null;
}
function getAppwriteEndpoint() {
  const custom = getOptionalEnv("SCRIPTONY_APPWRITE_API_ENDPOINT");
  if (custom) return trimTrailingSlash(custom);
  return "http://appwrite/v1";
}
function getPublicAppwriteEndpoint() {
  const pub = getOptionalEnv("APPWRITE_PUBLIC_ENDPOINT") || getOptionalEnv("APPWRITE_ENDPOINT");
  if (pub) return trimTrailingSlash(pub);
  return getAppwriteEndpoint();
}
function getAppwriteProjectId() {
  return getOptionalEnv("APPWRITE_FUNCTION_PROJECT_ID") || getOptionalEnv("APPWRITE_PROJECT_ID") || "69c04993003de8ff42aa";
}
function getAppwriteApiKey() {
  return getOptionalEnv("APPWRITE_API_KEY") || "";
}
function getAppwriteDatabaseId() {
  return getOptionalEnv("APPWRITE_DATABASE_ID") || "scriptony";
}

// functions/_shared/appwrite-db.ts
var import_node_process2 = __toESM(require("node:process"), 1);
var _clientCache = null;
var DB_REQUEST_TIMEOUT_MS = Number(
  import_node_process2.default.env.SCRIPTONY_DB_REQUEST_TIMEOUT_MS || 7e3
);
function elapsedMs(start) {
  return Date.now() - start;
}
async function withTimeout(promise, timeoutMs, label) {
  let timeoutHandle = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}
function getDatabases() {
  const endpoint = getAppwriteEndpoint();
  const projectId = getAppwriteProjectId();
  const apiKey = getAppwriteApiKey();
  console.error("[appwrite-db] getDatabases called:", {
    endpoint,
    projectId,
    hasKey: !!apiKey,
    keyPrefix: apiKey ? apiKey.slice(0, 8) : "none"
  });
  const cacheOk = _clientCache && _clientCache.endpoint === endpoint && _clientCache.projectId === projectId && _clientCache.apiKey === apiKey;
  if (!cacheOk) {
    const startedAt = Date.now();
    console.error("[appwrite-db] creating Databases client", {
      endpoint,
      projectId,
      hasKey: !!apiKey
    });
    const client = new import_node_appwrite.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    _clientCache = {
      databases: new import_node_appwrite.Databases(client),
      endpoint,
      projectId,
      apiKey
    };
    console.error("[appwrite-db] Databases client ready", {
      elapsedMs: elapsedMs(startedAt)
    });
  } else {
    console.error("[appwrite-db] Using cached client", {
      endpoint: _clientCache?.endpoint
    });
  }
  return _clientCache.databases;
}
function dbId() {
  return getAppwriteDatabaseId();
}
var C = {
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
  stageDocuments: "stageDocuments"
};
function docToRow(doc) {
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
  } = doc;
  return { ...rest, id, created_at, updated_at };
}
async function getDocument(collection, documentId) {
  try {
    const doc = await withTimeout(
      getDatabases().getDocument(dbId(), collection, documentId),
      DB_REQUEST_TIMEOUT_MS,
      `getDocument(${collection})`
    );
    return docToRow(doc);
  } catch {
    return null;
  }
}
async function listDocumentsFull(collection, queries, limit = 5e3) {
  const safeLimit = Math.max(1, Math.min(limit, 5e3));
  const pageSize = Math.min(100, safeLimit);
  const rows = [];
  let cursorAfter = null;
  while (rows.length < safeLimit) {
    const remaining = safeLimit - rows.length;
    const q = [...queries, import_node_appwrite.Query.limit(Math.min(pageSize, remaining))];
    if (cursorAfter) {
      q.push(import_node_appwrite.Query.cursorAfter(cursorAfter));
    }
    const res = await withTimeout(
      getDatabases().listDocuments(dbId(), collection, q),
      DB_REQUEST_TIMEOUT_MS,
      `listDocumentsFull(${collection})`
    );
    const docs = res.documents;
    if (!docs.length) {
      break;
    }
    rows.push(...docs.map((d) => docToRow(d)));
    if (docs.length < Math.min(pageSize, remaining)) {
      break;
    }
    cursorAfter = docs[docs.length - 1].$id;
    if (!cursorAfter) {
      break;
    }
  }
  return rows;
}
async function createDocument(collection, documentId, data) {
  const id = documentId || import_node_appwrite.ID.unique();
  const doc = await withTimeout(
    getDatabases().createDocument(dbId(), collection, id, data),
    DB_REQUEST_TIMEOUT_MS,
    `createDocument(${collection})`
  );
  return docToRow(doc);
}
async function updateDocument(collection, documentId, data) {
  const doc = await withTimeout(
    getDatabases().updateDocument(dbId(), collection, documentId, data),
    DB_REQUEST_TIMEOUT_MS,
    `updateDocument(${collection})`
  );
  return docToRow(doc);
}
async function deleteDocument(collection, documentId) {
  await withTimeout(
    getDatabases().deleteDocument(dbId(), collection, documentId),
    DB_REQUEST_TIMEOUT_MS,
    `deleteDocument(${collection})`
  );
}
async function countDocuments(collection, queries = []) {
  const startedAt = Date.now();
  const databaseId = dbId();
  console.log("[appwrite-db] countDocuments start", {
    databaseId,
    collection,
    timeoutMs: DB_REQUEST_TIMEOUT_MS
  });
  const res = await withTimeout(
    getDatabases().listDocuments(
      databaseId,
      collection,
      [import_node_appwrite.Query.limit(1), ...queries],
      void 0,
      true
    ),
    DB_REQUEST_TIMEOUT_MS,
    `countDocuments(${collection})`
  );
  console.log("[appwrite-db] countDocuments done", {
    collection,
    total: res.total,
    elapsedMs: elapsedMs(startedAt)
  });
  return res.total;
}

// functions/_shared/graphql-operations/helpers.ts
var import_node_appwrite2 = require("node-appwrite");
function queriesForUserProjects(organizationId, userId) {
  return [
    import_node_appwrite2.Query.and([
      import_node_appwrite2.Query.or([
        import_node_appwrite2.Query.equal("organization_id", organizationId),
        import_node_appwrite2.Query.equal("user_id", userId)
      ]),
      import_node_appwrite2.Query.or([import_node_appwrite2.Query.equal("is_deleted", false), import_node_appwrite2.Query.isNull("is_deleted")])
    ]),
    import_node_appwrite2.Query.orderDesc("$createdAt")
  ];
}
async function hydrateShot(shot) {
  const links = await listDocumentsFull(C.shot_characters, [
    import_node_appwrite2.Query.equal("shot_id", shot.id)
  ]);
  const shot_characters = [];
  for (const link of links) {
    const ch = await getDocument(C.characters, link.character_id);
    if (ch) {
      shot_characters.push({ character: ch });
    }
  }
  const shot_audio = await listDocumentsFull(C.shot_audio, [
    import_node_appwrite2.Query.equal("shot_id", shot.id),
    import_node_appwrite2.Query.orderAsc("$createdAt")
  ]);
  return { ...shot, shot_characters, shot_audio };
}
async function hydrateShots(shots) {
  return Promise.all(shots.map((s) => hydrateShot(s)));
}

// functions/_shared/graphql-operations/handlers-all.ts
function readListLimit(envValue, fallback) {
  const parsed = Number(envValue ?? fallback);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.min(Math.trunc(parsed), 5e3));
}
var PROJECTS_LIST_LIMIT = readListLimit(
  process.env.SCRIPTONY_PROJECTS_LIST_LIMIT,
  5e3
);
var WORLDS_LIST_LIMIT = readListLimit(
  process.env.SCRIPTONY_WORLDS_LIST_LIMIT,
  5e3
);
var AI_CHAT_SETTINGS_WRITABLE = /* @__PURE__ */ new Set([
  "user_id",
  "provider",
  "model",
  "settings_json",
  "temperature",
  "system_prompt_default",
  "openai_api_key",
  "anthropic_api_key",
  "google_api_key",
  "openrouter_api_key",
  "deepseek_api_key",
  "ollama_base_url",
  "ollama_api_key",
  "ollama_image_api_key",
  "active_provider",
  "active_model",
  "system_prompt",
  "max_tokens",
  "use_rag"
]);
var AI_CHAT_API_KEY_FIELDS = /* @__PURE__ */ new Set([
  "openai_api_key",
  "anthropic_api_key",
  "google_api_key",
  "openrouter_api_key",
  "deepseek_api_key",
  "ollama_api_key",
  "ollama_image_api_key"
]);
function sanitizeAiChatSettingsInsert(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (!AI_CHAT_SETTINGS_WRITABLE.has(k)) continue;
    if (v === null || v === void 0) continue;
    out[k] = v;
  }
  return out;
}
function sanitizeAiChatSettingsUpdate(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (!AI_CHAT_SETTINGS_WRITABLE.has(k)) continue;
    if (v === void 0) continue;
    if (v === null && AI_CHAT_API_KEY_FIELDS.has(k)) {
      out[k] = "";
      continue;
    }
    if (v === null) continue;
    out[k] = v;
  }
  return out;
}
async function upsertUser(object) {
  const id = object.id;
  const { id: _drop, ...rest } = object;
  const ex = await getDocument(C.users, id);
  if (ex) {
    await updateDocument(C.users, id, rest);
  } else {
    await createDocument(C.users, id, rest);
  }
  return { insert_users_one: { id } };
}
async function listShotAudioForOrg(organizationId) {
  const projects = await listDocumentsFull(C.projects, [
    import_node_appwrite3.Query.equal("organization_id", organizationId)
  ]);
  const out = [];
  for (const p of projects) {
    const shots = await listDocumentsFull(C.shots, [
      import_node_appwrite3.Query.equal("project_id", p.id)
    ]);
    for (const s of shots) {
      const aud = await listDocumentsFull(C.shot_audio, [
        import_node_appwrite3.Query.equal("shot_id", s.id)
      ]);
      for (const a of aud) {
        out.push({
          file_name: a.file_name,
          file_size: a.file_size ?? null,
          created_at: a.created_at
        });
      }
    }
  }
  return out;
}
function enrichAiChatMessageRow(row) {
  let meta = {};
  try {
    const mj = row.metadata_json;
    if (typeof mj === "string" && mj.trim()) {
      meta = JSON.parse(mj);
    } else if (mj && typeof mj === "object" && !Array.isArray(mj)) {
      meta = mj;
    }
  } catch {
  }
  return {
    ...row,
    model: meta.model ?? row.model,
    provider: meta.provider ?? row.provider,
    tokens_used: meta.tokens_used ?? row.tokens_used,
    tool_calls: meta.tool_calls ?? row.tool_calls
  };
}
var allHandlers = {
  GetProjects: async (v) => ({
    projects: await listDocumentsFull(
      C.projects,
      queriesForUserProjects(v.organizationId, v.userId),
      PROJECTS_LIST_LIMIT
    )
  }),
  CreateProject: async (v) => ({
    insert_projects_one: await createDocument(
      C.projects,
      import_node_appwrite3.ID.unique(),
      v.object
    )
  }),
  UpdateProject: async (v) => ({
    update_projects_by_pk: await updateDocument(
      C.projects,
      v.projectId,
      v.changes
    )
  }),
  SoftDeleteProject: async (v) => ({
    update_projects_by_pk: await updateDocument(
      C.projects,
      v.projectId,
      { is_deleted: true }
    )
  }),
  UpdateProjectCoverImage: async (v) => ({
    update_projects_by_pk: await updateDocument(C.projects, v.id, {
      cover_image_url: v.imageUrl
    })
  }),
  LegacyProjectsList: async (v) => ({
    projects: await listDocumentsFull(
      C.projects,
      queriesForUserProjects(v.organizationId, v.userId),
      PROJECTS_LIST_LIMIT
    )
  }),
  ProjectsHealthcheck: async () => ({
    projects_aggregate: {
      aggregate: { count: await countDocuments(C.projects) }
    }
  }),
  GetUserOrganizations: async (v) => ({
    organization_members: await listDocumentsFull(C.organization_members, [
      import_node_appwrite3.Query.equal("user_id", v.userId)
    ])
  }),
  GetAccessibleProject: async (v) => {
    const projectId = v.projectId;
    const userId = v.userId;
    const organizationIds = v.organizationIds || [];
    const proj = await getDocument(C.projects, projectId);
    if (!proj) {
      return { projects: [] };
    }
    if (proj.user_id === userId) {
      return { projects: [proj] };
    }
    if (organizationIds.includes(proj.organization_id)) {
      return { projects: [proj] };
    }
    return { projects: [] };
  },
  GetUserByIntegrationToken: async (v) => ({
    user_integration_tokens: await listDocumentsFull(
      C.user_integration_tokens,
      [import_node_appwrite3.Query.equal("token_hash", v.tokenHash), import_node_appwrite3.Query.limit(1)]
    )
  }),
  GetUserProfile: async (v) => ({
    users_by_pk: await getDocument(C.users, v.userId)
  }),
  GetExistingUserState: async (v) => ({
    users_by_pk: await getDocument(C.users, v.userId),
    organization_members: await listDocumentsFull(C.organization_members, [
      import_node_appwrite3.Query.equal("user_id", v.userId),
      import_node_appwrite3.Query.limit(1)
    ])
  }),
  CreateOrganization: async (v) => ({
    insert_organizations_one: await createDocument(
      C.organizations,
      import_node_appwrite3.ID.unique(),
      v.object
    )
  }),
  AddOrganizationMember: async (v) => ({
    insert_organization_members_one: await createDocument(
      C.organization_members,
      import_node_appwrite3.ID.unique(),
      v.object
    )
  }),
  AddOwnerMembership: async (v) => ({
    insert_organization_members_one: await createDocument(
      C.organization_members,
      import_node_appwrite3.ID.unique(),
      v.object
    )
  }),
  UpsertUser: async (v) => upsertUser(v.object),
  GetOrganizations: async (v) => {
    const memberships = await listDocumentsFull(C.organization_members, [
      import_node_appwrite3.Query.equal("user_id", v.userId)
    ]);
    const organization_members = [];
    for (const m of memberships) {
      const org = await getDocument(
        C.organizations,
        m.organization_id
      );
      organization_members.push({
        role: m.role,
        organizations: org
      });
    }
    return { organization_members };
  },
  GetOrganizationMembership: async (v) => ({
    organization_members: await listDocumentsFull(C.organization_members, [
      import_node_appwrite3.Query.equal("organization_id", v.orgId),
      import_node_appwrite3.Query.equal("user_id", v.userId),
      import_node_appwrite3.Query.limit(1)
    ]),
    organizations_by_pk: await getDocument(C.organizations, v.orgId)
  }),
  UpdateOrganization: async (v) => ({
    update_organizations_by_pk: await updateDocument(
      C.organizations,
      v.orgId,
      v.changes
    )
  }),
  DeleteOrganization: async (v) => {
    await deleteDocument(C.organizations, v.orgId);
    return { delete_organizations_by_pk: { id: v.orgId } };
  },
  GetProfile: async (v) => ({
    users_by_pk: await getDocument(C.users, v.userId)
  }),
  UpdateProfile: async (v) => ({
    update_users_by_pk: await updateDocument(
      C.users,
      v.userId,
      v.changes
    )
  }),
  ListIntegrationTokens: async (v) => ({
    user_integration_tokens: await listDocumentsFull(
      C.user_integration_tokens,
      [
        import_node_appwrite3.Query.equal("user_id", v.userId),
        import_node_appwrite3.Query.orderDesc("$createdAt")
      ]
    )
  }),
  CreateIntegrationToken: async (v) => ({
    insert_user_integration_tokens_one: await createDocument(
      C.user_integration_tokens,
      import_node_appwrite3.ID.unique(),
      v.object
    )
  }),
  GetIntegrationToken: async (v) => ({
    user_integration_tokens_by_pk: await getDocument(
      C.user_integration_tokens,
      v.id
    )
  }),
  DeleteIntegrationToken: async (v) => {
    await deleteDocument(C.user_integration_tokens, v.id);
    return { delete_user_integration_tokens_by_pk: { id: v.id } };
  },
  AuthHealthcheck: async () => ({
    organizations_aggregate: {
      aggregate: { count: await countDocuments(C.organizations) }
    }
  }),
  GetWorlds: async (v) => {
    const worlds = await listDocumentsFull(
      C.worlds,
      [
        import_node_appwrite3.Query.equal("organization_id", v.organizationId),
        import_node_appwrite3.Query.orderDesc("$createdAt")
      ],
      WORLDS_LIST_LIMIT
    );
    return { worlds };
  },
  CreateWorld: async (v) => ({
    insert_worlds_one: await createDocument(
      C.worlds,
      import_node_appwrite3.ID.unique(),
      v.object
    )
  }),
  GetWorld: async (v) => ({
    worlds: await listDocumentsFull(C.worlds, [
      // Document id is Appwrite `$id`; collection may also define attribute `id` (often null) — do not query on `id`.
      import_node_appwrite3.Query.equal("$id", v.worldId),
      import_node_appwrite3.Query.equal("organization_id", v.organizationId),
      import_node_appwrite3.Query.limit(1)
    ])
  }),
  /** Alias for RAG context loader query name. */
  RagWorld: async (v) => ({
    worlds: await listDocumentsFull(C.worlds, [
      import_node_appwrite3.Query.equal("$id", v.worldId),
      import_node_appwrite3.Query.equal("organization_id", v.organizationId),
      import_node_appwrite3.Query.limit(1)
    ])
  }),
  UpdateWorld: async (v) => ({
    update_worlds_by_pk: await updateDocument(
      C.worlds,
      v.worldId,
      v.changes
    )
  }),
  DeleteWorld: async (v) => {
    await deleteDocument(C.worlds, v.worldId);
    return { delete_worlds_by_pk: { id: v.worldId } };
  },
  GetWorldForUpload: async (v) => ({
    worlds_by_pk: await getDocument(C.worlds, v.id)
  }),
  UpdateWorldCoverImage: async (v) => ({
    update_worlds_by_pk: await updateDocument(C.worlds, v.id, {
      cover_image_url: v.imageUrl
    })
  }),
  GetWorldCategories: async (v) => ({
    world_categories: await listDocumentsFull(C.world_categories, [
      import_node_appwrite3.Query.equal("world_id", v.worldId),
      import_node_appwrite3.Query.orderAsc("order_index")
    ])
  }),
  CreateWorldCategory: async (v) => ({
    insert_world_categories_one: await createDocument(
      C.world_categories,
      import_node_appwrite3.ID.unique(),
      v.object
    )
  }),
  GetWorldItems: async (v) => ({
    world_items: await listDocumentsFull(C.world_items, [
      import_node_appwrite3.Query.equal("world_id", v.worldId)
    ])
  }),
  GetWorldbuildingCharacters: async (v) => {
    const q = [
      import_node_appwrite3.Query.equal("organization_id", v.organizationId)
    ];
    if (v.worldId) {
      q.push(import_node_appwrite3.Query.equal("world_id", v.worldId));
    } else {
      q.push(import_node_appwrite3.Query.isNull("world_id"));
    }
    q.push(import_node_appwrite3.Query.orderDesc("$createdAt"));
    return { characters: await listDocumentsFull(C.characters, q) };
  },
  WorldsHealthcheck: async () => ({
    worlds_aggregate: { aggregate: { count: await countDocuments(C.worlds) } }
  }),
  GetProjectForTimeline: async (v) => ({
    projects_by_pk: await getDocument(C.projects, v.projectId)
  }),
  GetTimelineNode: async (v) => ({
    timeline_nodes_by_pk: await getDocument(
      C.timeline_nodes,
      v.nodeId
    )
  }),
  GetTimelineChildren: async (v) => ({
    timeline_nodes: await listDocumentsFull(C.timeline_nodes, [
      import_node_appwrite3.Query.equal("parent_id", v.parentId),
      import_node_appwrite3.Query.orderAsc("order_index")
    ])
  }),
  GetAllProjectNodes: async (v) => ({
    timeline_nodes: await listDocumentsFull(C.timeline_nodes, [
      import_node_appwrite3.Query.equal("project_id", v.projectId),
      import_node_appwrite3.Query.orderAsc("order_index")
    ])
  }),
  GetCharactersByProject: async (v) => ({
    characters: await listDocumentsFull(C.characters, [
      import_node_appwrite3.Query.equal("project_id", v.projectId),
      import_node_appwrite3.Query.orderDesc("$createdAt")
    ])
  }),
  GetCharacter: async (v) => ({
    characters_by_pk: await getDocument(C.characters, v.characterId)
  }),
  GetShotsByProject: async (v) => ({
    shots: await hydrateShots(
      await listDocumentsFull(C.shots, [
        import_node_appwrite3.Query.equal("project_id", v.projectId),
        import_node_appwrite3.Query.orderAsc("order_index")
      ])
    )
  }),
  GetShotsByScene: async (v) => ({
    shots: await hydrateShots(
      await listDocumentsFull(C.shots, [
        import_node_appwrite3.Query.equal("scene_id", v.sceneId),
        import_node_appwrite3.Query.orderAsc("order_index")
      ])
    )
  }),
  GetShot: async (v) => {
    const row = await getDocument(C.shots, v.shotId);
    return { shots_by_pk: row ? await hydrateShot(row) : null };
  },
  GetStoryBeats: async (v) => ({
    story_beats: await listDocumentsFull(C.story_beats, [
      import_node_appwrite3.Query.equal("project_id", v.projectId),
      import_node_appwrite3.Query.orderAsc("order_index")
    ])
  }),
  /** Alias for RAG context loader query name. */
  RagStoryBeats: async (v) => ({
    story_beats: await listDocumentsFull(C.story_beats, [
      import_node_appwrite3.Query.equal("project_id", v.projectId),
      import_node_appwrite3.Query.orderAsc("order_index")
    ])
  }),
  CreateBeat: async (v) => ({
    insert_story_beats_one: await createDocument(
      C.story_beats,
      import_node_appwrite3.ID.unique(),
      v.object
    )
  }),
  GetBeat: async (v) => ({
    story_beats_by_pk: await getDocument(C.story_beats, v.beatId)
  }),
  UpdateBeat: async (v) => ({
    update_story_beats_by_pk: await updateDocument(
      C.story_beats,
      v.beatId,
      v.changes
    )
  }),
  DeleteBeat: async (v) => {
    await deleteDocument(C.story_beats, v.beatId);
    return { delete_story_beats_by_pk: { id: v.beatId } };
  },
  BeatsHealthcheck: async () => ({
    story_beats_aggregate: {
      aggregate: { count: await countDocuments(C.story_beats) }
    }
  }),
  CreateTimelineNode: async (v) => ({
    insert_timeline_nodes_one: await createDocument(
      C.timeline_nodes,
      import_node_appwrite3.ID.unique(),
      v.object
    )
  }),
  UpdateTimelineNode: async (v) => ({
    update_timeline_nodes_by_pk: await updateDocument(
      C.timeline_nodes,
      v.id,
      v.changes
    )
  }),
  DeleteTimelineNode: async (v) => {
    await deleteDocument(C.timeline_nodes, v.id);
    return { delete_timeline_nodes_by_pk: { id: v.id } };
  },
  ReorderTimelineNode: async (v) => ({
    update_timeline_nodes_by_pk: await updateDocument(
      C.timeline_nodes,
      v.id,
      {
        order_index: v.orderIndex
      }
    )
  }),
  BulkCreateTimelineNodes: async (v) => {
    const objects = v.objects;
    const created = [];
    for (const o of objects) {
      created.push(await createDocument(C.timeline_nodes, import_node_appwrite3.ID.unique(), o));
    }
    return { insert_timeline_nodes: { returning: created } };
  },
  InitializeTimelineProject: async (v) => {
    const objects = v.objects;
    const created = [];
    for (const o of objects) {
      created.push(await createDocument(C.timeline_nodes, import_node_appwrite3.ID.unique(), o));
    }
    return { insert_timeline_nodes: { returning: created } };
  },
  CreateShot: async (v) => ({
    insert_shots_one: await createDocument(
      C.shots,
      import_node_appwrite3.ID.unique(),
      v.object
    )
  }),
  UpdateShot: async (v) => ({
    update_shots_by_pk: await updateDocument(
      C.shots,
      v.id,
      v.changes
    )
  }),
  DeleteShot: async (v) => {
    await deleteDocument(C.shots, v.id);
    return { delete_shots_by_pk: { id: v.id } };
  },
  ReorderShot: async (v) => ({
    update_shots_by_pk: await updateDocument(C.shots, v.id, {
      order_index: v.orderIndex,
      user_id: v.userId
    })
  }),
  UpdateShotImage: async (v) => ({
    update_shots_by_pk: await updateDocument(C.shots, v.id, {
      image_url: v.imageUrl,
      user_id: v.userId
    })
  }),
  AddShotCharacter: async (v) => ({
    insert_shot_characters_one: await createDocument(
      C.shot_characters,
      import_node_appwrite3.ID.unique(),
      {
        shot_id: v.shotId,
        character_id: v.characterId
      }
    )
  }),
  RemoveShotCharacter: async (v) => {
    const links = await listDocumentsFull(C.shot_characters, [
      import_node_appwrite3.Query.equal("shot_id", v.shotId),
      import_node_appwrite3.Query.equal("character_id", v.characterId),
      import_node_appwrite3.Query.limit(10)
    ]);
    for (const l of links) {
      await deleteDocument(C.shot_characters, l.id);
    }
    return { delete_shot_characters: { affected_rows: links.length } };
  },
  CreateCharacter: async (v) => ({
    insert_characters_one: await createDocument(
      C.characters,
      import_node_appwrite3.ID.unique(),
      v.object
    )
  }),
  UpdateCharacter: async (v) => ({
    update_characters_by_pk: await updateDocument(
      C.characters,
      v.id,
      v.changes
    )
  }),
  DeleteCharacter: async (v) => {
    await deleteDocument(C.characters, v.id);
    return { delete_characters_by_pk: { id: v.id } };
  },
  CreateShotAudio: async (v) => ({
    insert_shot_audio_one: await createDocument(
      C.shot_audio,
      import_node_appwrite3.ID.unique(),
      v.object
    )
  }),
  GetShotAudio: async (v) => ({
    shot_audio: await listDocumentsFull(C.shot_audio, [
      import_node_appwrite3.Query.equal("shot_id", v.shotId)
    ])
  }),
  GetShotAudioFile: async (v) => ({
    shot_audio_by_pk: await getDocument(C.shot_audio, v.id)
  }),
  UpdateShotAudio: async (v) => ({
    update_shot_audio_by_pk: await updateDocument(
      C.shot_audio,
      v.id,
      v.changes
    )
  }),
  DeleteShotAudio: async (v) => {
    await deleteDocument(C.shot_audio, v.id);
    return { delete_shot_audio_by_pk: { id: v.id } };
  },
  GetBatchShotAudio: async (v) => {
    const shotIds = v.shotIds;
    const rows = [];
    for (const sid of shotIds) {
      rows.push(
        ...await listDocumentsFull(C.shot_audio, [
          import_node_appwrite3.Query.equal("shot_id", sid),
          import_node_appwrite3.Query.orderAsc("$createdAt")
        ])
      );
    }
    return { shot_audio: rows };
  },
  GetAiSettings: async (v) => ({
    ai_chat_settings: await listDocumentsFull(C.ai_chat_settings, [
      import_node_appwrite3.Query.equal("user_id", v.userId),
      import_node_appwrite3.Query.limit(1)
    ])
  }),
  /** Alias used by scriptony-image cover generation settings lookup. */
  GetImageSettings: async (v) => ({
    ai_chat_settings: await listDocumentsFull(C.ai_chat_settings, [
      import_node_appwrite3.Query.equal("user_id", v.userId),
      import_node_appwrite3.Query.limit(1)
    ])
  }),
  /** Alias used by scriptony-image image-settings route. */
  CreateImageSettings: async (v) => ({
    insert_ai_chat_settings_one: await createDocument(
      C.ai_chat_settings,
      import_node_appwrite3.ID.unique(),
      sanitizeAiChatSettingsInsert(v.object)
    )
  }),
  /** Used by `scriptony-assistant/ai/models.ts` to load keys/settings for dynamic model listing. */
  GetAiModelsContext: async (v) => ({
    ai_chat_settings: await listDocumentsFull(C.ai_chat_settings, [
      import_node_appwrite3.Query.equal("user_id", v.userId),
      import_node_appwrite3.Query.limit(1)
    ])
  }),
  CreateAiSettings: async (v) => ({
    insert_ai_chat_settings_one: await createDocument(
      C.ai_chat_settings,
      import_node_appwrite3.ID.unique(),
      sanitizeAiChatSettingsInsert(v.object)
    )
  }),
  UpdateAiSettings: async (v) => ({
    update_ai_chat_settings_by_pk: await updateDocument(
      C.ai_chat_settings,
      v.id,
      sanitizeAiChatSettingsUpdate(v.changes)
    )
  }),
  /** Alias used by scriptony-image image-settings route. */
  UpdateImageSettings: async (v) => ({
    update_ai_chat_settings_by_pk: await updateDocument(
      C.ai_chat_settings,
      v.id,
      sanitizeAiChatSettingsUpdate(v.changes)
    )
  }),
  GetActiveProvider: async (v) => ({
    ai_chat_settings: await listDocumentsFull(C.ai_chat_settings, [
      import_node_appwrite3.Query.equal("user_id", v.userId),
      import_node_appwrite3.Query.limit(1)
    ])
  }),
  GetAiConversations: async (v) => ({
    ai_conversations: await listDocumentsFull(C.ai_conversations, [
      import_node_appwrite3.Query.equal("user_id", v.userId),
      import_node_appwrite3.Query.orderDesc("last_message_at")
    ])
  }),
  CreateAiConversation: async (v) => ({
    insert_ai_conversations_one: await createDocument(
      C.ai_conversations,
      import_node_appwrite3.ID.unique(),
      v.object
    )
  }),
  GetConversationMessages: async (v) => {
    const rows = await listDocumentsFull(C.ai_chat_messages, [
      import_node_appwrite3.Query.equal("conversation_id", v.conversationId),
      import_node_appwrite3.Query.orderAsc("$createdAt")
    ]);
    return { ai_chat_messages: rows.map((r) => enrichAiChatMessageRow(r)) };
  },
  UpdateConversationPrompt: async (v) => ({
    update_ai_conversations_by_pk: await updateDocument(
      C.ai_conversations,
      v.id,
      {
        system_prompt: v.systemPrompt
      }
    )
  }),
  GetChatSettings: async (v) => ({
    ai_chat_settings: await listDocumentsFull(C.ai_chat_settings, [
      import_node_appwrite3.Query.equal("user_id", v.userId),
      import_node_appwrite3.Query.limit(1)
    ])
  }),
  CreateConversation: async (v) => ({
    insert_ai_conversations_one: await createDocument(
      C.ai_conversations,
      import_node_appwrite3.ID.unique(),
      v.object
    )
  }),
  CreateChatMessages: async (v) => {
    const objects = v.objects;
    const returning = [];
    for (const o of objects) {
      const payload = {
        conversation_id: o.conversation_id,
        role: o.role,
        content: o.content
      };
      if (typeof o.metadata_json === "string") {
        payload.metadata_json = o.metadata_json;
      }
      returning.push(
        await createDocument(C.ai_chat_messages, import_node_appwrite3.ID.unique(), payload)
      );
    }
    return {
      insert_ai_chat_messages: {
        returning: returning.map((r) => enrichAiChatMessageRow(r))
      }
    };
  },
  TouchConversation: async (v) => ({
    update_ai_conversations_by_pk: await updateDocument(
      C.ai_conversations,
      v.id,
      {
        message_count: v.messageCount,
        last_message_at: v.lastMessageAt
      }
    )
  }),
  QueueRagSync: async (v) => ({
    insert_rag_sync_queue_one: await createDocument(
      C.rag_sync_queue,
      import_node_appwrite3.ID.unique(),
      v.object
    )
  }),
  GetNodeLogs: async (v) => ({
    activity_logs: await listDocumentsFull(C.activity_logs, [
      import_node_appwrite3.Query.equal("entity_type", v.entityType),
      import_node_appwrite3.Query.equal("entity_id", v.entityId),
      import_node_appwrite3.Query.orderDesc("$createdAt"),
      import_node_appwrite3.Query.limit(v.limit)
    ])
  }),
  GetProjectLogs: async (v) => ({
    activity_logs: await listDocumentsFull(C.activity_logs, [
      import_node_appwrite3.Query.equal("project_id", v.projectId),
      import_node_appwrite3.Query.orderDesc("$createdAt"),
      import_node_appwrite3.Query.limit(v.limit)
    ])
  }),
  GetProjectStatsPayload: async (v) => {
    const projectId = v.projectId;
    const projects_by_pk = await getDocument(C.projects, projectId);
    const timeline_nodes = await listDocumentsFull(C.timeline_nodes, [
      import_node_appwrite3.Query.equal("project_id", projectId)
    ]);
    const shots = await listDocumentsFull(C.shots, [
      import_node_appwrite3.Query.equal("project_id", projectId)
    ]);
    const characters = await listDocumentsFull(C.characters, [
      import_node_appwrite3.Query.equal("project_id", projectId)
    ]);
    const worlds = await listDocumentsFull(C.worlds, [
      import_node_appwrite3.Query.equal("linked_project_id", projectId)
    ]);
    return { projects_by_pk, timeline_nodes, shots, characters, worlds };
  },
  GetShotCharacterCounts: async (v) => {
    const shots = await listDocumentsFull(C.shots, [
      import_node_appwrite3.Query.equal("project_id", v.projectId)
    ]);
    const links = [];
    for (const s of shots) {
      const sc = await listDocumentsFull(C.shot_characters, [
        import_node_appwrite3.Query.equal("shot_id", s.id)
      ]);
      for (const l of sc) {
        const ch = await getDocument(C.characters, l.character_id);
        links.push({
          character_id: l.character_id,
          character: ch ? { name: ch.name || "Unknown" } : null
        });
      }
    }
    return { shot_characters: links };
  },
  GetShotStats: async (v) => {
    const shots_by_pk = await getDocument(C.shots, v.id);
    const shot_characters = await listDocumentsFull(C.shot_characters, [
      import_node_appwrite3.Query.equal("shot_id", v.id)
    ]);
    return { shots_by_pk, shot_characters };
  },
  GetNodeStats: async (v) => {
    const id = v.id;
    const node = await getDocument(C.timeline_nodes, id);
    if (!node) {
      return {
        timeline_nodes_by_pk: null,
        timeline_nodes: [],
        shots: [],
        shot_characters: []
      };
    }
    const projectId = node.project_id;
    const allNodes = await listDocumentsFull(C.timeline_nodes, [
      import_node_appwrite3.Query.equal("project_id", projectId)
    ]);
    const byParent = /* @__PURE__ */ new Map();
    for (const n of allNodes) {
      const key = n.parent_id ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(n);
    }
    const desc = [];
    const stack = [...byParent.get(id) || []];
    while (stack.length) {
      const cur = stack.pop();
      desc.push(cur);
      stack.push(...byParent.get(cur.id) || []);
    }
    const sceneIds = /* @__PURE__ */ new Set();
    if (node.level === 3) sceneIds.add(id);
    for (const d of desc) {
      if (d.level === 3) sceneIds.add(d.id);
    }
    const allShots = await listDocumentsFull(C.shots, [
      import_node_appwrite3.Query.equal("project_id", projectId)
    ]);
    const relevantShots = allShots.filter(
      (s) => sceneIds.has(s.scene_id)
    );
    const shot_characters = [];
    for (const s of relevantShots) {
      shot_characters.push(
        ...await listDocumentsFull(C.shot_characters, [
          import_node_appwrite3.Query.equal("shot_id", s.id)
        ])
      );
    }
    return {
      timeline_nodes_by_pk: node,
      timeline_nodes: desc,
      shots: relevantShots,
      shot_characters
    };
  },
  GetSceneCharacters: async (v) => {
    const shotIds = v.shotIds;
    const rows = [];
    for (const sid of shotIds) {
      const sc = await listDocumentsFull(C.shot_characters, [
        import_node_appwrite3.Query.equal("shot_id", sid)
      ]);
      for (const l of sc) rows.push({ character_id: l.character_id });
    }
    return { shot_characters: rows };
  },
  GetProjectAudioCount: async (v) => {
    const shots = await listDocumentsFull(C.shots, [
      import_node_appwrite3.Query.equal("project_id", v.projectId)
    ]);
    let n = 0;
    for (const s of shots) {
      const aud = await listDocumentsFull(C.shot_audio, [
        import_node_appwrite3.Query.equal("shot_id", s.id)
      ]);
      n += aud.length;
    }
    return { shot_audio_aggregate: { aggregate: { count: n } } };
  },
  GetSuperadminUsers: async () => ({
    users: await listDocumentsFull(C.users, [
      import_node_appwrite3.Query.orderDesc("$createdAt"),
      import_node_appwrite3.Query.limit(500)
    ])
  }),
  GetSuperadminStats: async () => {
    const [users, orgs, projects, worlds] = await Promise.all([
      countDocuments(C.users),
      countDocuments(C.organizations),
      countDocuments(C.projects, [
        import_node_appwrite3.Query.or([
          import_node_appwrite3.Query.equal("is_deleted", false),
          import_node_appwrite3.Query.isNull("is_deleted")
        ])
      ]),
      countDocuments(C.worlds)
    ]);
    return {
      users_aggregate: { aggregate: { count: users } },
      organizations_aggregate: { aggregate: { count: orgs } },
      projects_aggregate: { aggregate: { count: projects } },
      worlds_aggregate: { aggregate: { count: worlds } }
    };
  },
  GetSuperadminOrganizations: async () => {
    const organizations = await listDocumentsFull(C.organizations, [
      import_node_appwrite3.Query.orderDesc("$createdAt"),
      import_node_appwrite3.Query.limit(500)
    ]);
    const organization_members = await listDocumentsFull(
      C.organization_members,
      [import_node_appwrite3.Query.limit(5e3)]
    );
    const projects = await listDocumentsFull(C.projects, [
      import_node_appwrite3.Query.or([import_node_appwrite3.Query.equal("is_deleted", false), import_node_appwrite3.Query.isNull("is_deleted")]),
      import_node_appwrite3.Query.limit(5e3)
    ]);
    const worlds = await listDocumentsFull(C.worlds, [import_node_appwrite3.Query.limit(5e3)]);
    return {
      organizations,
      organization_members: organization_members.map((m) => ({
        organization_id: m.organization_id
      })),
      projects: projects.map((p) => ({ organization_id: p.organization_id })),
      worlds: worlds.map((w) => ({ organization_id: w.organization_id }))
    };
  },
  GetSuperadminAnalytics: async () => {
    const totalEvents = await countDocuments(C.activity_logs);
    const activity_logs = await listDocumentsFull(C.activity_logs, [
      import_node_appwrite3.Query.orderDesc("$createdAt"),
      import_node_appwrite3.Query.limit(500)
    ]);
    const organization_members = await listDocumentsFull(
      C.organization_members,
      [import_node_appwrite3.Query.limit(2e3)]
    );
    return {
      activity_logs_aggregate: { aggregate: { count: totalEvents } },
      activity_logs,
      organization_members
    };
  },
  GetStorageUsage: async (v) => {
    const organizationId = v.organizationId;
    const shot_audio = await listShotAudioForOrg(organizationId);
    const projects = await listDocumentsFull(C.projects, [
      import_node_appwrite3.Query.equal("organization_id", organizationId)
    ]);
    const worlds = await listDocumentsFull(C.worlds, [
      import_node_appwrite3.Query.equal("organization_id", organizationId)
    ]);
    const allShots = [];
    for (const p of projects) {
      allShots.push(
        ...await listDocumentsFull(C.shots, [
          import_node_appwrite3.Query.equal("project_id", p.id)
        ])
      );
    }
    return {
      shot_audio,
      projects: projects.map((p) => ({ cover_image_url: p.cover_image_url })),
      worlds: worlds.map((w) => ({ cover_image_url: w.cover_image_url })),
      shots: allShots.map((s) => ({
        image_url: s.image_url,
        storyboard_url: s.storyboard_url
      }))
    };
  },
  // Project Inspirations
  GetProjectInspirations: async (v) => ({
    project_inspirations: await listDocumentsFull(C.project_inspirations, [
      import_node_appwrite3.Query.equal("project_id", v.projectId),
      import_node_appwrite3.Query.orderAsc("order_index")
    ])
  }),
  DeleteProjectInspirations: async (v) => {
    const rows = await listDocumentsFull(C.project_inspirations, [
      import_node_appwrite3.Query.equal("project_id", v.projectId)
    ]);
    let affected_rows = 0;
    for (const r of rows) {
      const docId = r.$id || r.id;
      if (docId) {
        await deleteDocument(C.project_inspirations, docId);
        affected_rows++;
      }
    }
    return { delete_project_inspirations: { affected_rows } };
  },
  InsertProjectInspirations: async (v) => {
    const objects = v.objects;
    const created = [];
    for (const o of objects) {
      created.push(
        await createDocument(C.project_inspirations, import_node_appwrite3.ID.unique(), o)
      );
    }
    return { insert_project_inspirations: { affected_rows: created.length } };
  },
  // ============================================================================
  // scriptony-audio-story: Audio Tracks, Sessions, Voice Assignments
  // ============================================================================
  GetAudioTracks: async (v) => ({
    scene_audio_tracks: await listDocumentsFull(
      C.scene_audio_tracks,
      [
        import_node_appwrite3.Query.equal("scene_id", v.sceneId),
        import_node_appwrite3.Query.orderAsc("start_time")
      ],
      500
    )
  }),
  CreateAudioTrack: async (v) => ({
    insert_scene_audio_tracks_one: await createDocument(
      C.scene_audio_tracks,
      import_node_appwrite3.ID.unique(),
      v.object
    )
  }),
  GetTrackProject: async (v) => ({
    scene_audio_tracks_by_pk: await getDocument(
      C.scene_audio_tracks,
      v.id
    )
  }),
  UpdateAudioTrack: async (v) => ({
    update_scene_audio_tracks_by_pk: await updateDocument(
      C.scene_audio_tracks,
      v.id,
      v.set
    )
  }),
  GetSceneClipsInfo: async (v) => {
    const sceneId = v.sceneId;
    const allClips = await listDocumentsFull(
      C.audio_clips,
      [import_node_appwrite3.Query.equal("scene_id", sceneId), import_node_appwrite3.Query.orderDesc("end_sec")],
      500
    );
    const count = allClips.length;
    const lastClip = allClips.length > 0 ? allClips[0] : null;
    return {
      audio_clips_aggregate: { aggregate: { count } },
      audio_clips: lastClip ? [{ end_sec: lastClip.end_sec ?? 0 }] : []
    };
  },
  // Alias for T29 track time update (same as UpdateAudioTrack)
  UpdateTrackTime: async (v) => ({
    update_scene_audio_tracks_by_pk: await updateDocument(
      C.scene_audio_tracks,
      v.id,
      v.set
    )
  }),
  DeleteAudioTrack: async (v) => {
    await deleteDocument(C.scene_audio_tracks, v.id);
    return { delete_scene_audio_tracks_by_pk: { id: v.id } };
  },
  // ── Audio Clips (T28) ──────────────────────────────────────────────
  GetAudioClips: async (v) => ({
    audio_clips: await listDocumentsFull(
      C.audio_clips,
      [
        import_node_appwrite3.Query.equal("scene_id", v.sceneId),
        import_node_appwrite3.Query.orderAsc("lane_index"),
        import_node_appwrite3.Query.orderAsc("order_index")
      ],
      500
    )
  }),
  CreateAudioClip: async (v) => ({
    insert_audio_clips_one: await createDocument(
      C.audio_clips,
      import_node_appwrite3.ID.unique(),
      v.object
    )
  }),
  GetAudioClip: async (v) => ({
    audio_clips_by_pk: await getDocument(C.audio_clips, v.id)
  }),
  UpdateAudioClip: async (v) => ({
    update_audio_clips_by_pk: await updateDocument(
      C.audio_clips,
      v.id,
      v.set
    )
  }),
  DeleteAudioClip: async (v) => {
    await deleteDocument(C.audio_clips, v.id);
    return { delete_audio_clips_by_pk: { id: v.id } };
  },
  GetAudioSessions: async (v) => ({
    audio_sessions: await listDocumentsFull(
      C.audio_sessions,
      [
        import_node_appwrite3.Query.equal("scene_id", v.sceneId),
        import_node_appwrite3.Query.orderDesc("$createdAt")
      ],
      500
    )
  }),
  CreateAudioSession: async (v) => ({
    insert_audio_sessions_one: await createDocument(
      C.audio_sessions,
      import_node_appwrite3.ID.unique(),
      v.object
    )
  }),
  GetAudioSession: async (v) => ({
    audio_sessions_by_pk: await getDocument(C.audio_sessions, v.id)
  }),
  GetVoiceAssignments: async (v) => ({
    character_voice_assignments: await listDocumentsFull(
      C.character_voice_assignments,
      [import_node_appwrite3.Query.equal("project_id", v.projectId)],
      500
    )
  }),
  AssignVoice: async (v) => ({
    insert_character_voice_assignments_one: await createDocument(
      C.character_voice_assignments,
      import_node_appwrite3.ID.unique(),
      v.object
    )
  })
};

// functions/_shared/graphql-operations/index.ts
async function dispatchGraphqlOperation(name, variables) {
  const fn = allHandlers[name];
  if (!fn) {
    throw new Error(
      `Unimplemented GraphQL operation: ${name}. Add it in functions/_shared/graphql-operations/handlers-all.ts`
    );
  }
  return fn(variables || {});
}

// functions/_shared/graphql-compat.ts
function extractOperationName(query) {
  const cleaned = query.replace(/#[^\n\r]*/g, " ").replace(/\s+/g, " ");
  const m = cleaned.match(/\b(query|mutation)\s+(\w+)/);
  if (!m) {
    throw new Error("Could not parse GraphQL operation name from query");
  }
  return m[2];
}
async function requestGraphql(query, variables) {
  const name = extractOperationName(query);
  const result = await dispatchGraphqlOperation(name, variables);
  return result;
}

// functions/_shared/auth-bootstrap.ts
function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "scriptony";
}
function resolveDisplayName(user, defaultName = "Scriptony User") {
  return user.displayName || (typeof user.metadata?.name === "string" ? user.metadata.name : "") || user.email?.split("@")[0] || defaultName;
}
async function ensureUserBootstrap(user) {
  const data = await requestGraphql(
    `
      query GetExistingUserState($userId: uuid!) {
        users_by_pk(id: $userId) {
          id
        }
        organization_members(
          where: { user_id: { _eq: $userId } }
          limit: 1
        ) {
          organization_id
        }
      }
    `,
    { userId: user.id }
  );
  let organizationId = data.organization_members[0]?.organization_id || null;
  if (!organizationId) {
    const displayName = resolveDisplayName(user, "Scriptony User");
    const createdOrg = await requestGraphql(
      `
        mutation CreateOrganization($object: organizations_insert_input!) {
          insert_organizations_one(object: $object) {
            id
          }
        }
      `,
      {
        object: {
          name: `${displayName}'s Organization`,
          slug: `${slugify(displayName)}-${user.id.slice(0, 8)}`,
          owner_user_id: user.id
        }
      }
    );
    organizationId = createdOrg.insert_organizations_one.id;
    await requestGraphql(
      `
        mutation AddOrganizationMember($object: organization_members_insert_input!) {
          insert_organization_members_one(object: $object) {
            organization_id
          }
        }
      `,
      {
        object: {
          organization_id: organizationId,
          user_id: user.id,
          role: "owner"
        }
      }
    );
  }
  const profileName = resolveDisplayName(user, "User");
  await requestGraphql(
    `
      mutation UpsertUser($object: users_insert_input!) {
        insert_users_one(
          object: $object
          on_conflict: {
            constraint: users_pkey
            update_columns: [display_name, email, organization_id, avatar_url]
          }
        ) {
          id
        }
      }
    `,
    {
      object: {
        id: user.id,
        display_name: profileName,
        email: user.email || null,
        avatar_url: user.avatarUrl || null,
        organization_id: organizationId
      }
    }
  );
  return { user, organizationId };
}

// functions/_shared/auth-jwt.ts
var import_node_buffer = require("node:buffer");
var import_node_appwrite4 = require("node-appwrite");
var ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  USER: "user"
};
function getBearerToken(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length).trim();
}
function describeAuthError(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  return "Unknown auth validation error";
}
function decodeJwtSessionClaims(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      return null;
    }
    const payload = JSON.parse(
      import_node_buffer.Buffer.from(parts[1], "base64url").toString("utf8")
    );
    const userId = typeof payload.userId === "string" ? payload.userId.trim() : "";
    const sessionId = typeof payload.sessionId === "string" ? payload.sessionId.trim() : "";
    const exp = typeof payload.exp === "number" ? payload.exp : void 0;
    if (!userId || !sessionId) {
      return null;
    }
    return { userId, sessionId, exp };
  } catch (err) {
    console.error("[auth-jwt] failed to decode JWT session claims:", err);
    return null;
  }
}
async function getUserFromSessionFallback(token) {
  const claims = decodeJwtSessionClaims(token);
  if (!claims) {
    return null;
  }
  if (typeof claims.exp === "number" && claims.exp * 1e3 <= Date.now()) {
    return null;
  }
  const client = new import_node_appwrite4.Client().setEndpoint(getAppwriteEndpoint()).setProject(getAppwriteProjectId()).setKey(getAppwriteApiKey());
  try {
    const users = new import_node_appwrite4.Users(client);
    const sessions = await users.listSessions(claims.userId);
    const activeSession = sessions.sessions.find(
      (session) => session.$id === claims.sessionId
    );
    if (!activeSession) {
      return null;
    }
    return { id: claims.userId, defaultRole: ROLES.USER };
  } catch (err) {
    console.error("[auth-jwt] session fallback failed:", err);
    return null;
  }
}
function getUserFromDecodedJwtFallback(token) {
  const claims = decodeJwtSessionClaims(token);
  if (!claims) {
    return null;
  }
  if (typeof claims.exp === "number" && claims.exp * 1e3 <= Date.now()) {
    return null;
  }
  return { id: claims.userId, defaultRole: ROLES.USER };
}
function getAuthCandidateEndpoints() {
  const rawCandidates = [
    getOptionalEnv("SCRIPTONY_APPWRITE_API_ENDPOINT"),
    getOptionalEnv("APPWRITE_FUNCTION_API_ENDPOINT")
  ];
  const seen = /* @__PURE__ */ new Set();
  const endpoints = [];
  for (const candidate of rawCandidates) {
    const trimmed = candidate?.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    endpoints.push(trimmed);
  }
  const pub = getPublicAppwriteEndpoint();
  if (pub && !seen.has(pub)) {
    endpoints.push(pub);
  }
  return endpoints;
}
async function getUserFromTokenInner(token) {
  const claims = decodeJwtSessionClaims(token);
  if (claims?.exp && claims.exp * 1e3 <= Date.now()) {
    return null;
  }
  const attempts = [];
  for (const authEndpoint of getAuthCandidateEndpoints()) {
    const client = new import_node_appwrite4.Client().setEndpoint(authEndpoint).setProject(getAppwriteProjectId()).setJWT(token);
    try {
      const account = new import_node_appwrite4.Account(client);
      const u = await account.get();
      const prefs = u.prefs || {};
      return {
        id: u.$id,
        email: u.email,
        displayName: u.name,
        avatarUrl: typeof prefs.avatar === "string" ? prefs.avatar : void 0,
        defaultRole: u.labels?.includes(ROLES.SUPERADMIN) ? ROLES.SUPERADMIN : u.labels?.includes(ROLES.ADMIN) ? ROLES.ADMIN : ROLES.USER,
        metadata: { ...prefs, labels: u.labels }
      };
    } catch (error) {
      attempts.push({
        endpoint: authEndpoint,
        message: describeAuthError(error)
      });
    }
  }
  if (attempts.length > 0) {
    const fallbackUser = await getUserFromSessionFallback(token);
    if (fallbackUser) {
      console.warn("[Auth] JWT validation recovered via session fallback", {
        userId: fallbackUser.id,
        attempts
      });
      return fallbackUser;
    }
    const decodedUser = getUserFromDecodedJwtFallback(token);
    if (decodedUser) {
      console.warn("[Auth] JWT validation recovered via decoded fallback", {
        userId: decodedUser.id,
        attempts
      });
      return decodedUser;
    }
    console.warn("[Auth] Bearer token validation failed", { attempts });
  }
  return null;
}
async function getUserFromToken(token) {
  const claims = decodeJwtSessionClaims(token);
  if (claims?.exp && claims.exp * 1e3 <= Date.now()) {
    return null;
  }
  const AUTH_VALIDATION_TIMEOUT_MS = 5e3;
  return Promise.race([
    getUserFromTokenInner(token),
    new Promise((resolve) => {
      setTimeout(() => {
        const decodedUser = getUserFromDecodedJwtFallback(token);
        if (decodedUser) {
          console.warn(
            "[Auth] JWT validation recovered via decoded fallback (global timeout)",
            { userId: decodedUser.id, timeoutMs: AUTH_VALIDATION_TIMEOUT_MS }
          );
        }
        resolve(decodedUser);
      }, AUTH_VALIDATION_TIMEOUT_MS);
    })
  ]);
}
async function getUserFromAuthHeader(authHeader) {
  const token = getBearerToken(authHeader);
  if (!token) {
    return null;
  }
  return getUserFromToken(token);
}

// functions/_shared/auth-integration.ts
var import_crypto = require("crypto");
function hashIntegrationToken(token) {
  return (0, import_crypto.createHash)("sha256").update(token, "utf8").digest("hex");
}
async function resolveIntegrationToken(token) {
  if (!token || token.length < 16) {
    return null;
  }
  const tokenHash = hashIntegrationToken(token);
  try {
    const data = await requestGraphql(
      `
        query GetUserByIntegrationToken($tokenHash: String!) {
          user_integration_tokens(
            where: { token_hash: { _eq: $tokenHash } }
            limit: 1
          ) {
            user_id
          }
        }
      `,
      { tokenHash }
    );
    const row = data?.user_integration_tokens?.[0];
    if (!row?.user_id) {
      return null;
    }
    const profile = await requestGraphql(
      `
        query GetUserProfile($userId: uuid!) {
          users_by_pk(id: $userId) {
            id
            name
            email
            avatar_url
          }
        }
      `,
      { userId: row.user_id }
    );
    const u = profile?.users_by_pk;
    if (!u) {
      return null;
    }
    return {
      id: u.id,
      displayName: u.name ?? void 0,
      email: u.email ?? void 0,
      avatarUrl: u.avatar_url ?? void 0
    };
  } catch (err) {
    console.error("[auth-integration] resolveIntegrationToken failed:", err);
    return null;
  }
}

// functions/_shared/http.ts
var CORS_COMMON = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, X-Appwrite-Project, X-Appwrite-Key, X-SDK-Version",
  "Access-Control-Max-Age": "86400",
  // Chrome: localhost → hostname that resolves to RFC1918 (e.g. self-hosted Appwrite) requires this on preflight.
  "Access-Control-Allow-Private-Network": "true"
};
var CORS_HEADERS = {
  ...CORS_COMMON,
  "Access-Control-Allow-Origin": "*"
};
function sendJson(res, status, body) {
  res.status(status).json(body);
}
function sendMethodNotAllowed(res, allowed) {
  res.setHeader("Allow", allowed.join(", "));
  sendJson(res, 405, { error: "Method not allowed", allowed });
}
function sendUnauthorized(res, message = "Unauthorized", code = "AUTH_UNAUTHORIZED") {
  sendJson(res, 401, { error: message, code });
}
function sendNotFound(res, message = "Not found") {
  sendJson(res, 404, { error: message });
}
function sendBadRequest(res, message) {
  sendJson(res, 400, { error: message });
}
function classifyServerError(error) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Unexpected server error";
  const normalized = message.toLowerCase();
  if (normalized.includes("timed out after")) {
    return {
      code: "UPSTREAM_TIMEOUT",
      message,
      logLabel: "Upstream request timed out",
      logLevel: "warn"
    };
  }
  if (normalized.includes("fetch failed")) {
    return {
      code: "UPSTREAM_FETCH_FAILED",
      message: "Upstream request failed",
      logLabel: "Upstream request failed",
      logLevel: "warn"
    };
  }
  if (normalized.includes("terminated")) {
    return {
      code: "UPSTREAM_REQUEST_TERMINATED",
      message: "Upstream request terminated",
      logLabel: "Upstream request terminated",
      logLevel: "warn"
    };
  }
  return {
    code: "INTERNAL_SERVER_ERROR",
    message,
    logLabel: "Unexpected error",
    logLevel: "error"
  };
}
function sendServerError(res, error) {
  const classified = classifyServerError(error);
  if (classified.logLevel === "warn") {
    console.warn(`[Functions][${classified.code}] ${classified.logLabel}`, {
      message: error instanceof Error ? error.message : String(error)
    });
  } else {
    console.error(
      `[Functions][${classified.code}] ${classified.logLabel}:`,
      error
    );
  }
  sendJson(res, 500, { error: classified.message, code: classified.code });
}
async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string" && req.body.trim()) {
    return JSON.parse(req.body);
  }
  return {};
}
function getParam(req, name) {
  return req.params?.[name];
}
function getQuery(req, name) {
  const value = req.query?.[name];
  return Array.isArray(value) ? value[0] : value;
}

// functions/_shared/auth.ts
function getRequestHeaderValue(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || void 0;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === "string") {
        const trimmed = entry.trim();
        if (trimmed) {
          return trimmed;
        }
      }
    }
  }
  return void 0;
}
function getRequestHeader(req, name) {
  if (!req || typeof req !== "object") {
    return void 0;
  }
  const reqHeader = req.header;
  if (typeof reqHeader === "function") {
    try {
      const fromReq = getRequestHeaderValue(reqHeader.call(req, name));
      if (fromReq) {
        return fromReq;
      }
    } catch {
    }
  }
  if (!req.headers || typeof req.headers !== "object") {
    return void 0;
  }
  const headers = req.headers;
  const direct = getRequestHeaderValue(headers[name]);
  if (direct) {
    return direct;
  }
  if (typeof headers.get === "function") {
    try {
      const fromGetter = getRequestHeaderValue(headers.get(name));
      if (fromGetter) {
        return fromGetter;
      }
    } catch {
    }
  }
  const normalizedName = name.toLowerCase();
  if (typeof headers[Symbol.iterator] === "function") {
    try {
      for (const entry of headers) {
        if (!Array.isArray(entry) || entry.length < 2) {
          continue;
        }
        const [headerName, headerValue] = entry;
        if (typeof headerName === "string" && headerName.toLowerCase() === normalizedName) {
          return getRequestHeaderValue(headerValue);
        }
      }
    } catch {
    }
  }
  for (const [headerName, headerValue] of Object.entries(headers)) {
    if (headerName.toLowerCase() === normalizedName) {
      return getRequestHeaderValue(headerValue);
    }
  }
  return void 0;
}
function getAuthorizationFromRequest(authSource) {
  if (typeof authSource === "string") {
    const trimmed = authSource.trim();
    return trimmed || void 0;
  }
  const bearer = getRequestHeader(authSource, "authorization");
  if (bearer) {
    return bearer;
  }
  const appwriteJwt = getRequestHeader(authSource, "x-appwrite-user-jwt");
  if (appwriteJwt) {
    return `Bearer ${appwriteJwt}`;
  }
  return void 0;
}
function getTrustedExecutionUserId(authSource) {
  if (!authSource || typeof authSource === "string") {
    return null;
  }
  const executionId = getRequestHeader(authSource, "x-appwrite-execution-id");
  const userId = getRequestHeader(authSource, "x-appwrite-user-id");
  if (!executionId || !userId) {
    return null;
  }
  return userId;
}
async function resolveAuthenticatedUser(authSource) {
  const authHeader = getAuthorizationFromRequest(authSource);
  let user = await getUserFromAuthHeader(authHeader);
  if (!user) {
    const token = getBearerToken(authHeader);
    if (token) {
      user = await resolveIntegrationToken(token);
    }
  }
  if (user) {
    return user;
  }
  const trustedUserId = getTrustedExecutionUserId(authSource);
  if (trustedUserId) {
    return { id: trustedUserId };
  }
  return null;
}
function authDiagnostics(authSource) {
  const authorization = typeof authSource === "string" ? authSource.trim() || void 0 : getRequestHeader(authSource, "authorization");
  return {
    hasAuthorization: Boolean(authorization),
    authorizationScheme: authorization?.split(/\s+/, 1)[0] || null,
    hasAppwriteUserJwt: Boolean(
      getRequestHeader(
        authSource,
        "x-appwrite-user-jwt"
      )
    ),
    hasTrustedExecutionId: Boolean(
      getRequestHeader(
        authSource,
        "x-appwrite-execution-id"
      )
    ),
    hasTrustedUserId: Boolean(
      getRequestHeader(
        authSource,
        "x-appwrite-user-id"
      )
    )
  };
}
function logAuthResolutionFailure(authSource, scope) {
  const diagnostics = authDiagnostics(authSource);
  if (!diagnostics.hasAuthorization && !diagnostics.hasAppwriteUserJwt && !diagnostics.hasTrustedExecutionId && !diagnostics.hasTrustedUserId) {
    return;
  }
  console.warn(
    `[${scope}] Unable to resolve user from auth source`,
    diagnostics
  );
}
async function requireAuthenticatedUser(authSource) {
  const user = await resolveAuthenticatedUser(authSource);
  if (!user) {
    logAuthResolutionFailure(authSource, "requireAuthenticatedUser");
    return null;
  }
  return user;
}
async function requireUserBootstrap(authSource) {
  const user = await requireAuthenticatedUser(authSource);
  if (!user) {
    return null;
  }
  return ensureUserBootstrap(user);
}

// functions/scriptony-audio-story/_shared/access.ts
function getString(value) {
  if (typeof value === "string" && value.length > 0) return value;
  return void 0;
}
function isNonEmptyId(id) {
  return typeof id === "string" && id.trim().length > 0;
}
async function getDb() {
  return getDatabases();
}
async function getCreatorId(projectId) {
  const database = await getDb();
  const doc = await database.getDocument(dbId(), "projects", projectId);
  return getString(doc.user_id) ?? getString(doc.created_by);
}
async function isProjectCreator(userId, projectId) {
  if (!isNonEmptyId(userId) || !isNonEmptyId(projectId)) return false;
  const creator = await getCreatorId(projectId);
  return userId === creator;
}
async function canReadProject(userId, projectId) {
  return isProjectCreator(userId, projectId);
}
async function canEditProject(userId, projectId) {
  return isProjectCreator(userId, projectId);
}

// functions/_shared/audio-utils.ts
var WPM_DEFAULTS = {
  base: 150,
  languageModifiers: { de: 1, en: 1.07, es: 1.03 },
  emotionModifiers: {
    sachlich: 1,
    am\u00FCsiert: 1.1,
    aufgeregt: 1.2,
    w\u00FCtend: 1.25,
    traurig: 0.85,
    \u00E4ngstlich: 1.15,
    nachdenklich: 0.9,
    begeistert: 1.15
  },
  typeDefaults: {
    dialog: 150,
    narrator: 140,
    sfx: 0,
    music: 0,
    atmo: 0
  },
  minDurationSec: 1,
  maxDurationSec: 600
};
function estimateDurationSec(text, options = {}) {
  const {
    type = "dialog",
    emotion = "sachlich",
    language = "de",
    wpmOverride
  } = options;
  if (type === "sfx" || type === "music" || type === "atmo") {
    return type === "sfx" ? 3 : 60;
  }
  const normalized = (text || "").trim();
  const words = normalized.length === 0 ? 0 : normalized.split(/\s+/).filter((w) => w.length > 0).length;
  if (words === 0) return WPM_DEFAULTS.minDurationSec;
  const baseWpm = wpmOverride ?? WPM_DEFAULTS.typeDefaults[type] ?? WPM_DEFAULTS.base;
  const langModifier = WPM_DEFAULTS.languageModifiers[language] ?? 1;
  const emotionModifier = WPM_DEFAULTS.emotionModifiers[emotion] ?? 1;
  const effectiveWpm = baseWpm * langModifier * emotionModifier;
  const duration = words / effectiveWpm * 60;
  return Math.min(
    Math.max(duration, WPM_DEFAULTS.minDurationSec),
    WPM_DEFAULTS.maxDurationSec
  );
}

// functions/scriptony-audio-story/routes/tracks.ts
async function listTracks(req, res) {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }
  const sceneId = getQuery(req, "sceneId") || getParam(req, "sceneId");
  const projectId = getQuery(req, "project_id") || getParam(req, "project_id");
  if (!sceneId) {
    sendBadRequest(res, "sceneId is required");
    return;
  }
  if (projectId && !await canReadProject(bootstrap.user.id, projectId)) {
    sendUnauthorized(res);
    return;
  }
  try {
    const data = await requestGraphql(
      `
      query GetAudioTracks($sceneId: uuid!) {
        scene_audio_tracks(
          where: { scene_id: { _eq: $sceneId } }
          order_by: { start_time: asc }
        ) {
          id
          scene_id
          project_id
          type
          content
          character_id
          audio_file_id
          waveform_data
          start_time
          duration
          fade_in
          fade_out
          tts_voice_id
          tts_settings
          tts_audio_generated
          created_at
          updated_at
        }
      }
    `,
      { sceneId }
    );
    sendJson(res, 200, { tracks: data.scene_audio_tracks });
  } catch (error) {
    console.error("[Audio Story] Error fetching tracks:", error);
    sendServerError(res, error);
  }
}
async function createTrack(req, res) {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }
  const body = await readJsonBody(req);
  const {
    sceneId,
    type,
    content,
    characterId,
    startTime,
    duration,
    projectId
  } = body;
  if (!sceneId || !type || !projectId) {
    sendBadRequest(res, "sceneId, type, and projectId are required");
    return;
  }
  if (!await canEditProject(bootstrap.user.id, String(projectId))) {
    sendUnauthorized(res);
    return;
  }
  let trackId = null;
  let clipId = null;
  try {
    const trackData = await requestGraphql(
      `
      mutation CreateAudioTrack($object: scene_audio_tracks_insert_input!) {
        insert_scene_audio_tracks_one(object: $object) {
          id
          scene_id
          project_id
          type
          content
          character_id
          start_time
          duration
          created_at
          updated_at
        }
      }
    `,
      {
        object: {
          scene_id: sceneId,
          project_id: projectId,
          type,
          content: content || null,
          character_id: characterId || null,
          start_time: startTime || 0,
          duration: duration || 0,
          created_by: bootstrap.user.id
        }
      }
    );
    const track = trackData.insert_scene_audio_tracks_one;
    trackId = String(track.id);
    const ttsSettings = body.ttsSettings;
    const emotion = typeof ttsSettings === "object" && ttsSettings !== null && !Array.isArray(ttsSettings) ? ttsSettings.emotion : void 0;
    const wpmEstimate = estimateDurationSec(String(content || ""), {
      type,
      emotion: typeof emotion === "string" ? emotion : void 0
    });
    const clipsAggData = await requestGraphql(
      `
      query GetSceneClipsInfo($sceneId: uuid!) {
        audio_clips_aggregate(where: { scene_id: { _eq: $sceneId } }) {
          aggregate { count }
        }
        audio_clips(where: { scene_id: { _eq: $sceneId } }, order_by: { end_sec: desc }, limit: 1) {
          end_sec
        }
      }
    `,
      { sceneId }
    );
    const clipCount = clipsAggData.audio_clips_aggregate.aggregate?.count ?? 0;
    const lastEndSec = clipsAggData.audio_clips[0]?.end_sec ?? 0;
    const clipStartSec = lastEndSec;
    const clipEndSec = clipStartSec + wpmEstimate;
    const clipData = await requestGraphql(
      `
      mutation CreateAudioClip($object: audio_clips_insert_input!) {
        insert_audio_clips_one(object: $object) {
          id
          track_id
          scene_id
          project_id
          start_sec
          end_sec
          lane_index
          order_index
          track_type
          content
          character_id
          created_at
        }
      }
    `,
      {
        object: {
          track_id: trackId,
          scene_id: sceneId,
          project_id: projectId,
          start_sec: clipStartSec,
          end_sec: clipEndSec,
          lane_index: resolveLaneIndex(
            String(type),
            characterId
          ),
          order_index: clipCount,
          track_type: type,
          content: content || null,
          character_id: characterId || null,
          created_by: bootstrap.user.id
        }
      }
    );
    clipId = String(clipData.insert_audio_clips_one.id);
    await requestGraphql(
      `
      mutation UpdateTrackTime($id: uuid!, $set: scene_audio_tracks_set_input!) {
        update_scene_audio_tracks_by_pk(pk_columns: { id: $id }, _set: $set) {
          id
        }
      }
    `,
      {
        id: trackId,
        set: {
          start_time: clipStartSec,
          duration: wpmEstimate
        }
      }
    );
    sendJson(res, 201, {
      track: { ...track, start_time: clipStartSec, duration: wpmEstimate },
      clip: clipData.insert_audio_clips_one
    });
  } catch (error) {
    if (clipId) {
      try {
        await requestGraphql(
          `
          mutation DeleteAudioClip($id: uuid!) {
            delete_audio_clips_by_pk(id: $id) { id }
          }
        `,
          { id: clipId }
        );
      } catch (rollbackErr) {
        console.error("[Audio Story] Clip rollback failed:", rollbackErr);
      }
    }
    if (trackId) {
      try {
        await requestGraphql(
          `
          mutation DeleteAudioTrack($id: uuid!) {
            delete_scene_audio_tracks_by_pk(id: $id) { id }
          }
        `,
          { id: trackId }
        );
      } catch (rollbackErr) {
        console.error("[Audio Story] Track rollback failed:", rollbackErr);
      }
    }
    console.error("[Audio Story] Error creating track:", error);
    sendServerError(res, error);
  }
}
function resolveLaneIndex(type, _characterId) {
  switch (type) {
    case "dialog":
      return 0;
    case "narrator":
      return 1;
    case "sfx":
      return 10;
    case "music":
      return 20;
    case "atmo":
      return 30;
    default:
      return 0;
  }
}
async function updateTrack(req, res, trackId) {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }
  try {
    const trackData = await requestGraphql(
      `
      query GetTrackProject($id: uuid!) {
        scene_audio_tracks_by_pk(id: $id) { project_id }
      }
    `,
      { id: trackId }
    );
    if (!trackData.scene_audio_tracks_by_pk) {
      sendNotFound(res, "Track not found");
      return;
    }
    if (!await canEditProject(
      bootstrap.user.id,
      trackData.scene_audio_tracks_by_pk.project_id
    )) {
      sendUnauthorized(res);
      return;
    }
  } catch (error) {
    console.error("[Audio Story] Error checking track access:", error);
    sendServerError(res, error);
    return;
  }
  const body = await readJsonBody(req);
  const allowed = [
    "type",
    "content",
    "character_id",
    "start_time",
    "duration",
    "fade_in",
    "fade_out",
    "tts_voice_id",
    "tts_settings",
    "audio_file_id",
    "waveform_data"
  ];
  const set = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );
  try {
    const data = await requestGraphql(
      `
      mutation UpdateAudioTrack($id: uuid!, $set: scene_audio_tracks_set_input!) {
        update_scene_audio_tracks_by_pk(pk_columns: { id: $id }, _set: $set) {
          id
          type
          content
          character_id
          start_time
          duration
          fade_in
          fade_out
          updated_at
        }
      }
    `,
      { id: trackId, set }
    );
    if (!data.update_scene_audio_tracks_by_pk) {
      sendNotFound(res, "Track not found");
      return;
    }
    sendJson(res, 200, { track: data.update_scene_audio_tracks_by_pk });
  } catch (error) {
    console.error("[Audio Story] Error updating track:", error);
    sendServerError(res, error);
  }
}
async function deleteTrack(req, res, trackId) {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }
  try {
    const trackData = await requestGraphql(
      `
      query GetTrackProject($id: uuid!) {
        scene_audio_tracks_by_pk(id: $id) { project_id }
      }
    `,
      { id: trackId }
    );
    if (!trackData.scene_audio_tracks_by_pk) {
      sendNotFound(res, "Track not found");
      return;
    }
    if (!await canEditProject(
      bootstrap.user.id,
      trackData.scene_audio_tracks_by_pk.project_id
    )) {
      sendUnauthorized(res);
      return;
    }
  } catch (error) {
    console.error("[Audio Story] Error checking track access:", error);
    sendServerError(res, error);
    return;
  }
  try {
    await requestGraphql(
      `
      mutation DeleteAudioTrack($id: uuid!) {
        delete_scene_audio_tracks_by_pk(id: $id) {
          id
        }
      }
    `,
      { id: trackId }
    );
    sendJson(res, 200, { success: true });
  } catch (error) {
    console.error("[Audio Story] Error deleting track:", error);
    sendServerError(res, error);
  }
}
async function handler(req, res) {
  const pathname = req.path || req.url || "/";
  if (req.method === "GET" && !pathname.match(/tracks\/[\w-]+/)) {
    await listTracks(req, res);
    return;
  }
  if (req.method === "POST") {
    await createTrack(req, res);
    return;
  }
  const trackMatch = pathname.match(/^\/tracks\/([\w-]+)$/);
  if (trackMatch) {
    const trackId = trackMatch[1];
    if (req.method === "PUT") {
      await updateTrack(req, res, trackId);
      return;
    }
    if (req.method === "DELETE") {
      await deleteTrack(req, res, trackId);
      return;
    }
  }
  sendMethodNotAllowed(res, ["GET", "POST", "PUT", "DELETE"]);
}
