/**
 * Setzt bei allen Appwrite Cloud Functions die Variable SCRIPTONY_APPWRITE_API_ENDPOINT
 * auf eine von außen erreichbare Appwrite-API-URL (z. B. http://HOST:8080/v1).
 *
 * Warum: APPWRITE_ENDPOINT in der Console kann auf http://appwrite… ohne Port zeigen
 * → Node nutzt Port 80 → ECONNREFUSED. getAppwriteEndpoint() in functions/_shared/env.ts
 * bevorzugt SCRIPTONY_APPWRITE_API_ENDPOINT.
 *
 * Quelle des Werts (erste Treffer):
 *   SCRIPTONY_APPWRITE_API_ENDPOINT → APPWRITE_ENDPOINT → VITE_APPWRITE_ENDPOINT
 *
 * Ausführung vom Repo-Root (lädt .env.local wie andere Deploy-Skripte):
 *   node functions/scripts/sync-scriptony-multihost-api-endpoint.mjs
 *
 * Location: functions/scripts/sync-scriptony-multihost-api-endpoint.mjs
 */

import { Client, Functions, Query } from "node-appwrite";
import process from "node:process";
import {
	getMissingAppwriteServerEnvKeys,
	loadAppwriteCliEnv,
} from "./load-appwrite-cli-env.mjs";

function trimTrailingSlash(value) {
	return value.replace(/\/+$/, "");
}

function resolvePublicApiEndpoint() {
	const raw =
		process.env.SCRIPTONY_APPWRITE_API_ENDPOINT?.trim() ||
		process.env.APPWRITE_ENDPOINT?.trim() ||
		process.env.VITE_APPWRITE_ENDPOINT?.trim() ||
		"";
	return raw ? trimTrailingSlash(raw) : "";
}

/**
 * @param {Functions} functions
 * @param {string} functionId
 * @param {string} key
 * @param {string} value
 * @param {boolean} secret
 */
async function upsertVariable(functions, functionId, key, value) {
	const current = await functions.listVariables({ functionId });
	const existing = (current.variables || []).find((v) => v.key === key);
	/** Appwrite forbids flipping secret → non-secret on update — keep stored flag. */
	const preserveSecret =
		typeof existing?.secret === "boolean" ? existing.secret : false;
	if (existing) {
		await functions.updateVariable({
			functionId,
			variableId: existing.$id,
			key,
			value,
			secret: preserveSecret,
		});
		return preserveSecret ? "updated (still secret)" : "updated";
	}
	await functions.createVariable({
		functionId,
		key,
		value,
		secret: false,
	});
	return "created";
}

async function listAllFunctionIds(functions) {
	const PAGE = 100;
	let offset = 0;
	/** @type {string[]} */
	const ids = [];
	for (;;) {
		const res = await functions.list({
			queries: [Query.limit(PAGE), Query.offset(offset)],
		});
		const batch = res.functions ?? [];
		for (const fn of batch) {
			if (fn.$id) ids.push(fn.$id);
		}
		if (batch.length < PAGE) break;
		offset += PAGE;
	}
	return ids;
}

async function main() {
	loadAppwriteCliEnv();
	const missing = getMissingAppwriteServerEnvKeys();
	if (missing.length > 0) {
		console.error(
			`missing Appwrite CLI env: ${missing.join(", ")} (see .env.local / .env.server.local)`,
		);
		process.exit(1);
	}

	const endpointValue = resolvePublicApiEndpoint();
	if (!endpointValue) {
		console.error(
			"No endpoint: set SCRIPTONY_APPWRITE_API_ENDPOINT, APPWRITE_ENDPOINT, or VITE_APPWRITE_ENDPOINT",
		);
		process.exit(1);
	}

	const client = new Client()
		.setEndpoint(process.env.APPWRITE_ENDPOINT)
		.setProject(process.env.APPWRITE_PROJECT_ID)
		.setKey(process.env.APPWRITE_API_KEY);

	const functions = new Functions(client);
	const allIds = await listAllFunctionIds(functions);

	console.log(
		`Found ${allIds.length} function(s). SCRIPTONY_APPWRITE_API_ENDPOINT=${endpointValue}`,
	);

	let ok = 0;
	let failed = 0;
	for (const functionId of allIds) {
		try {
			const action = await upsertVariable(
				functions,
				functionId,
				"SCRIPTONY_APPWRITE_API_ENDPOINT",
				endpointValue,
			);
			console.log(`  ${functionId}: ${action}`);
			ok++;
		} catch (e) {
			const msg = e && typeof e === "object" ? e.message : String(e);
			console.error(`  ${functionId}: ERROR ${msg}`);
			failed++;
		}
	}

	console.log(`Done: ${ok} ok, ${failed} failed.`);
	if (failed > 0) process.exit(1);
}

await main();
