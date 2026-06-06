#!/usr/bin/env node
/**
 * Pre-flight check before tagging a desktop release (app-v*).
 * Usage: npm run release:desktop:check
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), "utf8"));
}

function readCargoVersion() {
  const cargo = fs.readFileSync(
    path.join(root, "src-tauri/Cargo.toml"),
    "utf8",
  );
  const match = cargo.match(/^version\s*=\s*"([^"]+)"/m);
  if (!match)
    throw new Error("Could not parse version from src-tauri/Cargo.toml");
  return match[1];
}

const pkgVersion = readJson("package.json").version;
const tauriVersion = readJson("src-tauri/tauri.conf.json").version;
const cargoVersion = readCargoVersion();
const versions = {
  package: pkgVersion,
  tauri: tauriVersion,
  cargo: cargoVersion,
};

let ok = true;

console.log("Scriptony desktop release pre-flight\n");

const unique = new Set(Object.values(versions));
if (unique.size !== 1) {
  ok = false;
  console.error("✗ Version mismatch:");
  console.error(`  package.json     → ${pkgVersion}`);
  console.error(`  tauri.conf.json  → ${tauriVersion}`);
  console.error(`  Cargo.toml       → ${cargoVersion}`);
} else {
  console.log(
    `✓ Version ${pkgVersion} synced across package.json, tauri.conf.json, Cargo.toml`,
  );
}

const keyPath = path.join(root, ".tauri/scriptony-updater.key");
if (fs.existsSync(keyPath)) {
  console.log("✓ Local signing key found (.tauri/scriptony-updater.key)");
} else {
  console.warn(
    "⚠ Local signing key missing — OK if TAURI_SIGNING_PRIVATE_KEY is set in GitHub Secrets",
  );
}

if (!process.env.TAURI_SIGNING_PRIVATE_KEY && !fs.existsSync(keyPath)) {
  console.warn(
    "⚠ Set GitHub secret TAURI_SIGNING_PRIVATE_KEY before tagging (see docs/DESKTOP_RELEASE.md)",
  );
}

const pubkey = readJson("src-tauri/tauri.conf.json").plugins?.updater?.pubkey;
if (!pubkey || typeof pubkey !== "string" || pubkey.length < 20) {
  ok = false;
  console.error(
    "✗ plugins.updater.pubkey missing in src-tauri/tauri.conf.json",
  );
} else {
  console.log("✓ Updater public key configured");
}

const endpoints = readJson("src-tauri/tauri.conf.json").plugins?.updater
  ?.endpoints;
if (!Array.isArray(endpoints) || endpoints.length === 0) {
  ok = false;
  console.error(
    "✗ plugins.updater.endpoints missing in src-tauri/tauri.conf.json",
  );
} else {
  console.log(`✓ Update endpoint: ${endpoints[0]}`);
}

console.log("\nNext steps (maintainer):");
console.log("  1. GitHub → Settings → Secrets → TAURI_SIGNING_PRIVATE_KEY");
console.log("  2. git push origin main");
console.log(
  `  3. git tag app-v${pkgVersion} && git push origin app-v${pkgVersion}`,
);
console.log(
  "  4. GitHub Actions → Desktop Release → verify Release assets + latest.json",
);
console.log(
  `  5. Users download: https://github.com/iamthamanic/scriptony-multihost/releases/latest\n`,
);

process.exit(ok ? 0 : 1);
