#!/usr/bin/env node
/* global process, console, setTimeout, URL */

import { createRequire } from "module";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAppwriteCliEnv } from "../../functions/scripts/load-appwrite-cli-env.mjs";

// ── Robust env loading: always read .env.local explicitly ──
function loadLocalEnv() {
  const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
  const allowedKeys = new Set([
    "APPWRITE_ENDPOINT",
    "APPWRITE_PROJECT_ID",
    "APPWRITE_API_KEY",
    "APPWRITE_DATABASE_ID",
  ]);
  const envPath = resolve(repoRoot, ".env");
  const envLocalPath = resolve(repoRoot, ".env.local");
  const isCI = Boolean(
    process.env.CI || process.env.GITHUB_ACTIONS || process.env.GITLAB_CI,
  );
  // In CI: only fill missing keys from env files so credentials stay
  // under CI control. In local dev: .env.local wins over .env.
  for (const p of [envPath, envLocalPath]) {
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      const k = t.slice(0, i).trim();
      if (!allowedKeys.has(k)) continue;
      let v = t.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (isCI) {
        if (process.env[k] === undefined) process.env[k] = v;
      } else {
        process.env[k] = v;
      }
    }
  }
}

// Load explicit .env.local BEFORE loadAppwriteCliEnv. In CI only fills
// missing keys so credentials stay under CI control; locally .env.local wins.
loadLocalEnv();

// Also run the shared loader (maps VITE_* → APPWRITE_* if still missing).
loadAppwriteCliEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(
  new URL("../../functions/package.json", import.meta.url),
);
const { Client, Databases, IndexType, OrderBy } = require("node-appwrite");

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID?.trim() || "scriptony";

if (!endpoint || !projectId || !apiKey) {
  console.error(
    "Missing Appwrite env. Expected APPWRITE_ENDPOINT/PROJECT_ID/API_KEY or mapped VITE_APPWRITE_*.",
  );
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);
const db = new Databases(client);

const collectionFiles = [
  "projects.json",
  "audio_clips.json",
  "audio_sessions.json",
  "audio_session_participants.json",
  "character_voice_assignments.json",
  "scene_audio_tracks.json",
  "styleProfiles.json",
  "renderJobs.json",
  "imageTasks.json",
  "guideBundles.json",
  "stageDocuments.json",
];

const shotsAttributes = [
  { key: "blenderSourceVersion", type: "string", required: false, size: 255 },
  { key: "blenderSyncRevision", type: "integer", required: false },
  { key: "guideBundleRevision", type: "integer", required: false },
  { key: "styleProfileId", type: "string", required: false, size: 255 },
  { key: "styleProfileRevision", type: "integer", required: false },
  { key: "renderRevision", type: "integer", required: false },
  { key: "lastBlenderSyncAt", type: "string", required: false, size: 255 },
  { key: "lastPreviewAt", type: "string", required: false, size: 255 },
  { key: "latestGuideBundleId", type: "string", required: false, size: 255 },
  { key: "latestRenderJobId", type: "string", required: false, size: 255 },
  { key: "acceptedRenderJobId", type: "string", required: false, size: 255 },
];

const sleep = (ms) =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

function isAlreadyExists(err) {
  return (
    err?.code === 409 ||
    String(err?.message || "")
      .toLowerCase()
      .includes("already exists")
  );
}

function getSpec(file) {
  return JSON.parse(
    readFileSync(
      resolve(__dirname, "../../infra/appwrite/collections", file),
      "utf8",
    ),
  );
}

async function waitAttribute(collectionId, key) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const attribute = await db.getAttribute(databaseId, collectionId, key);
    if (attribute.status === "available") return;
    if (attribute.status === "failed") {
      throw new Error(
        `Attribute ${collectionId}.${key} failed: ${JSON.stringify(attribute)}`,
      );
    }
    await sleep(500);
  }
  throw new Error(`Timeout waiting for attribute ${collectionId}.${key}`);
}

async function ensureCollection(spec) {
  const collectionId = spec.name;
  const docSecurity = Boolean(spec.documentSecurity);
  try {
    await db.getCollection(databaseId, collectionId);
    console.log(`collection exists: ${collectionId}`);
  } catch (err) {
    if (err?.code !== 404) throw err;
    await db.createCollection(
      databaseId,
      collectionId,
      collectionId,
      [],
      docSecurity,
      true,
    );
    console.log(`collection created: ${collectionId}`);
  }
}

async function ensureAttribute(collectionId, attr) {
  try {
    await db.getAttribute(databaseId, collectionId, attr.key);
    console.log(`  attr exists: ${collectionId}.${attr.key}`);
    return;
  } catch (err) {
    if (err?.code !== 404) throw err;
  }

  const required = Boolean(attr.required);
  const isArray = Boolean(attr.array);

  try {
    if (attr.type === "string") {
      await db.createStringAttribute(
        databaseId,
        collectionId,
        attr.key,
        Number(attr.size || 255),
        required,
        undefined,
        isArray,
      );
    } else if (attr.type === "integer") {
      await db.createIntegerAttribute(
        databaseId,
        collectionId,
        attr.key,
        required,
        undefined,
        undefined,
        undefined,
        isArray,
      );
    } else if (attr.type === "double" || attr.type === "float") {
      await db.createFloatAttribute(
        databaseId,
        collectionId,
        attr.key,
        required,
        undefined,
        undefined,
        undefined,
        isArray,
      );
    } else if (attr.type === "boolean" || attr.type === "bool") {
      await db.createBooleanAttribute(
        databaseId,
        collectionId,
        attr.key,
        required,
        undefined,
      );
    } else if (attr.type === "datetime") {
      await db.createDatetimeAttribute(
        databaseId,
        collectionId,
        attr.key,
        required,
        undefined,
      );
    } else {
      throw new Error(
        `Unsupported attribute type ${attr.type} for ${collectionId}.${attr.key}`,
      );
    }

    await waitAttribute(collectionId, attr.key);
    console.log(`  attr created: ${collectionId}.${attr.key}`);
  } catch (err) {
    if (isAlreadyExists(err)) {
      console.log(`  attr exists after race: ${collectionId}.${attr.key}`);
      return;
    }
    throw err;
  }
}

async function ensureIndex(collectionId, indexSpec) {
  const indexes = await db.listIndexes(databaseId, collectionId);
  if (indexes.indexes.some((index) => index.key === indexSpec.key)) {
    console.log(`  index exists: ${collectionId}.${indexSpec.key}`);
    return;
  }

  try {
    await db.createIndex(
      databaseId,
      collectionId,
      indexSpec.key,
      indexSpec.type === "key" ? IndexType.Key : indexSpec.type,
      indexSpec.attributes,
      (indexSpec.attributes || []).map(() => OrderBy.Asc),
    );
    console.log(`  index created: ${collectionId}.${indexSpec.key}`);
  } catch (err) {
    if (isAlreadyExists(err)) {
      console.log(
        `  index exists after race: ${collectionId}.${indexSpec.key}`,
      );
      return;
    }
    throw err;
  }
}

async function main() {
  console.log(`Deploying Ticket 1 schema to Appwrite database '${databaseId}'`);

  for (const file of collectionFiles) {
    const spec = getSpec(file);
    const collectionId = spec.name;
    await ensureCollection(spec);
    for (const attr of spec.attributes) {
      await ensureAttribute(collectionId, attr);
    }
    for (const indexSpec of spec.indexes || []) {
      await ensureIndex(collectionId, indexSpec);
    }
  }

  console.log("Ensuring shots extensions...");
  for (const attr of shotsAttributes) {
    await ensureAttribute("shots", attr);
  }

  console.log("Ticket 1 deploy complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
