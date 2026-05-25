/**
 * Local jobs sidecar (T43) — HTTP on 127.0.0.1, reads jobs from project database.sqlite.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";

const PORT = Number(process.env.SCRIPTONY_SIDECAR_PORT || 3765);
const PROJECT_DIR = process.env.SCRIPTONY_PROJECT_DIR;
const SIDECAR_TOKEN = process.env.SCRIPTONY_SIDECAR_TOKEN || "";

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "tauri://localhost",
]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_WASM = path.join(
  __dirname,
  "../../node_modules/sql.js/dist/sql-wasm.wasm",
);

let db = null;

async function openDb() {
  if (!PROJECT_DIR) {
    throw new Error("SCRIPTONY_PROJECT_DIR is required");
  }
  const dbPath = path.join(PROJECT_DIR, "database.sqlite");
  if (!fs.existsSync(dbPath)) {
    throw new Error(`database.sqlite not found: ${dbPath}`);
  }
  const SQL = await initSqlJs({ locateFile: () => SQL_WASM });
  const buf = fs.readFileSync(dbPath);
  db = new SQL.Database(buf);
}

function corsHeaders(req) {
  const origin = req.headers.origin || "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "http://127.0.0.1:3000";
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Scriptony-Sidecar-Token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}

function sendJson(res, status, body, req) {
  res.writeHead(status, corsHeaders(req));
  res.end(JSON.stringify(body));
}

function isAuthorized(req) {
  if (!SIDECAR_TOKEN) return false;
  const auth = req.headers.authorization || "";
  const header = req.headers["x-scriptony-sidecar-token"] || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return bearer === SIDECAR_TOKEN || header === SIDECAR_TOKEN;
}

function getJob(jobId) {
  const stmt = db.prepare(
    "SELECT id, status, result_json, error, created_at, updated_at FROM jobs WHERE id = ?",
  );
  stmt.bind([jobId]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

function createJob(functionName, payload) {
  const jobId = `local_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const projectId =
    db.exec("SELECT id FROM projects LIMIT 1")[0]?.values[0]?.[0] ?? "local-default";

  db.run(
    `INSERT INTO jobs (id, project_id, job_type, status, payload_json, created_at, updated_at)
     VALUES (?, ?, ?, 'pending', ?, ?, ?)`,
    [jobId, projectId, functionName, JSON.stringify(payload ?? {}), now, now],
  );
  persistDb();
  return { jobId, status: "pending", createdAt: now };
}

function persistDb() {
  const data = db.export();
  const dbPath = path.join(PROJECT_DIR, "database.sqlite");
  fs.writeFileSync(dbPath, Buffer.from(data));
}

async function handle(req, res) {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const { pathname } = url;

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {}, req);
    return;
  }

  if (pathname === "/health") {
    sendJson(res, 200, { ok: true, service: "scriptony-local-sidecar" }, req);
    return;
  }

  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: "Unauthorized sidecar request" }, req);
    return;
  }

  const createMatch = pathname.match(/^\/v1\/jobs\/([^/]+)$/);
  if (createMatch && req.method === "POST") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length
      ? JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")
      : {};
    const job = createJob(createMatch[1], body);
    sendJson(
      res,
      201,
      {
        jobId: job.jobId,
        status: job.status,
        message: `Job queued for ${createMatch[1]}`,
        createdAt: job.createdAt,
      },
      req,
    );
    return;
  }

  const statusMatch = pathname.match(/^\/v1\/jobs\/([^/]+)\/status$/);
  if (statusMatch && req.method === "GET") {
    const job = getJob(statusMatch[1]);
    if (!job) {
      sendJson(res, 404, { success: false, error: "Job not found" }, req);
      return;
    }
    let result;
    if (job.result_json) {
      try {
        result = JSON.parse(job.result_json);
      } catch {
        result = undefined;
      }
    }
    sendJson(
      res,
      200,
      {
        success: true,
        jobId: job.id,
        status: job.status,
        progress: 0,
        result,
        error: job.error ?? undefined,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
      },
      req,
    );
    return;
  }

  const resultMatch = pathname.match(/^\/v1\/jobs\/([^/]+)\/result$/);
  if (resultMatch && req.method === "GET") {
    const job = getJob(resultMatch[1]);
    if (!job) {
      sendJson(res, 404, { success: false, error: "Job not found" }, req);
      return;
    }
    if (job.status === "pending" || job.status === "processing") {
      sendJson(
        res,
        202,
        {
          success: false,
          error: "Job still processing",
          status: job.status,
        },
        req,
      );
      return;
    }
    if (job.status === "failed") {
      sendJson(
        res,
        500,
        {
          success: false,
          error: job.error || "Job failed",
          status: "failed",
        },
        req,
      );
      return;
    }
    let result = null;
    try {
      result = job.result_json ? JSON.parse(job.result_json) : null;
    } catch {
      result = null;
    }
    sendJson(res, 200, { success: true, result, completedAt: job.updated_at }, req);
    return;
  }

  sendJson(res, 404, { error: `Route not found: ${pathname}` }, req);
}

await openDb();

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    sendJson(
      res,
      500,
      {
        error: err instanceof Error ? err.message : String(err),
      },
      req,
    );
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[sidecar] listening on http://127.0.0.1:${PORT}`);
});
