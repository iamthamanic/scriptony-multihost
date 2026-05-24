/**
 * Loads repo-root .env / .env.local / .env.server.local (and cwd fallbacks) into process.env
 * for Appwrite CLI tools (provision, delete-collection, etc.).
 *
 * Location: functions/tools/appwrite-env-load.mjs
 */

import { existsSync, readFileSync } from "fs";
import { dirname, join, resolve, normalize } from "path";
import { fileURLToPath } from "url";
import process from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const functionsRoot = join(__dirname, "..");
export const repoRoot = join(functionsRoot, "..");

function envValueMissing(name) {
	const v = process.env[name];
	return v === undefined || String(v).trim() === "";
}

function loadEnvFileAt(absPath) {
	if (!existsSync(absPath)) return false;
	const text = readFileSync(absPath, "utf8");
	for (const line of text.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eq = trimmed.indexOf("=");
		if (eq < 1) continue;
		const key = trimmed.slice(0, eq).trim();
		let val = trimmed.slice(eq + 1).trim();
		if (
			(val.startsWith('"') && val.endsWith('"')) ||
			(val.startsWith("'") && val.endsWith("'"))
		) {
			val = val.slice(1, -1);
		}
		if (val === "") continue;
		if (envValueMissing(key)) process.env[key] = val;
	}
	return true;
}

/** Resolve env path under repoRoot; reject traversal outside repo. */
function resolveEnvPath(relPath) {
	const resolved = normalize(resolve(repoRoot, relPath));
	if (!resolved.startsWith(repoRoot)) {
		throw new Error(`Invalid env path: ${relPath}`);
	}
	return resolved;
}

function loadEnvFile(relPath) {
	return loadEnvFileAt(resolveEnvPath(relPath));
}

loadEnvFile(".env");
loadEnvFile(".env.local");
loadEnvFile(".env.server.local");

const cwd = process.cwd();
loadEnvFileAt(join(cwd, ".env"));
loadEnvFileAt(join(cwd, ".env.local"));
loadEnvFileAt(join(cwd, ".env.server.local"));
loadEnvFileAt(join(cwd, "..", ".env"));
loadEnvFileAt(join(cwd, "..", ".env.local"));
loadEnvFileAt(join(cwd, "..", ".env.server.local"));
