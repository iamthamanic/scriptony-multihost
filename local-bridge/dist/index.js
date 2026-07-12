var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/config.ts
import { z } from "zod";
function loadConfig() {
  if (_config) return _config;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const lines = Object.entries(errors).flatMap(
      ([key, msgs]) => msgs.map((msg) => `  ${key}: ${msg}`)
    );
    throw new Error(`Invalid environment configuration:
${lines.join("\n")}`);
  }
  _config = result.data;
  return _config;
}
function getConfig() {
  if (!_config) throw new Error("Config not loaded \u2014 call loadConfig() first");
  return _config;
}
var envSchema, _config;
var init_config = __esm({
  "src/config.ts"() {
    "use strict";
    envSchema = z.object({
      BRIDGE_APPWRITE_ENDPOINT: z.string().url(),
      BRIDGE_APPWRITE_PROJECT_ID: z.string().min(1),
      BRIDGE_APPWRITE_API_KEY: z.string().default(""),
      BRIDGE_APPWRITE_DATABASE_ID: z.string().default("scriptony"),
      BRIDGE_COMFYUI_URL: z.string().url().default("http://127.0.0.1:8188"),
      BRIDGE_BLENDER_URL: z.string().url().default("http://127.0.0.1:9876"),
      BRIDGE_STORAGE_BUCKET: z.string().default("shots"),
      BRIDGE_HEALTH_PORT: z.coerce.number().default(9877),
      BRIDGE_WORKFLOWS_DIR: z.string().default("./workflows"),
      BRIDGE_LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info")
    });
    _config = null;
  }
});

// src/logger.ts
function setLogLevel(level) {
  _minLevel = level;
}
function shouldLog(level) {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[_minLevel];
}
function formatMessage(level, context, message) {
  const ts = (/* @__PURE__ */ new Date()).toISOString();
  return `[${ts}] [${level.toUpperCase()}] [${context}] ${message}`;
}
function formatError(err) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
var LEVEL_ORDER, _minLevel, log;
var init_logger = __esm({
  "src/logger.ts"() {
    "use strict";
    LEVEL_ORDER = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    _minLevel = "info";
    log = {
      debug: (context, message, data) => {
        if (shouldLog("debug")) console.debug(formatMessage("debug", context, message), data ?? "");
      },
      info: (context, message, data) => {
        if (shouldLog("info")) console.info(formatMessage("info", context, message), data ?? "");
      },
      warn: (context, message, data) => {
        if (shouldLog("warn")) console.warn(formatMessage("warn", context, message), data ?? "");
      },
      error: (context, message, data) => {
        if (shouldLog("error")) console.error(formatMessage("error", context, message), data ?? "");
      }
    };
  }
});

// src/appwrite-client.ts
var appwrite_client_exports = {};
__export(appwrite_client_exports, {
  Collections: () => Collections,
  getAppwriteClient: () => getAppwriteClient,
  getDatabases: () => getDatabases,
  getStorage: () => getStorage
});
import { Client as Client2, Databases, Storage } from "node-appwrite";
function getAppwriteClient() {
  if (!_client2) {
    const config = getConfig();
    _client2 = new Client2().setEndpoint(config.BRIDGE_APPWRITE_ENDPOINT).setProject(config.BRIDGE_APPWRITE_PROJECT_ID).setKey(config.BRIDGE_APPWRITE_API_KEY);
    log.info("appwrite-client", "Client initialized", {
      endpoint: config.BRIDGE_APPWRITE_ENDPOINT,
      project: config.BRIDGE_APPWRITE_PROJECT_ID
    });
  }
  return _client2;
}
function getDatabases() {
  if (!_databases) {
    _databases = new Databases(getAppwriteClient());
  }
  return _databases;
}
function getStorage() {
  if (!_storage) {
    _storage = new Storage(getAppwriteClient());
  }
  return _storage;
}
var _client2, _databases, _storage, Collections;
var init_appwrite_client = __esm({
  "src/appwrite-client.ts"() {
    "use strict";
    init_config();
    init_logger();
    _client2 = null;
    _databases = null;
    _storage = null;
    Collections = {
      renderJobs: "renderJobs",
      imageTasks: "imageTasks",
      shots: "shots",
      guideBundles: "guideBundles",
      styleProfiles: "styleProfiles",
      stageDocuments: "stageDocuments"
    };
  }
});

// src/index.ts
import "dotenv/config";

// src/bridge-orchestrator.ts
init_config();
init_logger();

// src/realtime-subscriber.ts
init_config();
init_logger();
import { Client } from "node-appwrite";

// src/backoff.ts
init_logger();
var DEFAULTS = {
  baseDelayMs: 5e3,
  maxDelayMs: 6e4,
  context: "reconnect"
};
var ReconnectManager = class {
  _attempts = 0;
  _timer = null;
  _shuttingDown = false;
  _opts;
  constructor(opts = {}) {
    this._opts = { ...DEFAULTS, ...opts };
  }
  /** Current reconnection attempt count (for health endpoint). */
  get attempts() {
    return this._attempts;
  }
  /** Is a shutdown in progress? Reconnect should be suppressed. */
  get shuttingDown() {
    return this._shuttingDown;
  }
  /** Calculate delay for current attempt using exponential backoff. */
  nextDelay() {
    this._attempts++;
    const delay = Math.min(
      this._opts.baseDelayMs * Math.pow(2, this._attempts - 1),
      this._opts.maxDelayMs
    );
    return delay;
  }
  /**
   * Schedule a reconnect attempt. No-op if shutting down.
   * Returns the delay used (for logging).
   */
  schedule(action) {
    if (this._shuttingDown) return null;
    const delay = this.nextDelay();
    log.warn(this._opts.context, `Reconnecting in ${delay}ms (attempt ${this._attempts})`);
    this._timer = setTimeout(() => {
      if (this._shuttingDown) return;
      action();
    }, delay);
    return delay;
  }
  /** Reset attempt counter on successful connection. */
  reset() {
    this._attempts = 0;
  }
  /** Stop any pending reconnect and prevent future ones. */
  shutdown() {
    this._shuttingDown = true;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }
};
function backoffDelay(attempt, baseDelayMs, maxDelayMs) {
  return Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
}

// src/realtime-subscriber.ts
var _client = null;
var _unsubscribe = null;
var _reconnect = new ReconnectManager({ baseDelayMs: 5e3, maxDelayMs: 6e4, context: "realtime" });
var _connected = false;
function createRealtimeClient() {
  const config = getConfig();
  return new Client().setEndpoint(config.BRIDGE_APPWRITE_ENDPOINT).setProject(config.BRIDGE_APPWRITE_PROJECT_ID).setKey(config.BRIDGE_APPWRITE_API_KEY);
}
function subscribeRenderJobs(handler) {
  const config = getConfig();
  const channel = `databases.${config.BRIDGE_APPWRITE_DATABASE_ID}.collections.renderJobs.documents`;
  _reconnect.shutdown();
  const reconnect = new ReconnectManager({ baseDelayMs: 5e3, maxDelayMs: 6e4, context: "realtime" });
  _client = createRealtimeClient();
  log.info("realtime", "Subscribing to renderJobs channel", { channel });
  try {
    _unsubscribe = _client.subscribe(channel, (event) => {
      if (!_connected) {
        _connected = true;
        reconnect.reset();
        log.info("realtime", "Connection confirmed");
      }
      const isRelevant = event.events?.some(
        (e) => e.includes(".create") || e.includes(".update")
      ) ?? false;
      if (!isRelevant) return;
      const payload = event.payload ?? {};
      const status = typeof payload.status === "string" ? payload.status : "";
      if (status === "executing") {
        log.info("realtime", "Render job status=executing detected", {
          jobId: payload.$id ?? payload.id,
          shotId: payload.shotId
        });
        handler(event);
      }
    });
    log.info("realtime", "Subscription active");
  } catch (err) {
    log.error("realtime", "Subscription failed, scheduling reconnect", {
      err: formatError(err)
    });
    reconnect.schedule(() => subscribeRenderJobs(handler));
  }
}
function unsubscribeRenderJobs() {
  _reconnect.shutdown();
  _connected = false;
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
    log.info("realtime", "Unsubscribed from renderJobs");
  }
}
function isRealtimeConnected() {
  return _connected;
}
function getReconnectAttempts() {
  return _reconnect.attempts;
}

// src/comfyui-client.ts
init_config();
init_logger();
var REQUEST_TIMEOUT_MS = 3e4;
function getBaseUrl() {
  return getConfig().BRIDGE_COMFYUI_URL.replace(/\/+$/, "");
}
async function submitPrompt(workflow, clientId) {
  const url = `${getBaseUrl()}/prompt`;
  const body = JSON.stringify({ prompt: workflow, client_id: clientId });
  log.info("comfyui", "Submitting prompt", { clientId });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `ComfyUI /prompt returned ${res.status}: ${text.slice(0, 500)}`
    );
  }
  const result = await res.json();
  log.info("comfyui", "Prompt submitted", {
    promptId: result.promptId,
    number: result.number
  });
  return result;
}
async function getHistory(promptId) {
  const url = `${getBaseUrl()}/history/${promptId}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`ComfyUI /history/${promptId} returned ${res.status}`);
  }
  const data = await res.json();
  return data[promptId] ?? null;
}
async function getImage(filename, subfolder, type) {
  for (const param of [filename, subfolder, type]) {
    if (param.includes("..") || param.includes("\0")) {
      throw new Error(`Invalid ComfyUI image parameter: path traversal detected`);
    }
  }
  const params = new URLSearchParams({ filename, subfolder, type });
  const url = `${getBaseUrl()}/view?${params.toString()}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!res.ok) {
    throw new Error(
      `ComfyUI /view returned ${res.status} for ${filename}`
    );
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
async function uploadImage(buffer, filename, mimeType) {
  const url = `${getBaseUrl()}/upload/image`;
  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  formData.append("image", blob, filename);
  formData.append("overwrite", "true");
  log.info("comfyui", "Uploading image to ComfyUI", { filename });
  const res = await fetch(url, {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `ComfyUI /upload/image returned ${res.status}: ${text.slice(0, 500)}`
    );
  }
  const result = await res.json();
  log.info("comfyui", "Image uploaded", { name: result.name, subfolder: result.subfolder });
  return result.name;
}
async function healthCheck() {
  return tryHead(`${getBaseUrl()}/system_stats`);
}
async function tryHead(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5e3) });
    return res.ok;
  } catch {
    return false;
  }
}
var _ws = null;
var _reconnect2 = new ReconnectManager({ baseDelayMs: 5e3, maxDelayMs: 6e4, context: "comfyui-ws" });
function connectWebSocket(onProgress, onCompletion) {
  const baseUrl = getBaseUrl();
  const wsUrl = baseUrl.replace(/^http/, "ws") + "/ws";
  log.info("comfyui-ws", "Connecting to ComfyUI WebSocket", { wsUrl });
  if (_ws) {
    try {
      _ws.removeAllListeners?.();
    } catch {
    }
    try {
      _ws.close();
    } catch {
    }
    _ws = null;
  }
  _reconnect2.shutdown();
  const reconnect = new ReconnectManager({ baseDelayMs: 5e3, maxDelayMs: 6e4, context: "comfyui-ws" });
  const ws = new WebSocket(wsUrl);
  ws.addEventListener("open", () => {
    log.info("comfyui-ws", "Connected");
    reconnect.reset();
  });
  ws.addEventListener("message", (event) => {
    if (typeof event.data !== "string") return;
    try {
      const data = JSON.parse(event.data);
      const type = data.type;
      if (type === "execution_start" || type === "execution_cached") return;
      if (type === "progress") {
        onProgress({
          nodeId: String(data.node_id ?? data.node ?? ""),
          value: Number(data.value ?? 0),
          max: Number(data.max ?? 1)
        });
        return;
      }
      if (type === "executing") {
        const nodeId = String(data.node ?? data.node_id ?? "");
        if (nodeId === "") {
          const promptId = String(data.prompt_id ?? "");
          if (promptId) {
            log.info("comfyui-ws", "Execution completed", { promptId });
            getHistory(promptId).then((entry) => {
              onCompletion(promptId, entry?.outputs ?? {});
            }).catch((err) => {
              log.error("comfyui-ws", "Failed to fetch history after completion", {
                promptId,
                err: formatError(err)
              });
              onCompletion(promptId, {});
            });
          }
        }
        return;
      }
      if (type === "execution_error") {
        const promptId = String(data.prompt_id ?? "");
        const msg = String(data.exception_message ?? data.message ?? "unknown");
        log.error("comfyui-ws", "Execution error", { promptId, error: msg });
        return;
      }
    } catch {
    }
  });
  ws.addEventListener("close", () => {
    if (reconnect.shuttingDown) {
      log.info("comfyui-ws", "WebSocket closed (intentional shutdown)");
      return;
    }
    reconnect.schedule(() => connectWebSocket(onProgress, onCompletion));
  });
  ws.addEventListener("error", () => {
    log.error("comfyui-ws", "WebSocket error");
  });
  _ws = ws;
}
function disconnectWebSocket() {
  _reconnect2.shutdown();
  if (_ws) {
    try {
      _ws.removeAllListeners?.();
    } catch {
    }
    try {
      _ws.close();
    } catch {
    }
    _ws = null;
  }
}

// src/render-job-handler.ts
init_appwrite_client();

// src/storage-upload.ts
init_appwrite_client();
init_config();
init_logger();
import { ID, Permission, Role } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
async function uploadImageToStorage(filename, subfolder, type, mimeType) {
  const config = getConfig();
  const bucketId = config.BRIDGE_STORAGE_BUCKET;
  log.info("storage", "Downloading image from ComfyUI", { filename, subfolder, type });
  const buffer = await getImage(filename, subfolder, type);
  log.info("storage", "Uploading to Appwrite Storage", {
    filename,
    size: buffer.length,
    bucket: bucketId
  });
  const storage = getStorage();
  const inputFile = InputFile.fromBuffer(buffer, filename);
  const result = await storage.createFile(
    bucketId,
    ID.unique(),
    inputFile,
    [Permission.read(Role.users())]
  );
  log.info("storage", "Upload complete", { fileId: result.$id, filename });
  return result.$id;
}
async function uploadAllOutputs(outputs) {
  const fileIds = [];
  for (const [_nodeId, nodeOutput] of Object.entries(outputs)) {
    const node = nodeOutput;
    if (!node.images) continue;
    for (const img of node.images) {
      const mimeType = guessMimeType(img.filename);
      const fileId = await uploadImageToStorage(
        img.filename,
        img.subfolder ?? "",
        img.type ?? "output",
        mimeType
      );
      fileIds.push(fileId);
    }
  }
  return fileIds;
}
function guessMimeType(filename) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

// src/workflow-resolver.ts
init_appwrite_client();
init_config();
init_logger();
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
var DEFAULTS2 = {
  checkpoint: "model.safetensors",
  width: 1024,
  height: 1024,
  steps: 20,
  cfg: 7,
  sampler: "euler",
  scheduler: "normal",
  denoise: 0.75,
  seed: () => Math.floor(Math.random() * 1e9),
  positive_prompt: "professional render, high quality",
  negative_prompt: "blurry, low quality, watermark"
};
var templateCache = /* @__PURE__ */ new Map();
function getWorkflowsDir() {
  try {
    return getConfig().BRIDGE_WORKFLOWS_DIR ?? resolve(process.cwd(), "workflows");
  } catch {
    return resolve(process.cwd(), "workflows");
  }
}
var SAFE_TYPE_RE = /^[a-zA-Z0-9_-]+$/;
function loadTemplate(type) {
  if (templateCache.has(type)) {
    return templateCache.get(type);
  }
  if (!SAFE_TYPE_RE.test(type)) {
    log.warn("workflow-resolver", `Invalid job type "${type}" \u2014 rejected for safety`);
    return null;
  }
  const dir = getWorkflowsDir();
  const exactPath = join(dir, `${type}.json`);
  try {
    const raw = readFileSync(exactPath, "utf-8");
    const template = JSON.parse(raw);
    templateCache.set(type, template);
    return template;
  } catch {
  }
  try {
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      try {
        const raw = readFileSync(join(dir, file), "utf-8");
        const t = JSON.parse(raw);
        if (t.meta?.type === type) {
          templateCache.set(type, t);
          return t;
        }
      } catch {
        continue;
      }
    }
  } catch {
  }
  log.warn("workflow-resolver", `No template found for type "${type}"`);
  return null;
}
async function fetchStyleProfile(styleProfileId) {
  const db = getDatabases();
  const config = getConfig();
  try {
    const doc = await db.getDocument(
      config.BRIDGE_APPWRITE_DATABASE_ID,
      Collections.styleProfiles,
      styleProfileId
    );
    return {
      positivePrompt: String(doc.positivePrompt ?? doc.positive_prompt ?? ""),
      negativePrompt: String(doc.negativePrompt ?? doc.negative_prompt ?? "")
    };
  } catch (err) {
    log.warn("workflow-resolver", "Failed to fetch style profile", {
      styleProfileId,
      err: formatError(err)
    });
    return null;
  }
}
function parseRepairConfig(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    log.warn("workflow-resolver", "Invalid repairConfig JSON", { raw: raw.slice(0, 200) });
    return {};
  }
}
function interpolate(value, params) {
  if (typeof value === "string") {
    const singleMatch = value.match(/^\{\{(\w+)\}\}$/);
    if (singleMatch && singleMatch[1] in params) {
      return params[singleMatch[1]];
    }
    return value.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
      if (key in params) return String(params[key]);
      return _match;
    });
  }
  if (Array.isArray(value)) {
    return value.map((item) => interpolate(item, params));
  }
  if (value !== null && typeof value === "object") {
    const result = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = interpolate(v, params);
    }
    return result;
  }
  return value;
}
function resolveWorkflow(job, options = {}) {
  const template = loadTemplate(job.type);
  if (!template) {
    throw new Error(`No workflow template found for job type "${job.type}"`);
  }
  const repairConfig = parseRepairConfig(job.repairConfig);
  const style = options.styleProfile;
  const params = {
    checkpoint: DEFAULTS2.checkpoint,
    width: Number(repairConfig.width) || DEFAULTS2.width,
    height: Number(repairConfig.height) || DEFAULTS2.height,
    steps: Number(repairConfig.steps) || DEFAULTS2.steps,
    cfg: Number(repairConfig.cfg) || DEFAULTS2.cfg,
    sampler: String(repairConfig.sampler ?? DEFAULTS2.sampler),
    scheduler: String(repairConfig.scheduler ?? DEFAULTS2.scheduler),
    denoise: Number(repairConfig.denoise) ?? DEFAULTS2.denoise,
    seed: Number(repairConfig.seed) || DEFAULTS2.seed(),
    positive_prompt: style?.positivePrompt || String(repairConfig.positivePrompt ?? DEFAULTS2.positive_prompt),
    negative_prompt: style?.negativePrompt || String(repairConfig.negativePrompt ?? DEFAULTS2.negative_prompt)
  };
  if (options.inputs) {
    for (const [key, filename] of Object.entries(options.inputs)) {
      params[key] = filename;
    }
  }
  const workflow = {};
  for (const [nodeId, node] of Object.entries(template.nodes)) {
    workflow[nodeId] = {
      class_type: node.class_type,
      inputs: interpolate(node.inputs, params)
    };
  }
  log.info("workflow-resolver", "Resolved workflow", {
    type: job.type,
    templateNodes: Object.keys(template.nodes).length,
    params: Object.keys(params)
  });
  return workflow;
}
async function resolveWorkflowAsync(job, options = {}) {
  let styleProfile = null;
  if (job.styleProfileId) {
    styleProfile = await fetchStyleProfile(job.styleProfileId);
  }
  return resolveWorkflow(job, { ...options, styleProfile });
}

// src/input-resolver.ts
init_appwrite_client();
init_config();
init_logger();
async function downloadFromStorage(bucketId, fileId) {
  const storage = getStorage();
  log.info("input-resolver", "Downloading from Appwrite Storage", { bucketId, fileId });
  const result = await storage.getFileDownload(bucketId, fileId);
  const arrayBuffer = result instanceof ArrayBuffer ? result : result.buffer ?? result;
  return Buffer.from(arrayBuffer);
}
async function resolveGuideBundleInputs(guideBundleId) {
  const db = getDatabases();
  const config = getConfig();
  const inputs = {};
  try {
    const doc = await db.getDocument(
      config.BRIDGE_APPWRITE_DATABASE_ID,
      Collections.guideBundles,
      guideBundleId
    );
    const bucketId = config.BRIDGE_STORAGE_BUCKET;
    const maskFileId = String(doc.maskFileId ?? doc.mask_file_id ?? "");
    if (maskFileId) {
      log.info("input-resolver", "Downloading mask from guide bundle", { maskFileId });
      const maskBuffer = await downloadFromStorage(bucketId, maskFileId);
      const comfyName = await uploadImage(maskBuffer, `mask-${maskFileId}.png`, "image/png");
      inputs.mask_image = comfyName;
    }
    const sourceFileId = String(doc.sourceFileId ?? doc.source_file_id ?? "");
    if (sourceFileId) {
      log.info("input-resolver", "Downloading source from guide bundle", { sourceFileId });
      const sourceBuffer = await downloadFromStorage(bucketId, sourceFileId);
      const comfyName = await uploadImage(sourceBuffer, `source-${sourceFileId}.png`, "image/png");
      inputs.input_image = comfyName;
    }
  } catch (err) {
    log.warn("input-resolver", "Failed to resolve guide bundle", {
      guideBundleId,
      err: formatError(err)
    });
  }
  return inputs;
}
async function resolveInputs(job) {
  const inputs = {};
  if (job.guideBundleId) {
    const bundleInputs = await resolveGuideBundleInputs(job.guideBundleId);
    Object.assign(inputs, bundleInputs);
  }
  if (job.repairConfig) {
    try {
      const rc = JSON.parse(job.repairConfig);
      const inputImageId = String(rc.inputImageId ?? rc.input_image_id ?? "");
      if (inputImageId && !inputs.input_image) {
        const config = getConfig();
        const buffer = await downloadFromStorage(config.BRIDGE_STORAGE_BUCKET, inputImageId);
        const comfyName = await uploadImage(buffer, `input-${inputImageId}.png`, "image/png");
        inputs.input_image = comfyName;
      }
    } catch {
    }
  }
  log.info("input-resolver", "Resolved inputs", {
    jobId: job.id,
    inputKeys: Object.keys(inputs)
  });
  return inputs;
}

// src/db-callback.ts
init_logger();
var DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  baseDelayMs: 1e3,
  maxDelayMs: 3e4
};
function isRetriable(error) {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("econnrefused") || msg.includes("econnreset") || msg.includes("etimedout") || msg.includes("fetch failed") || msg.includes("network") || msg.includes("timeout")) {
      return true;
    }
    if (msg.includes("429") || msg.includes("503") || msg.includes("502") || msg.includes("500")) {
      return true;
    }
    if (msg.includes("rate limit") || msg.includes("server error")) {
      return true;
    }
  }
  if (typeof error === "object" && error !== null) {
    const code = error.code;
    if (typeof code === "number" && code >= 500) return true;
    if (code === 429) return true;
  }
  return false;
}
async function retryDbOperation(fn, options = {}) {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError;
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= opts.maxRetries || !isRetriable(error)) {
        throw error;
      }
      const delay = backoffDelay(attempt, opts.baseDelayMs, opts.maxDelayMs);
      log.warn("db-retry", `DB operation failed (attempt ${attempt + 1}/${opts.maxRetries}), retrying in ${delay}ms`, {
        error: formatError(error)
      });
      await new Promise((resolve2) => setTimeout(resolve2, delay));
    }
  }
  throw lastError;
}

// src/render-job-handler.ts
init_config();
init_logger();
var MAX_CONCURRENCY = 3;
var _running = 0;
var _queue = [];
function enqueueJob(jobId) {
  if (_running < MAX_CONCURRENCY) {
    _running++;
    runJob(jobId);
  } else {
    _queue.push(jobId);
    log.info("handler", `Job queued (concurrency limit ${MAX_CONCURRENCY})`, { jobId, queued: _queue.length });
  }
}
function dequeueNext() {
  if (_queue.length > 0 && _running < MAX_CONCURRENCY) {
    const nextId = _queue.shift();
    _running++;
    runJob(nextId);
  }
}
function runJob(jobId) {
  handleRenderJobInner(jobId).finally(() => {
    _running--;
    dequeueNext();
  });
}
var jobContexts = /* @__PURE__ */ new Map();
function getActiveJobs() {
  return jobContexts;
}
function getQueueLength() {
  return _queue.length;
}
function getRunningCount() {
  return _running;
}
function resolveWsCompletion(promptId, outputs) {
  for (const [, ctx] of jobContexts) {
    if (ctx.promptId === promptId && !ctx.settled) {
      ctx.pollAbort.abort();
      ctx.settled = true;
      ctx.completion.resolve(outputs);
      return;
    }
  }
}
function rejectAllPendingResolvers(reason) {
  for (const [, ctx] of jobContexts) {
    if (!ctx.settled) {
      ctx.pollAbort.abort();
      ctx.settled = true;
      ctx.completion.reject(new Error(reason));
    }
  }
}
function handleRenderJob(jobId) {
  if (jobContexts.has(jobId)) {
    log.info("handler", "Job already active, skipping duplicate", { jobId });
    return;
  }
  enqueueJob(jobId);
}
async function fetchRenderJob(jobId) {
  const db = getDatabases();
  const config = getConfig();
  try {
    return await retryDbOperation(async () => {
      const doc = await db.getDocument(
        config.BRIDGE_APPWRITE_DATABASE_ID,
        Collections.renderJobs,
        jobId
      );
      return {
        id: String(doc.$id ?? doc.id ?? ""),
        $id: String(doc.$id),
        userId: String(doc.userId ?? doc.user_id ?? ""),
        projectId: String(doc.projectId ?? doc.project_id ?? ""),
        shotId: String(doc.shotId ?? doc.shot_id ?? ""),
        type: String(doc.type ?? ""),
        jobClass: String(doc.jobClass ?? doc.job_class ?? "exploratory"),
        status: String(doc.status ?? "queued"),
        reviewStatus: String(doc.reviewStatus ?? doc.review_status ?? "pending"),
        guideBundleId: doc.guideBundleId ?? doc.guide_bundle_id ?? null,
        styleProfileId: doc.styleProfileId ?? doc.style_profile_id ?? null,
        repairConfig: doc.repairConfig ?? doc.repair_config ?? null,
        outputImageIds: Array.isArray(doc.outputImageIds ?? doc.output_image_ids) ? doc.outputImageIds ?? doc.output_image_ids : [],
        createdAt: String(doc.createdAt ?? doc.created_at ?? doc.$createdAt ?? ""),
        completedAt: doc.completedAt ?? doc.completed_at ?? null
      };
    });
  } catch (err) {
    log.error("handler", "Failed to fetch render job", { jobId, err: formatError(err) });
    return null;
  }
}
async function markJobCompleted(jobId, shotId, outputImageIds) {
  const db = getDatabases();
  const config = getConfig();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  log.info("handler", "Marking job completed in DB", { jobId, outputImageIds });
  await retryDbOperation(async () => {
    await db.updateDocument(
      config.BRIDGE_APPWRITE_DATABASE_ID,
      Collections.renderJobs,
      jobId,
      { status: "completed", outputImageIds, completedAt: now }
    );
  });
  try {
    await retryDbOperation(async () => {
      await db.updateDocument(
        config.BRIDGE_APPWRITE_DATABASE_ID,
        Collections.shots,
        shotId,
        { latestRenderJobId: jobId }
      );
    });
  } catch (err) {
    log.warn("handler", "Failed to update shot latestRenderJobId (non-critical)", {
      jobId,
      shotId,
      err: formatError(err)
    });
  }
  log.info("handler", "Job marked completed in DB", { jobId });
}
async function markJobFailed(jobId, errorMessage) {
  const db = getDatabases();
  const config = getConfig();
  log.info("handler", "Marking job failed in DB", { jobId, errorMessage });
  await retryDbOperation(async () => {
    await db.updateDocument(
      config.BRIDGE_APPWRITE_DATABASE_ID,
      Collections.renderJobs,
      jobId,
      { status: "failed", error: errorMessage }
    );
  });
  log.info("handler", "Job marked failed in DB", { jobId });
}
var POLL_INTERVAL_MS = 2e3;
var MAX_POLL_DURATION_MS = 6e5;
async function waitForCompletion(ctx) {
  pollForCompletion(ctx).catch((err) => {
    if (!ctx.settled) {
      ctx.settled = true;
      ctx.completion.reject(err);
    }
  });
  const timeout = setTimeout(() => {
    if (!ctx.settled) {
      ctx.settled = true;
      ctx.completion.reject(new Error(`ComfyUI execution timed out after ${MAX_POLL_DURATION_MS / 1e3}s`));
    }
  }, MAX_POLL_DURATION_MS);
  try {
    return await ctx.completion.promise;
  } finally {
    clearTimeout(timeout);
    ctx.pollAbort.abort();
  }
}
async function pollForCompletion(ctx) {
  let interval = POLL_INTERVAL_MS;
  let consecutiveNulls = 0;
  const promptId = ctx.promptId;
  while (!ctx.pollAbort.signal.aborted) {
    const entry = await getHistory(promptId);
    if (entry) {
      consecutiveNulls = 0;
      if (entry.status?.statusStr === "success" || entry.status?.completed) {
        if (!ctx.settled) {
          ctx.settled = true;
          ctx.completion.resolve(entry.outputs ?? {});
        }
        return;
      }
      if (entry.status?.statusStr === "error") {
        throw new Error(
          `ComfyUI execution failed: ${entry.status.messages?.join(", ") ?? "unknown error"}`
        );
      }
    } else {
      consecutiveNulls++;
      if (consecutiveNulls >= 10) {
        throw new Error("ComfyUI history not found after 10 consecutive attempts \u2014 execution may have been purged");
      }
    }
    await new Promise((resolve2) => {
      const timer = setTimeout(resolve2, interval);
      ctx.pollAbort.signal.addEventListener("abort", () => {
        clearTimeout(timer);
        resolve2(void 0);
      }, { once: true });
    });
    interval = Math.min(interval * 2, 3e4);
  }
}
async function handleRenderJobInner(jobId) {
  const ctx = {
    jobId,
    promptId: null,
    state: "pending",
    startedAt: /* @__PURE__ */ new Date(),
    settled: false,
    completion: Promise.withResolvers(),
    pollAbort: new AbortController()
  };
  jobContexts.set(jobId, ctx);
  let jobType = "unknown";
  let shotId = "unknown";
  try {
    updateState(ctx, "pending");
    const job = await fetchRenderJob(jobId);
    if (!job) {
      throw new Error(`Render job ${jobId} not found in database`);
    }
    jobType = job.type;
    shotId = job.shotId;
    log.info("handler", "Processing render job", {
      jobId,
      shotId,
      type: jobType,
      jobClass: job.jobClass
    });
    updateState(ctx, "submitting");
    const inputs = await resolveInputs(job);
    const workflow = await resolveWorkflowAsync(job, { inputs });
    const clientId = `bridge-${jobId}`;
    const result = await submitPrompt(workflow, clientId);
    ctx.promptId = result.promptId;
    log.info("handler", "Submitted to ComfyUI", {
      jobId,
      promptId: result.promptId,
      type: jobType
    });
    updateState(ctx, "executing");
    const outputs = await waitForCompletion(ctx);
    if (outputs && Object.keys(outputs).length > 0) {
      updateState(ctx, "downloading");
      updateState(ctx, "uploading");
      const outputImageIds = await uploadAllOutputs(outputs);
      updateState(ctx, "callback");
      await markJobCompleted(jobId, job.shotId, outputImageIds);
    } else {
      log.warn("handler", "ComfyUI returned zero outputs", { jobId, type: jobType });
      updateState(ctx, "callback");
      await markJobCompleted(jobId, job.shotId, []);
    }
    updateState(ctx, "completed");
    log.info("handler", "Render job completed", { jobId, type: jobType, shotId });
  } catch (err) {
    const message = formatError(err);
    updateState(ctx, "failed", message);
    log.error("handler", "Render job failed", { jobId, type: jobType, shotId, error: message });
    try {
      await markJobFailed(jobId, message);
    } catch (callbackErr) {
      log.error("handler", "Failed to mark job as failed in DB", {
        jobId,
        callbackErr: formatError(callbackErr)
      });
    }
  } finally {
    setTimeout(() => jobContexts.delete(jobId), 6e4);
  }
}
function updateState(ctx, state, error) {
  ctx.state = state;
  if (error) ctx.error = error;
  log.info("handler", `Job state: ${state}`, { jobId: ctx.jobId });
}
async function drainJobs(timeoutMs = 3e4) {
  log.info("handler", "Draining in-flight jobs", {
    active: jobContexts.size,
    queued: _queue.length,
    running: _running
  });
  _queue.length = 0;
  rejectAllPendingResolvers("Bridge shutting down");
  const start2 = Date.now();
  while (jobContexts.size > 0 && Date.now() - start2 < timeoutMs) {
    await new Promise((resolve2) => setTimeout(resolve2, 1e3));
  }
  if (jobContexts.size > 0) {
    log.warn("handler", "Timeout draining jobs, marking remaining as failed", {
      remaining: Array.from(jobContexts.keys())
    });
    for (const [jobId, ctx] of jobContexts) {
      if (ctx.state !== "completed" && ctx.state !== "failed") {
        try {
          await markJobFailed(jobId, "Bridge shutdown \u2014 job interrupted");
        } catch {
        }
      }
    }
  }
  log.info("handler", "Job drain complete");
}

// src/health.ts
init_logger();
import { createServer } from "node:http";

// src/blender-client.ts
init_config();
init_logger();
function getBaseUrl2() {
  return getConfig().BRIDGE_BLENDER_URL.replace(/\/+$/, "");
}
async function healthCheck2() {
  try {
    const res = await fetch(`${getBaseUrl2()}/health`, {
      signal: AbortSignal.timeout(5e3)
    });
    return res.ok;
  } catch {
    return false;
  }
}

// src/health.ts
init_config();
var _server = null;
async function handleHealth(_req, res) {
  const activeJobs = getActiveJobs();
  const jobCount = activeJobs.size;
  let comfyuiOk = false;
  let blenderOk = false;
  try {
    comfyuiOk = await healthCheck();
  } catch {
    comfyuiOk = false;
  }
  try {
    blenderOk = await healthCheck2();
  } catch {
    blenderOk = false;
  }
  const realtimeConnected = isRealtimeConnected();
  const status = {
    status: "ok",
    service: "scriptony-local-bridge",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    connections: {
      appwriteRealtime: realtimeConnected,
      comfyUI: comfyuiOk,
      blender: blenderOk
    },
    reconnectAttempts: getReconnectAttempts(),
    concurrency: {
      running: getRunningCount(),
      queued: getQueueLength(),
      activeJobs: jobCount
    },
    jobs: Array.from(activeJobs.entries()).map(([id, job]) => ({
      jobId: id,
      state: job.state,
      promptId: job.promptId,
      startedAt: job.startedAt.toISOString(),
      error: job.error
    }))
  };
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(status, null, 2));
}
function handleBridgeConfig(res) {
  const config = getConfig();
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    appwriteEndpoint: config.BRIDGE_APPWRITE_ENDPOINT,
    appwriteProjectId: config.BRIDGE_APPWRITE_PROJECT_ID
  }));
}
function startHealthServer(port) {
  _server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    if (req.method === "GET" && url.pathname === "/health") {
      await handleHealth(req, res);
      return;
    }
    if (req.method === "GET" && url.pathname === "/bridge/config") {
      handleBridgeConfig(res);
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });
  _server.listen(port, () => {
    log.info("health", `Health check server listening on port ${port}`);
  });
}
function stopHealthServer() {
  if (_server) {
    _server.close();
    _server = null;
    log.info("health", "Health check server stopped");
  }
}

// src/bridge-orchestrator.ts
async function reconcileInProgressJobs() {
  const { Query } = await import("node-appwrite");
  const { getDatabases: getDatabases2, Collections: Collections2 } = await Promise.resolve().then(() => (init_appwrite_client(), appwrite_client_exports));
  const config = getConfig();
  log.info("orchestrator", "Reconciling in-progress jobs");
  try {
    const db = getDatabases2();
    let offset = 0;
    const limit = 50;
    let totalProcessed = 0;
    while (true) {
      const response = await db.listDocuments(
        config.BRIDGE_APPWRITE_DATABASE_ID,
        Collections2.renderJobs,
        [Query.equal("status", "executing"), Query.limit(limit), Query.offset(offset)]
      );
      const jobs = response.documents;
      if (jobs.length === 0) break;
      for (const job of jobs) {
        handleRenderJob(job.$id);
        totalProcessed++;
      }
      if (jobs.length < limit) break;
      offset += limit;
    }
    if (totalProcessed === 0) {
      log.info("orchestrator", "No in-progress jobs found");
    } else {
      log.info("orchestrator", `Reconciled ${totalProcessed} in-progress job(s)`);
    }
  } catch (err) {
    log.error("orchestrator", "Reconciliation query failed", {
      err: formatError(err)
    });
  }
}
function onRenderJobEvent(event) {
  const payload = event.payload ?? {};
  const jobId = String(payload.$id ?? payload.id ?? "");
  if (!jobId) {
    log.warn("orchestrator", "Received event without job ID");
    return;
  }
  handleRenderJob(jobId);
}
async function start() {
  const config = loadConfig();
  setLogLevel(config.BRIDGE_LOG_LEVEL);
  log.info("orchestrator", "Starting Local Bridge", {
    appwriteEndpoint: config.BRIDGE_APPWRITE_ENDPOINT,
    comfyuiUrl: config.BRIDGE_COMFYUI_URL,
    blenderUrl: config.BRIDGE_BLENDER_URL,
    healthPort: config.BRIDGE_HEALTH_PORT
  });
  try {
    connectWebSocket(
      (progress) => {
        log.debug("orchestrator", "ComfyUI progress", {
          node: progress.nodeId,
          value: progress.value,
          max: progress.max
        });
      },
      (promptId, outputs) => {
        log.info("orchestrator", "ComfyUI execution completed via WS", {
          promptId,
          outputNodes: Object.keys(outputs)
        });
        resolveWsCompletion(promptId, outputs);
      }
    );
  } catch (err) {
    log.warn("orchestrator", "ComfyUI WebSocket not available, will use polling", {
      err: formatError(err)
    });
  }
  subscribeRenderJobs(onRenderJobEvent);
  await reconcileInProgressJobs();
  startHealthServer(config.BRIDGE_HEALTH_PORT);
  log.info("orchestrator", "Local Bridge is running");
}
async function stop() {
  log.info("orchestrator", "Shutting down Local Bridge");
  unsubscribeRenderJobs();
  disconnectWebSocket();
  await drainJobs(3e4);
  stopHealthServer();
  log.info("orchestrator", "Local Bridge stopped");
}

// src/index.ts
var _shuttingDown = false;
async function gracefulShutdown(signal) {
  if (_shuttingDown) return;
  _shuttingDown = true;
  console.log(`Received ${signal}, shutting down gracefully...`);
  try {
    await stop();
  } catch (err) {
    console.error("Error during shutdown:", err);
  }
  process.exit(0);
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("uncaughtException", async (err) => {
  console.error("Uncaught exception:", err);
  if (!_shuttingDown) {
    await gracefulShutdown("uncaughtException").catch(() => process.exit(1));
  }
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
start().catch((err) => {
  console.error("Failed to start Local Bridge:", err);
  process.exit(1);
});
