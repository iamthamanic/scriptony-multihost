#!/usr/bin/env node
/**
 * Verhindert `npm run dev:vite`, solange ein fremder Prozess (z. B. Docker/Browo)
 * Port SCRIPTONY_DEV_PORT (Default 3000) belegt. Nur Listener mit COMMAND `node`
 * (Vite) gelten als ok.
 *
 * SKIP_PORT_CHECK=1 — komplett überspringen.
 *
 * Location: scripts/assert-port-3000-for-scriptony.mjs
 */

import { execSync } from "node:child_process";
import process from "node:process";

const effectivePortRaw = process.env.SCRIPTONY_DEV_PORT?.trim() || "3000";
const effectivePort = parseInt(effectivePortRaw, 10);

if (process.env.SKIP_PORT_CHECK === "1") {
  process.exit(0);
}

if (process.platform === "win32") {
  console.warn(
    "[scriptony] Port-Prüfung auf Windows übersprungen (kein lsof). Optional: SKIP_PORT_CHECK=1",
  );
  process.exit(0);
}

if (!Number.isFinite(effectivePort) || effectivePort <= 0) {
  console.error(
    `[scriptony] Ungültiges SCRIPTONY_DEV_PORT: "${effectivePortRaw}"`,
  );
  process.exit(1);
}

function lsofListeners(portNum) {
  try {
    const out = execSync(`lsof -nP -iTCP:${portNum} -sTCP:LISTEN 2>/dev/null`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    if (!out) return [];
    return out.split("\n").filter((line) => line && !/^COMMAND\s/.test(line));
  } catch {
    return [];
  }
}

const listeners = lsofListeners(effectivePort);

const processes = listeners.map((line) => {
  const cmd = line.split(/\s+/)[0]?.trim() || "(unknown)";
  return { cmd, line };
});

const offenders = processes.filter(({ cmd }) => cmd.toLowerCase() !== "node");

if (offenders.length === 0) {
  process.exit(0);
}

const names = offenders.map((o) => o.cmd).join(", ");
console.error("");
console.error(
  `[scriptony] Port ${effectivePort} ist belegt (nicht durch Vite/Node): ${names}`,
);
console.error(
  `Damit http://localhost:${effectivePort} nur Scriptony zeigt: anderen Dienst stoppen.`,
);
console.error("  docker ps");
console.error("  docker stop <container-id>");
console.error("");
console.error("Überspringen: SKIP_PORT_CHECK=1 npm run dev:vite");
console.error("");
for (const o of offenders) {
  console.error(" ", o.line);
}
console.error("");
process.exit(1);
