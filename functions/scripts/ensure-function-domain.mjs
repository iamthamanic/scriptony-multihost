#!/usr/bin/env node
/**
 * Ensures an Appwrite proxy rule exists mapping a subdomain to a function.
 *
 * Tries in order:
 *   1. Server API (`APPWRITE_API_KEY` — REST `X-Appwrite-Key`)
 *   2. Appwrite CLI (`appwrite login` session — separate identity from the env key)
 *
 * Usage: node functions/scripts/ensure-function-domain.mjs \
 *          --function-id scriptony-stage \
 *          --domain scriptony-stage.appwrite.scriptony.raccoova.com
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import process from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..");
const serverEnvPath = resolve(root, ".env.server.local");

function parseEnv(text) {
  const out = {};
  for (const line of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function loadServerEnv() {
  try {
    return parseEnv(readFileSync(serverEnvPath, "utf8"));
  } catch {
    return {};
  }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i]
        .slice(2)
        .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      out[key] = argv[++i];
    }
  }
  return out;
}

/** Short error text from Appwrite JSON body or raw response (for logs only). */
async function responseHint(res) {
  try {
    const text = await res.text();
    try {
      const j = JSON.parse(text);
      const msg = j.message ?? j.error ?? j.errors?.[0]?.message;
      if (msg) return String(msg).slice(0, 240);
    } catch {
      /* not JSON */
    }
    return text.trim().slice(0, 240);
  } catch {
    return "";
  }
}

async function tryServerApi(endpoint, projectId, apiKey, functionId, domain) {
  const headers = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": projectId,
    "X-Appwrite-Key": apiKey,
  };

  const listUrl = `${endpoint}/proxy/rules?queries[]=${encodeURIComponent("limit(100)")}`;
  const listRes = await fetch(listUrl, { headers });
  if (!listRes.ok) {
    const hint = await responseHint(listRes);
    console.log(
      `Server API GET proxy/rules failed: HTTP ${listRes.status}${hint ? ` — ${hint}` : ""}`,
    );
    return false;
  }

  const listData = await listRes.json();
  const rules = listData.rules || listData.documents || [];
  if (rules.find((r) => r.domain === domain)) {
    console.log(`✅ Proxy rule already exists: ${domain} → ${functionId}`);
    return true;
  }

  const createRes = await fetch(`${endpoint}/proxy/rules`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      domain,
      resourceType: "functions",
      resourceId: functionId,
    }),
  });
  if (!createRes.ok) {
    const hint = await responseHint(createRes);
    console.log(
      `Server API POST proxy/rules failed: HTTP ${createRes.status}${hint ? ` — ${hint}` : ""}`,
    );
    return false;
  }

  await createRes.json();
  console.log(`✅ Proxy rule created via API: ${domain} → ${functionId}`);
  return true;
}

function tryCli(functionId, domain) {
  try {
    // List existing rules via CLI
    const listOut = execSync(
      `npx --yes appwrite-cli proxy list-rules --json 2>/dev/null`,
      { encoding: "utf8", timeout: 15000 },
    );
    const rules = JSON.parse(listOut);
    const ruleList = rules.rules || rules.documents || rules || [];
    if (Array.isArray(ruleList) && ruleList.find((r) => r.domain === domain)) {
      console.log(`✅ Proxy rule already exists: ${domain} → ${functionId}`);
      return true;
    }
  } catch {
    // CLI list failed, try creating directly
  }

  try {
    execSync(
      `npx --yes appwrite-cli proxy create-function-rule --function-id "${functionId}" --domain "${domain}" 2>&1`,
      { encoding: "utf8", timeout: 15000, stdio: "inherit" },
    );
    console.log(`✅ Proxy rule created via CLI: ${domain} → ${functionId}`);
    return true;
  } catch (_err) {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const functionId = args.functionId?.trim();
  const domain = args.domain?.trim();
  if (!functionId || !domain) {
    console.log(
      "Usage: node ensure-function-domain.mjs --function-id <id> --domain <domain>",
    );
    process.exit(1);
  }

  const env = { ...loadServerEnv(), ...process.env };
  const endpoint = (
    env.APPWRITE_ENDPOINT ||
    env.VITE_APPWRITE_ENDPOINT ||
    ""
  ).replace(/\/+$/, "");
  const projectId =
    env.APPWRITE_PROJECT_ID || env.VITE_APPWRITE_PROJECT_ID || "";
  const apiKey = env.APPWRITE_API_KEY || "";

  // Try server API first (uses APPWRITE_* from env — not the CLI session).
  if (endpoint && projectId && apiKey) {
    const ok = await tryServerApi(
      endpoint,
      projectId,
      apiKey,
      functionId,
      domain,
    );
    if (ok) return;
    console.log(
      "Server API did not complete proxy setup (see HTTP lines above). Possible causes: missing scopes on this key, server version without this route, or SDK/server mismatch. Trying CLI session next…",
    );
  } else {
    console.log(
      "Skipping server API (need APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY). Trying CLI session…",
    );
  }

  console.log(
    "CLI fallback uses the Appwrite CLI login session (`appwrite login`), not APPWRITE_API_KEY.",
  );

  const ok = tryCli(functionId, domain);
  if (ok) return;

  console.log("");
  console.log("⚠️  Could not create or verify the proxy rule automatically.");
  console.log("");
  console.log(
    "   REST path failed? Check the HTTP status lines above (403 often = scopes; 404 = route/version).",
  );
  console.log(
    "   CLI path failed? The CLI uses its own credentials — fix `appwrite login` / CLI project link or grant that identity proxy/rules permissions.",
  );
  console.log("");
  console.log(
    "   Manual fix: Console → Functions → " + functionId + " → Domains → Add:",
  );
  console.log(`     ${domain}`);
  console.log("");
  console.log("   Verify:");
  console.log(
    `     curl -sS -o /dev/null -w "%{http_code}\\n" https://${domain}/health`,
  );
  console.log(`     (or http://${domain}/health if you use HTTP only)`);
  // Deploy/upload succeeded; proxy is optional for routing — do not fail the caller.
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
