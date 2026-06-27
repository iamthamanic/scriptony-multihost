/**
 * LocalAudioRepository — SQLite-backed audio persistence.
 *
 * T38: Read/write for audio clips and tracks. Voice assignments
 * are a basic stub since there is no dedicated voice_assignments table.
 * All queries use parameterised statements (OWASP ASVS 5.x).
 */

import type {
	AudioRepository,
	AudioClipUpdatePayload,
} from "../ScriptonyBackend";
import type {
	AudioClip,
	AudioTrack,
	CharacterVoiceAssignment,
} from "@/lib/types";
import type { LocalDb } from "./LocalDb";
import type { BindParams } from "sql.js";
import { TABLE } from "@/local/project-schema";
import { mapAudioClipRow, mapAudioTrackRow } from "./mappers";
import { localId } from "./id";

export class LocalAudioRepository implements AudioRepository {
	constructor(private readonly db: LocalDb) {}

	// ── Clips ────────────────────────────────────────────────────────────────

	async getClips(projectId: string): Promise<AudioClip[]> {
		const rows = await this.db.all(
			"SELECT * FROM audio_clips WHERE project_id = ? AND deleted_at IS NULL ORDER BY scene_id, lane_index, order_index ASC",
			[projectId],
		);
		return rows.map(mapAudioClipRow);
	}

	async getClipsByScene(sceneId: string): Promise<AudioClip[]> {
		const rows = await this.db.all(
			"SELECT * FROM audio_clips WHERE scene_id = ? AND deleted_at IS NULL ORDER BY lane_index, order_index ASC",
			[sceneId],
		);
		return rows.map(mapAudioClipRow);
	}

	async getClip(clipId: string): Promise<AudioClip | null> {
		const row = await this.db.get(
			"SELECT * FROM audio_clips WHERE id = ? AND deleted_at IS NULL",
			[clipId],
		);
		return row ? mapAudioClipRow(row) : null;
	}

	async createClip(
		sceneId: string,
		projectId: string,
		payload: Partial<AudioClip>,
	): Promise<AudioClip> {
		const now = new Date().toISOString();
		const id = localId("local");

		const startSec = payload.startSec ?? 0;
		const endSec = payload.endSec ?? 0;

		const clip: AudioClip = {
			id,
			trackId: payload.trackId ?? "",
			sceneId,
			projectId,
			startSec,
			endSec,
			laneIndex: payload.laneIndex ?? 0,
			orderIndex: payload.orderIndex ?? 0,
			trackType: payload.trackType,
			content: payload.content,
			characterId: payload.characterId,
			audioFileId: payload.audioFileId,
			waveformData: payload.waveformData,
			crossScene: payload.crossScene,
			fxPresetId: payload.fxPresetId,
			createdAt: now,
			updatedAt: now,
		};

		await this.db.run(
			"INSERT INTO audio_clips (id, project_id, track_id, scene_id, clip_type, content, cloud_audio_file_id, start_sec, end_sec, lane_index, order_index, fx_preset_id, cross_scene, waveform_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			[
				clip.id,
				clip.projectId,
				clip.trackId || null,
				clip.sceneId,
				clip.trackType ?? "clip",
				clip.content ?? null,
				clip.audioFileId ?? null,
				clip.startSec,
				clip.endSec,
				clip.laneIndex,
				clip.orderIndex,
				clip.fxPresetId ?? null,
				clip.crossScene ? 1 : 0,
				clip.waveformData ? JSON.stringify(clip.waveformData) : null,
				clip.createdAt,
				clip.updatedAt,
			],
		);

		await this.db.insertChange({
			projectId,
			entityType: TABLE.AUDIO_CLIPS,
			entityId: clip.id,
			operation: "create",
			payload: clip,
		});

		return clip;
	}

	async updateClip(
		clipId: string,
		patch: AudioClipUpdatePayload,
	): Promise<AudioClip> {
		const existing = await this.getClip(clipId);
		if (!existing) throw new Error(`AudioClip ${clipId} not found`);

		const now = new Date().toISOString();
		// Column names are all hardcoded — not derived from user input (OWASP ASVS 5.x)
		const values: BindParams = [];
		const setParts: string[] = [];

		if (patch.sceneId !== undefined) {
			setParts.push("scene_id = ?");
			values.push(patch.sceneId);
		}
		if (patch.laneIndex !== undefined) {
			setParts.push("lane_index = ?");
			values.push(patch.laneIndex);
		}
		if (patch.fxPresetId !== undefined) {
			setParts.push("fx_preset_id = ?");
			values.push(patch.fxPresetId ?? null);
		}
		if (patch.startSec !== undefined) {
			setParts.push("start_sec = ?");
			values.push(patch.startSec);
		}
		if (patch.endSec !== undefined) {
			setParts.push("end_sec = ?");
			values.push(patch.endSec);
		}
		if (patch.orderIndex !== undefined) {
			setParts.push("order_index = ?");
			values.push(patch.orderIndex);
		}

		setParts.push("version = version + 1");
		setParts.push("updated_at = ?");
		values.push(now);
		values.push(clipId);

		await this.db.run(
			"UPDATE audio_clips SET " + setParts.join(", ") + " WHERE id = ?",
			values,
		);

		await this.db.insertChange({
			projectId: existing.projectId,
			entityType: TABLE.AUDIO_CLIPS,
			entityId: clipId,
			operation: "update",
			payload: patch,
		});

		const updated = await this.getClip(clipId);
		if (!updated) throw new Error(`AudioClip ${clipId} not found after update`);
		return updated;
	}

	async deleteClip(clipId: string): Promise<void> {
		const existing = await this.getClip(clipId);
		if (!existing) return; // idempotent

		const now = new Date().toISOString();
		await this.db.run(
			"UPDATE audio_clips SET deleted_at = ?, updated_at = ? WHERE id = ?",
			[now, now, clipId],
		);

		await this.db.insertChange({
			projectId: existing.projectId,
			entityType: TABLE.AUDIO_CLIPS,
			entityId: clipId,
			operation: "delete",
			payload: { id: clipId },
		});
	}

	// ── Tracks ────────────────────────────────────────────────────────────────

	async getTracks(sceneId: string): Promise<AudioTrack[]> {
		const rows = await this.db.all(
			"SELECT * FROM scene_audio_tracks WHERE scene_id = ? AND deleted_at IS NULL ORDER BY created_at ASC",
			[sceneId],
		);
		return rows.map(mapAudioTrackRow);
	}

	async getProjectTracks(projectId: string): Promise<AudioTrack[]> {
		const rows = await this.db.all(
			"SELECT * FROM scene_audio_tracks WHERE project_id = ? AND deleted_at IS NULL ORDER BY created_at ASC",
			[projectId],
		);
		return rows.map(mapAudioTrackRow);
	}

	// ── Voice assignments ─────────────────────────────────────────────────────
	// MVP: No dedicated table. Return empty array; voice assignments stored
	// via character metadata in future tickets.

	async getVoiceAssignments(
		_projectId: string,
	): Promise<CharacterVoiceAssignment[]> {
		return [];
	}

	async assignVoice(
		projectId: string,
		characterId: string,
		voiceActorType: "human" | "tts",
		_assignmentData?: Partial<CharacterVoiceAssignment>,
	): Promise<CharacterVoiceAssignment> {
		// MVP: Return a basic assignment object. Persisted in characters table
		// by the CharacterRepository update path. Full persistence → T38b.
		const now = new Date().toISOString();
		return {
			id: localId("local"),
			projectId,
			characterId,
			voiceActorType,
			createdAt: now,
			updatedAt: now,
		};
	}
}
