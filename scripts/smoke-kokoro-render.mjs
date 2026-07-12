#!/usr/bin/env node
/**
 * Kokoro sidecar smoke — health, kokoro_ready, synthesize WAV.
 * Location: scripts/smoke-kokoro-render.mjs
 */

import { spawn, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const kokoroDir = path.join(repoRoot, "tools/kokoro-server");
const projectDir = process.env.SCRIPTONY_PROJECT_DIR ?? "/tmp/scriptony-kokoro-smoke";
const port = process.env.KOKORO_PORT ?? "8080";
const base = `http://127.0.0.1:${port}`;

mkdirSync(path.join(projectDir, ".scriptony", "kokoro-output"), {
  recursive: true,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${url} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

const sidecar = spawn(
  path.join(kokoroDir, "start.sh"),
  [],
  {
    cwd: kokoroDir,
    env: {
      ...process.env,
      KOKORO_PORT: port,
      SCRIPTONY_PROJECT_DIR: projectDir,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);

sidecar.stdout.on("data", (chunk) => process.stdout.write(chunk));
sidecar.stderr.on("data", (chunk) => process.stderr.write(chunk));

let failed = false;

try {
  let ready = false;
  for (let i = 0; i < 90; i += 1) {
    try {
      const status = await fetchJson(`${base}/status`);
      process.stdout.write(`status t=${i}: ${JSON.stringify(status)}\n`);
      if (status.kokoro_ready === true) {
        ready = true;
        break;
      }
      if (status.phase === "error") {
        throw new Error(status.message ?? "Kokoro load error");
      }
    } catch (err) {
      if (i > 5 && err instanceof Error && err.message.includes("fetch failed")) {
        /* server still booting */
      } else if (i > 5) {
        throw err;
      }
    }
    await sleep(3000);
  }

  if (!ready) {
    throw new Error("kokoro_ready did not become true within timeout");
  }

  const synth = await fetchJson(`${base}/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "Hallo, das ist ein Kokoro Smoke Test.",
      voice: "af_bella",
      speed: 1.0,
      format: "wav",
    }),
  });

  if (!synth.audioPath) {
    throw new Error("synthesize response missing audioPath");
  }

  const stat = spawnSync("test", ["-f", synth.audioPath]);
  if (stat.status !== 0) {
    throw new Error(`WAV missing: ${synth.audioPath}`);
  }

  console.log(`✓ smoke-kokoro-render OK → ${synth.audioPath}`);
} catch (err) {
  failed = true;
  console.error(`✗ smoke-kokoro-render FAIL: ${err instanceof Error ? err.message : err}`);
} finally {
  sidecar.kill("SIGTERM");
}

process.exit(failed ? 1 : 0);
