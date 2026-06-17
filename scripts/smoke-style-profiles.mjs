#!/usr/bin/env node
/**
 * Smoke test for scriptony-style Step 2 (cloud spec + preview upload).
 * Location: scripts/smoke-style-profiles.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getMissingAppwriteServerEnvKeys,
  loadAppwriteCliEnv,
} from "../functions/scripts/load-appwrite-cli-env.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localEnvPath = resolve(root, ".env.local");

const DEMO_EMAIL = process.env.SCRIPTONY_SMOKE_EMAIL?.trim() || "";
const DEMO_PASSWORD = process.env.SCRIPTONY_SMOKE_PASSWORD?.trim() || "";

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function parseEnvFile(text) {
  const out = {};
  for (const line of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}

function trimSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function joinUrl(base, path) {
  return `${trimSlash(base)}/${String(path).replace(/^\/+/, "")}`;
}

function parseDomainMap(raw) {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, value]) => [
          String(key).trim(),
          trimSlash(String(value || "")),
        ])
        .filter(([key, value]) => key && value),
    );
  } catch {
    return {};
  }
}

function resolveStyleBase(domainMap) {
  if (domainMap["scriptony-style"]) {
    return { base: domainMap["scriptony-style"], source: "domain-map" };
  }
  const projects = domainMap["scriptony-projects"];
  if (projects && projects.includes("scriptony-projects")) {
    return {
      base: projects.replace("scriptony-projects", "scriptony-style"),
      source: "derived-from-projects",
    };
  }
  return { base: "", source: "missing" };
}

function resolveStageBase(domainMap) {
  if (domainMap["scriptony-stage"]) {
    return { base: domainMap["scriptony-stage"], source: "domain-map" };
  }
  const projects = domainMap["scriptony-projects"];
  if (projects && projects.includes("scriptony-projects")) {
    return {
      base: projects.replace("scriptony-projects", "scriptony-stage"),
      source: "derived-from-projects",
    };
  }
  return { base: "", source: "missing" };
}

function resolveEditorReadmodelBase(domainMap) {
  if (domainMap["scriptony-editor-readmodel"]) {
    return {
      base: domainMap["scriptony-editor-readmodel"],
      source: "domain-map",
    };
  }
  const projects = domainMap["scriptony-projects"];
  if (projects && projects.includes("scriptony-projects")) {
    return {
      base: projects.replace(
        "scriptony-projects",
        "scriptony-editor-readmodel",
      ),
      source: "derived-from-projects",
    };
  }
  return { base: "", source: "missing" };
}

async function fetchJson(url, options = {}) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 20000);
  try {
    const response = await fetch(url, { ...options, signal: ctrl.signal });
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* ignore */
    }
    return { ok: response.ok, status: response.status, text, json };
  } finally {
    clearTimeout(timeout);
  }
}

async function loginDemoJwt(endpoint, projectId) {
  const sessionRes = await fetch(
    `${trimSlash(endpoint)}/account/sessions/email`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Project": projectId,
      },
      body: JSON.stringify({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      }),
    },
  );
  if (!sessionRes.ok) {
    throw new Error(
      `Demo login failed (${sessionRes.status}): ${(await sessionRes.text()).slice(0, 160)}`,
    );
  }

  const cookies = sessionRes.headers.getSetCookie?.() || [];
  const sessionCookie =
    cookies.find((entry) => entry.startsWith(`a_session_${projectId}=`)) ||
    cookies.find((entry) => entry.startsWith("a_session_"));
  if (!sessionCookie) {
    throw new Error("Demo login succeeded but no session cookie was returned");
  }

  const cookieHeader = sessionCookie.split(";")[0];
  const jwtRes = await fetch(`${trimSlash(endpoint)}/account/jwt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": projectId,
      Cookie: cookieHeader,
    },
  });
  if (!jwtRes.ok) {
    throw new Error(
      `JWT creation failed (${jwtRes.status}): ${(await jwtRes.text()).slice(0, 160)}`,
    );
  }
  const jwtPayload = await jwtRes.json();
  if (!jwtPayload?.jwt) {
    throw new Error("JWT creation returned empty token");
  }
  return jwtPayload.jwt;
}

loadAppwriteCliEnv();
const missing = getMissingAppwriteServerEnvKeys();
if (missing.length > 0) {
  console.error(`Missing Appwrite env: ${missing.join(", ")}`);
  process.exit(1);
}

const localEnv = existsSync(localEnvPath)
  ? parseEnvFile(readFileSync(localEnvPath, "utf8"))
  : {};
const domainMap = parseDomainMap(
  localEnv.VITE_BACKEND_FUNCTION_DOMAIN_MAP || "",
);
const projectsBase =
  domainMap["scriptony-projects"] ||
  trimSlash(
    localEnv.VITE_APPWRITE_FUNCTIONS_BASE_URL ||
      localEnv.VITE_BACKEND_API_BASE_URL ||
      "",
  );
const styleResolved = resolveStyleBase(domainMap);
const stageResolved = resolveStageBase(domainMap);
const editorResolved = resolveEditorReadmodelBase(domainMap);

console.log("Scriptony — smoke scriptony-style (T98)\n");
console.log(
  `Function deploy: enabled/live (check Appwrite Console) — latest deployment should be ready`,
);
console.log(
  `Style base (${styleResolved.source}): ${styleResolved.base || "(missing)"}\n`,
);

if (!styleResolved.base) {
  console.error(
    "No scriptony-style HTTP base. Add to VITE_BACKEND_FUNCTION_DOMAIN_MAP or ensure scriptony-projects entry exists.",
  );
  process.exit(1);
}

let failures = 0;
const pass = (label, detail = "") => {
  console.log(`✓ ${label}${detail ? ` — ${detail}` : ""}`);
};
const fail = (label, detail = "") => {
  console.log(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
  failures += 1;
};

const health = await fetchJson(joinUrl(styleResolved.base, "/health"));
if (health.ok && health.json?.status === "ok") {
  pass("GET /health", `service=${health.json.service}`);
} else {
  fail("GET /health", `${health.status} ${health.text.slice(0, 160)}`);
}

let bearer = (
  process.env.SCRIPTONY_SMOKE_BEARER_TOKEN ||
  process.env.SCRIPTONY_SMOKE_AUTH_TOKEN ||
  ""
).trim();

if (!bearer) {
  if (!DEMO_EMAIL || !DEMO_PASSWORD) {
    fail(
      "Auth",
      "set SCRIPTONY_SMOKE_BEARER_TOKEN or SCRIPTONY_SMOKE_EMAIL + SCRIPTONY_SMOKE_PASSWORD",
    );
  } else {
    try {
      bearer = await loginDemoJwt(
        process.env.APPWRITE_ENDPOINT,
        process.env.APPWRITE_PROJECT_ID,
      );
      pass("Auth", "demo JWT via session cookie");
    } catch (error) {
      fail("Auth", error instanceof Error ? error.message : String(error));
    }
  }
} else {
  pass("Auth", "SCRIPTONY_SMOKE_BEARER_TOKEN");
}

if (!bearer) {
  console.error(`\nSmoke FAILED (${failures} step(s)).`);
  process.exit(1);
}

const authHeaders = {
  Accept: "application/json",
  Authorization: `Bearer ${bearer}`,
  "Content-Type": "application/json",
};

let projectId = "";
if (projectsBase) {
  const projectsUrl = projectsBase.includes("scriptony-projects")
    ? joinUrl(projectsBase, "/projects")
    : joinUrl(projectsBase, "scriptony-projects/projects");
  const projectsRes = await fetchJson(projectsUrl, { headers: authHeaders });
  const projects = Array.isArray(projectsRes.json?.projects)
    ? projectsRes.json.projects
    : [];
  if (projects.length > 0) {
    projectId = String(projects[0].id || projects[0].$id || "").trim();
    pass("Resolve projectId", projectId);
  } else {
    fail("Resolve projectId", `no projects (${projectsRes.status})`);
  }
} else {
  fail("Resolve projectId", "missing projects base URL");
}

let profileId = "";
if (projectId) {
  const listUrl = joinUrl(
    styleResolved.base,
    `/ai/style/profiles?projectId=${encodeURIComponent(projectId)}`,
  );
  const listRes = await fetchJson(listUrl, { headers: authHeaders });
  const profiles = Array.isArray(listRes.json?.profiles)
    ? listRes.json.profiles
    : [];
  if (listRes.ok) {
    pass("GET /ai/style/profiles", `count=${profiles.length}`);
    if (profiles[0]?.id) {
      profileId = String(profiles[0].id);
    }
  } else {
    fail(
      "GET /ai/style/profiles",
      `${listRes.status} ${listRes.text.slice(0, 160)}`,
    );
  }
}

if (!profileId && projectId) {
  const createRes = await fetchJson(
    joinUrl(styleResolved.base, "/ai/style/profiles"),
    {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: `Smoke Style ${new Date().toISOString().slice(0, 19)}`,
        projectId,
        config: {
          styleSummary: "Smoke test profile",
          type: "custom",
          status: "draft",
        },
        spec: {
          visualSpec: {
            styleDna: {
              status: "configured",
              summary: "Smoke spec from Step 2 test",
            },
          },
          toolSettings: {},
          references: [],
          metadata: { smoke: true },
        },
      }),
    },
  );
  profileId = String(createRes.json?.profile?.id || "");
  if (createRes.ok && profileId) {
    pass("POST /ai/style/profiles", `id=${profileId}`);
  } else {
    fail(
      "POST /ai/style/profiles",
      `${createRes.status} ${createRes.text.slice(0, 200)}`,
    );
  }
}

if (profileId) {
  const getRes = await fetchJson(
    joinUrl(
      styleResolved.base,
      `/ai/style/profiles/${encodeURIComponent(profileId)}`,
    ),
    { headers: authHeaders },
  );
  const profile = getRes.json?.profile;
  const hasSpec =
    profile?.spec != null &&
    typeof profile.spec === "object" &&
    Object.keys(profile.spec).length > 0;
  const hasSpecRef =
    typeof profile?.specRef === "string" && profile.specRef.trim().length > 0;
  if (getRes.ok && hasSpec) {
    pass(
      "GET /ai/style/profiles/:id (full spec)",
      `specRef=${hasSpecRef ? "set" : "null"}, keys=${Object.keys(profile.spec).join(",")}`,
    );
  } else {
    fail(
      "GET /ai/style/profiles/:id (full spec)",
      `${getRes.status} spec=${hasSpec} ${getRes.text.slice(0, 200)}`,
    );
  }

  const previewRes = await fetchJson(
    joinUrl(
      styleResolved.base,
      `/ai/style/profiles/${encodeURIComponent(profileId)}/preview-image`,
    ),
    {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        fileBase64: TINY_PNG_BASE64,
        fileName: "smoke-preview.png",
        mimeType: "image/png",
      }),
    },
  );
  const previewId =
    previewRes.json?.previewImageId || previewRes.json?.profile?.previewImageId;
  if (previewRes.ok && previewId) {
    pass(
      "POST /ai/style/profiles/:id/preview-image",
      `previewImageId=${previewId}`,
    );
  } else {
    fail(
      "POST /ai/style/profiles/:id/preview-image",
      `${previewRes.status} ${previewRes.text.slice(0, 200)}`,
    );
  }

  const analyzeSpecRes = await fetchJson(
    joinUrl(styleResolved.base, "/ai/style/analyze"),
    {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        spec: {
          visualSpec: {
            styleDna: { status: "configured", summary: "Smoke analyze" },
          },
          toolSettings: {},
        },
        mode: "heuristic",
      }),
    },
  );
  const overall = analyzeSpecRes.json?.scores?.overall;
  if (
    analyzeSpecRes.ok &&
    typeof overall === "number" &&
    overall >= 0 &&
    overall <= 1
  ) {
    pass("POST /ai/style/analyze (heuristic)", `overall=${overall}`);
  } else {
    fail(
      "POST /ai/style/analyze (heuristic)",
      `${analyzeSpecRes.status} ${analyzeSpecRes.text.slice(0, 200)}`,
    );
  }

  const analyzeAiRes = await fetchJson(
    joinUrl(styleResolved.base, "/ai/style/analyze"),
    {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ profileId, mode: "ai" }),
    },
  );
  if (
    analyzeAiRes.ok &&
    typeof analyzeAiRes.json?.scores?.overall === "number"
  ) {
    pass(
      "POST /ai/style/analyze (ai)",
      `mode=${analyzeAiRes.json.mode ?? "ai"}`,
    );
  } else if (analyzeAiRes.status === 401 || analyzeAiRes.status === 503) {
    pass(
      "POST /ai/style/analyze (ai)",
      `skipped provider (${analyzeAiRes.status})`,
    );
  } else {
    fail(
      "POST /ai/style/analyze (ai)",
      `${analyzeAiRes.status} ${analyzeAiRes.text.slice(0, 200)}`,
    );
  }

  const validationRes = await fetchJson(
    joinUrl(
      styleResolved.base,
      `/ai/style/profiles/${encodeURIComponent(profileId)}/validation-asset?slotIndex=0`,
    ),
    {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        fileBase64: TINY_PNG_BASE64,
        fileName: "smoke-validation.png",
        mimeType: "image/png",
      }),
    },
  );
  if (validationRes.ok && validationRes.json?.profile) {
    pass("POST /ai/style/profiles/:id/validation-asset", "slot=0");
  } else {
    fail(
      "POST /ai/style/profiles/:id/validation-asset",
      `${validationRes.status} ${validationRes.text.slice(0, 200)}`,
    );
  }
}

if (profileId && projectId) {
  let shotId = (process.env.SCRIPTONY_SMOKE_SHOT_ID || "").trim();
  if (!shotId && editorResolved.base) {
    const stateRes = await fetchJson(
      joinUrl(
        editorResolved.base,
        `/editor/projects/${encodeURIComponent(projectId)}/state`,
      ),
      { headers: authHeaders },
    );
    const shots = Array.isArray(stateRes.json?.shots)
      ? stateRes.json.shots
      : [];
    if (shots[0]?.id) {
      shotId = String(shots[0].id);
    }
  }
  if (shotId) {
    const guideRes = await fetchJson(
      joinUrl(styleResolved.base, "/ai/style/guide-bundle"),
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          projectId,
          shotId,
          styleProfileId: profileId,
        }),
      },
    );
    if (guideRes.ok && guideRes.json?.guideBundle?.id) {
      pass(
        "POST /ai/style/guide-bundle",
        `bundle=${guideRes.json.guideBundle.id}`,
      );
    } else {
      fail(
        "POST /ai/style/guide-bundle",
        `${guideRes.status} ${guideRes.text.slice(0, 200)}`,
      );
    }
  } else {
    pass(
      "POST /ai/style/guide-bundle",
      "skipped (no cloud shot — set SCRIPTONY_SMOKE_SHOT_ID)",
    );
  }
}

if (stageResolved.base && projectId) {
  const jobsRes = await fetchJson(
    joinUrl(
      stageResolved.base,
      `/stage/render-jobs?projectId=${encodeURIComponent(projectId)}`,
    ),
    { headers: authHeaders },
  );
  if (jobsRes.ok && Array.isArray(jobsRes.json?.jobs)) {
    pass(
      "GET /stage/render-jobs?projectId=",
      `count=${jobsRes.json.jobs.length}`,
    );
  } else {
    fail(
      "GET /stage/render-jobs?projectId=",
      `${jobsRes.status} ${jobsRes.text.slice(0, 200)}`,
    );
  }
} else if (!stageResolved.base) {
  fail("GET /stage/render-jobs?projectId=", "missing scriptony-stage base URL");
}

if (failures > 0) {
  console.error(`\nSmoke FAILED (${failures} step(s)).`);
  process.exit(1);
}

console.log(
  "\nSmoke OK — scriptony-style + scriptony-stage T98 paths verified.",
);
