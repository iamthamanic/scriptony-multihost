/**
 * LocalAudioRepository tests (in-memory SQLite).
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { LocalDb } from "../LocalDb";
import { LocalAudioRepository } from "../LocalAudioRepository";

describe("LocalAudioRepository", () => {
	let db: LocalDb;
	let repo: LocalAudioRepository;
	const projectId = "local_test_proj";
	const sceneId = "scene-1";

	beforeEach(async () => {
		db = await LocalDb.createInMemory();
		await db.run(
			"INSERT INTO projects (id, title, description, project_type, user_id, created_at, updated_at, sync_status) VALUES (?, 'T', '', 'film', 'local-user', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 'local')",
			[projectId],
		);
		repo = new LocalAudioRepository(db);
	});

	afterEach(async () => {
		await db.close();
	});

	it("creates a clip and reads it back", async () => {
		const clip = await repo.createClip(sceneId, projectId, {
			trackId: "track-1",
			startSec: 0,
			endSec: 10,
			laneIndex: 0,
			orderIndex: 0,
		});
		expect(clip.id).toBeTruthy();
		expect(clip.sceneId).toBe(sceneId);
		expect(clip.projectId).toBe(projectId);
		expect(clip.startSec).toBe(0);
		expect(clip.endSec).toBe(10);

		const fetched = await repo.getClip(clip.id);
		expect(fetched).not.toBeNull();
		expect(fetched!.id).toBe(clip.id);
	});

	it("lists clips by project", async () => {
		await repo.createClip(sceneId, projectId, {
			trackId: "t1",
			startSec: 0,
			endSec: 5,
		});
		await repo.createClip(sceneId, projectId, {
			trackId: "t2",
			startSec: 5,
			endSec: 10,
		});

		const clips = await repo.getClips(projectId);
		expect(clips).toHaveLength(2);
	});

	it("updates a clip", async () => {
		const clip = await repo.createClip(sceneId, projectId, {
			trackId: "t1",
			startSec: 0,
			endSec: 10,
			laneIndex: 0,
			orderIndex: 0,
		});
		const updated = await repo.updateClip(clip.id, {
			laneIndex: 5,
			endSec: 15,
		});
		expect(updated.laneIndex).toBe(5);
		expect(updated.endSec).toBe(15);
	});

	it("soft-deletes a clip", async () => {
		const clip = await repo.createClip(sceneId, projectId, {
			startSec: 0,
			endSec: 5,
		});
		await repo.deleteClip(clip.id);
		const found = await repo.getClip(clip.id);
		expect(found).toBeNull();
	});

	it("creates and lists audio tracks", async () => {
		await db.run(
			"INSERT INTO scene_audio_tracks (id, project_id, scene_id, track_type, content, created_at, updated_at) VALUES (?, ?, ?, 'dialog', '', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')",
			["track-1", projectId, sceneId],
		);
		const tracks = await repo.getTracks(sceneId);
		expect(tracks).toHaveLength(1);
		expect(tracks[0].type).toBe("dialog");

		const projectTracks = await repo.getProjectTracks(projectId);
		expect(projectTracks).toHaveLength(1);
	});

	it("voice assignments return empty array (MVP stub)", async () => {
		const assignments = await repo.getVoiceAssignments(projectId);
		expect(assignments).toEqual([]);
	});
});
