/**
 * Mappers — Convert between SQLite snake_case rows and domain camelCase types.
 *
 * T38: Centralised mapping keeps repositories DRY. Each mapper is a pure
 * function with no side effects. Column names are explicitly mapped — no
 * magic name transformations that could silently break.
 *
 * SECURITY: No user input is interpolated into SQL — mappers only transform
 * already-fetched row objects into domain types.
 */

import type {
	Project,
	StructureNode,
	Script,
	WorldbuildingEntry,
	Asset,
	AssetType,
} from "../ScriptonyBackend";
import type {
	Character,
	AudioClip,
	AudioTrack,
	CharacterVoiceAssignment,
} from "@/lib/types";
import { TABLE } from "@/local/project-schema";
import type { SqlValue } from "sql.js";

// ── Allowlist for change_log table name (OWASP ASVS 5.x — no string interpolation from user input) ──

/** Allowlisted table names for use in parameterised change_log queries. */
const CHANGE_LOG_TABLES = new Set<string>([
	TABLE.PROJECTS,
	TABLE.PROJECT_NODES,
	TABLE.SCRIPT_BLOCKS,
	TABLE.CHARACTERS,
	TABLE.WORLD_ITEMS,
	TABLE.SCENE_AUDIO_TRACKS,
	TABLE.AUDIO_CLIPS,
	TABLE.ASSETS,
	TABLE.JOBS,
]);

/** Assert that a table name is in the allowlist. Throws on unknown names. */
export function assertChangeLogTable(tableName: string): void {
	if (!CHANGE_LOG_TABLES.has(tableName)) {
		throw new Error(`Invalid change_log entity_type: ${tableName}`);
	}
}

// ── Project ───────────────────────────────────────────────────────────────

/** Map a projects-table row to a Project domain object. */
export function mapProjectRow(row: Record<string, unknown>): Project {
	return {
		$id: String(row.id ?? ""),
		name: String(row.title ?? row.name ?? ""),
		description: row.description ? String(row.description) : undefined,
		projectType: row.project_type ? String(row.project_type) : undefined,
		userId: String(row.user_id ?? "local-user"),
		createdAt: String(row.created_at ?? ""),
		updatedAt: String(row.updated_at ?? ""),
	};
}

/** Map a Project domain object to a projects-table INSERT/UPDATE values array. */
export function projectToRow(p: {
	id: string;
	name: string;
	description?: string;
	projectType?: string;
	userId: string;
	createdAt: string;
	updatedAt: string;
}): SqlValue[] {
	return [
		p.id,
		p.name,
		p.description ?? "",
		p.projectType ?? "film",
		p.userId,
		p.createdAt,
		p.updatedAt,
	];
}

// ── StructureNode ──────────────────────────────────────────────────────────

/** Map a project_nodes-table row to a StructureNode domain object. */
export function mapNodeRow(row: Record<string, unknown>): StructureNode {
	return {
		id: String(row.id ?? ""),
		projectId: String(row.project_id ?? ""),
		parentId: row.parent_id != null ? String(row.parent_id) : null,
		type: String(row.node_type ?? ""),
		label: String(row.label ?? ""),
		orderIndex: Number(row.order_index ?? 0),
		createdAt: String(row.created_at ?? ""),
		updatedAt: String(row.updated_at ?? ""),
	};
}

// ── Script ────────────────────────────────────────────────────────────────

/** Map a script_blocks-table row to a Script domain object. */
export function mapScriptRow(row: Record<string, unknown>): Script {
	return {
		id: String(row.id ?? ""),
		projectId: String(row.project_id ?? ""),
		containerId: row.node_id != null ? String(row.node_id) : undefined,
		content: String(row.content ?? ""),
		format: (row.format as Script["format"]) ?? "fountain",
		version: Number(row.version ?? 1),
		createdAt: String(row.created_at ?? ""),
		updatedAt: String(row.updated_at ?? ""),
	};
}

// ── Character ──────────────────────────────────────────────────────────────

/** Map a characters-table row to a Character domain object. */
export function mapCharacterRow(row: Record<string, unknown>): Character {
	return {
		id: String(row.id ?? ""),
		projectId: String(row.project_id ?? ""),
		name: String(row.name ?? ""),
		role: (row.role as Character["role"]) ?? "supporting",
		description: row.description ? String(row.description) : undefined,
		age: row.age != null ? Number(row.age) : undefined,
		imageUrl: row.image_url ? String(row.image_url) : undefined,
		traits: parseJsonArray(row.traits_json),
		backstory: row.backstory ? String(row.backstory) : undefined,
		gender: row.gender ? String(row.gender) : undefined,
		createdAt: String(row.created_at ?? ""),
		updatedAt: String(row.updated_at ?? ""),
	};
}

// ── WorldbuildingEntry ─────────────────────────────────────────────────────

/** Map a world_items-table row to a WorldbuildingEntry domain object. */
export function mapWorldItemRow(
	row: Record<string, unknown>,
): WorldbuildingEntry {
	return {
		id: String(row.id ?? ""),
		projectId: String(row.project_id ?? ""),
		category: String(row.category ?? ""),
		label: String(row.title ?? ""),
		content: String(row.content ?? ""),
		createdAt: String(row.created_at ?? ""),
		updatedAt: String(row.updated_at ?? ""),
	};
}

// ── AudioTrack ─────────────────────────────────────────────────────────────

/** Map a scene_audio_tracks-table row to an AudioTrack domain object. */
export function mapAudioTrackRow(row: Record<string, unknown>): AudioTrack {
	return {
		id: String(row.id ?? ""),
		sceneId: String(row.scene_id ?? ""),
		projectId: String(row.project_id ?? ""),
		type: (row.track_type as AudioTrack["type"]) ?? "dialog",
		content: row.content ? String(row.content) : undefined,
		characterId: row.character_id ? String(row.character_id) : undefined,
		ttsVoiceId: row.voice_id ? String(row.voice_id) : undefined,
		ttsSettings: parseJsonValue<AudioTrack["ttsSettings"]>(row.voice_settings),
		createdAt: String(row.created_at ?? ""),
		updatedAt: String(row.updated_at ?? ""),
	};
}

// ── AudioClip ──────────────────────────────────────────────────────────────

/** Map an audio_clips-table row to an AudioClip domain object. */
export function mapAudioClipRow(row: Record<string, unknown>): AudioClip {
	return {
		id: String(row.id ?? ""),
		trackId: row.track_id ? String(row.track_id) : "",
		sceneId: String(row.scene_id ?? ""),
		projectId: String(row.project_id ?? ""),
		startSec: Number(row.start_sec ?? 0),
		endSec: Number(row.end_sec ?? 0),
		laneIndex: Number(row.lane_index ?? 0),
		orderIndex: Number(row.order_index ?? 0),
		trackType: row.clip_type ? String(row.clip_type) : undefined,
		content: row.content ? String(row.content) : undefined,
		characterId: row.character_id ? String(row.character_id) : undefined,
		audioFileId: row.cloud_audio_file_id
			? String(row.cloud_audio_file_id)
			: undefined,
		waveformData: parseJsonValue<number[]>(row.waveform_json),
		crossScene: row.cross_scene === 1 || row.cross_scene === true,
		fxPresetId: row.fx_preset_id ? String(row.fx_preset_id) : undefined,
		createdAt: String(row.created_at ?? ""),
		updatedAt: String(row.updated_at ?? ""),
	};
}

// ── Asset ──────────────────────────────────────────────────────────────────

export function mapAssetRow(
	row: Record<string, unknown>,
	opts?: { missing?: boolean },
): Asset {
	const relativePath = row.local_path ? String(row.local_path) : "";
	const cloudFileId = row.cloud_file_id ? String(row.cloud_file_id) : null;
	const storage: Asset["storage"] = cloudFileId
		? { mode: "appwrite", bucketId: "cloud", fileId: cloudFileId }
		: { mode: "local", relativePath };

	let metaOriginal = "";
	try {
		const meta = row.metadata_json
			? typeof row.metadata_json === "string"
				? JSON.parse(row.metadata_json as string)
				: row.metadata_json
			: {};
		if (meta && typeof meta === "object" && "originalFilename" in meta) {
			metaOriginal = String(
				(meta as { originalFilename?: string }).originalFilename ?? "",
			);
		}
	} catch {
		metaOriginal = "";
	}

	const pathParts = relativePath.split("/");
	const filenameFromPath = pathParts[pathParts.length - 1] || "asset";

	return {
		id: String(row.id ?? ""),
		projectId: String(row.project_id ?? ""),
		type: (row.asset_type as AssetType) ?? "other",
		filename: metaOriginal || filenameFromPath,
		mimeType: row.mime_type != null ? String(row.mime_type) : null,
		sizeBytes: row.file_size_bytes != null ? Number(row.file_size_bytes) : null,
		storage,
		missing: opts?.missing,
		createdAt: String(row.created_at ?? ""),
		updatedAt: String(row.updated_at ?? ""),
	};
}

// ── Internal helpers ─────────────────────────────────────────────────────

/** Safely parse a JSON column that should be an array. */
function parseJsonArray(value: unknown): string[] | undefined {
	if (value == null) return undefined;
	if (Array.isArray(value)) return value as string[];
	try {
		const parsed = JSON.parse(String(value));
		return Array.isArray(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

/** Safely parse a JSON column; returns undefined on corrupt data. */
function parseJsonValue<T>(value: unknown): T | undefined {
	if (value == null) return undefined;
	if (typeof value !== "string") return value as T;
	try {
		return JSON.parse(value) as T;
	} catch {
		return undefined;
	}
}
