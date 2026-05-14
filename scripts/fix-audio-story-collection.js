/**
 * Fix script: Add missing attributes and indexes to the existing
 * scene_audio_tracks collection (and other audio-story collections).
 *
 * Run: APPWRITE_API_KEY=xxx node scripts/fix-audio-story-collection.js
 */

const ENDPOINT = process.env.APPWRITE_ENDPOINT || "http://72.61.84.64:8080/v1";
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "69c04993003de8ff42aa";
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "scriptony";

if (!API_KEY) {
	console.error("❌ ERROR: APPWRITE_API_KEY environment variable required");
	console.log(
		"Usage: APPWRITE_API_KEY=xxx node scripts/fix-audio-story-collection.js",
	);
	process.exit(1);
}

async function appwriteFetch(path, method = "GET", body = null) {
	const url = `${ENDPOINT}${path}`;
	const headers = {
		"X-Appwrite-Project": PROJECT_ID,
		"X-Appwrite-Key": API_KEY,
		"Content-Type": "application/json",
	};

	const options = { method, headers };
	if (body) options.body = JSON.stringify(body);

	const res = await fetch(url, options);
	if (!res.ok) {
		const error = await res.text();
		throw new Error(`HTTP ${res.status}: ${error}`);
	}
	return res.json();
}

/**
 * Safely create a float attribute, skipping if it already exists.
 */
async function ensureFloatAttribute(
	collectionId,
	key,
	required,
	def = 0,
	min = 0,
	max = 999999,
) {
	try {
		await appwriteFetch(
			`/databases/${DATABASE_ID}/collections/${collectionId}/attributes/float`,
			"POST",
			{ key, required, default: def, min, max },
		);
		console.log(`  ✅ Float attribute added: ${collectionId}.${key}`);
		return true;
	} catch (e) {
		if (
			e.message.includes("already exists") ||
			e.message.includes("attribute already")
		) {
			console.log(`  ⏭️  Attribute already exists: ${collectionId}.${key}`);
			return false;
		}
		console.error(
			`  ❌ Error adding attribute ${collectionId}.${key}: ${e.message}`,
		);
		return false;
	}
}

/**
 * Safely create a string attribute, skipping if it already exists.
 */
async function ensureStringAttribute(
	collectionId,
	key,
	size,
	required,
	def = null,
) {
	try {
		await appwriteFetch(
			`/databases/${DATABASE_ID}/collections/${collectionId}/attributes/string`,
			"POST",
			{ key, size, required, default: def, array: false },
		);
		console.log(`  ✅ String attribute added: ${collectionId}.${key}`);
		return true;
	} catch (e) {
		if (
			e.message.includes("already exists") ||
			e.message.includes("attribute already")
		) {
			console.log(`  ⏭️  Attribute already exists: ${collectionId}.${key}`);
			return false;
		}
		console.error(
			`  ❌ Error adding attribute ${collectionId}.${key}: ${e.message}`,
		);
		return false;
	}
}

/**
 * Safely create an index, skipping if it already exists.
 */
async function ensureIndex(collectionId, key, type = "key", attributes = []) {
	try {
		await appwriteFetch(
			`/databases/${DATABASE_ID}/collections/${collectionId}/indexes`,
			"POST",
			{ key, type, attributes },
		);
		console.log(`  ✅ Index created: ${collectionId}.${key}`);
		return true;
	} catch (e) {
		if (
			e.message.includes("already exists") ||
			e.message.includes("index already")
		) {
			console.log(`  ⏭️  Index already exists: ${collectionId}.${key}`);
			return false;
		}
		console.error(
			`  ❌ Error creating index ${collectionId}.${key}: ${e.message}`,
		);
		return false;
	}
}

async function fix() {
	console.log("🔧 Fixing Audio Story Collection attributes and indexes...");
	console.log(`Endpoint: ${ENDPOINT}`);
	console.log(`Database: ${DATABASE_ID}\n`);

	// ─── scene_audio_tracks ─────────────────────────────────────────────
	console.log("📁 scene_audio_tracks — adding missing attributes...");

	// These attributes were missing from the initial setup.
	// NOTE: Appwrite 1.8 doesn't allow defaults on required attrs, so use required=false with default.
	await ensureFloatAttribute("scene_audio_tracks", "start_time", false, 0);
	await ensureFloatAttribute("scene_audio_tracks", "duration", false, 0);

	console.log("\n📁 scene_audio_tracks — creating indexes...");

	// Required indexes for the GetAudioTracks query (Query.equal + Query.orderAsc)
	await ensureIndex("scene_audio_tracks", "scene_id_idx", "key", ["scene_id"]);
	await ensureIndex("scene_audio_tracks", "project_id_idx", "key", [
		"project_id",
	]);
	await ensureIndex("scene_audio_tracks", "type_idx", "key", ["type"]);

	// ─── audio_sessions ──────────────────────────────────────────────────
	console.log("\n📁 audio_sessions — creating indexes...");
	await ensureIndex("audio_sessions", "scene_id_idx", "key", ["scene_id"]);
	await ensureIndex("audio_sessions", "project_id_idx", "key", ["project_id"]);

	// ─── character_voice_assignments ─────────────────────────────────────
	console.log("\n📁 character_voice_assignments — creating indexes...");
	await ensureIndex("character_voice_assignments", "project_id_idx", "key", [
		"project_id",
	]);
	await ensureIndex("character_voice_assignments", "character_id_idx", "key", [
		"character_id",
	]);

	console.log("\n✅ Fix complete!");
	console.log(
		"\n⚠️  Note: New attributes may take a few seconds to become 'available'.",
	);
	console.log(
		"   Wait for all attributes to show status='available' before using the collection.",
	);
	console.log(
		"   Check status: GET /databases/${DATABASE_ID}/collections/scene_audio_tracks",
	);
}

fix().catch((error) => {
	console.error("\n❌ Fix failed:", error.message);
	process.exit(1);
});
