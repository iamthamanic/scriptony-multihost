#!/usr/bin/env node
/**
 * Shim updateReadme entry: validates README/docs are in scope when code changes.
 * Location: scripts/update-readme.js
 */

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const script = path.join(root, "scripts", "check-readme-scope.sh");

const result = spawnSync("bash", [script], {
  cwd: root,
  stdio: "inherit",
});

process.exit(typeof result.status === "number" ? result.status : 1);
