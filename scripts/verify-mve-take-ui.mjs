#!/usr/bin/env node
/**
 * verify-ui gate for MVE Take UI (#23) — used by /loop retest.
 * Location: scripts/verify-mve-take-ui.mjs
 */

import { spawnSync } from "node:child_process";

const steps = [
  ["typecheck", ["run", "typecheck"]],
  [
    "unit:mve",
    [
      "run",
      "test",
      "--",
      "src/local/__tests__/project-schema.test.ts",
      "src/backend/local/__tests__/LocalMveRepository.test.ts",
      "src/lib/mve/__tests__/play-take-audio.test.ts",
      "src/lib/multi-voice-engine/render/__tests__/render-line.test.ts",
    ],
  ],
  [
    "e2e:take-ui",
    ["run", "test:e2e", "--", ".qa/runs/2026-06-14-mve-take-ui.spec.ts"],
  ],
  [
    "e2e:regression-voice",
    ["run", "test:e2e", "--", ".qa/runs/mve-6b-voice-ui.spec.ts"],
  ],
  ["smoke:kokoro", ["run", "smoke:kokoro"]],
];

let failed = false;

for (const [label, args] of steps) {
  console.log(`\n▶ verify-mve-take-ui: ${label}`);
  const result = spawnSync("npm", args, { stdio: "inherit", shell: false });
  if (result.status !== 0) {
    console.error(`✗ ${label} failed (exit ${result.status ?? 1})`);
    failed = true;
    break;
  }
  console.log(`✓ ${label}`);
}

process.exit(failed ? 1 : 0);
