/**
 * AppwriteAudioRepository
 *
 * Nutzt existierende API-Module aus src/lib/api/*.
 * T35: Kein duplizierter HTTP-Code.
 */

import type { AudioRepository, AudioClipUpdatePayload } from "../ScriptonyBackend";
import type {
	AudioClip,
	AudioTrack,
	CharacterVoiceAssignment,
} from "@/lib/types";

import * as ClipAPI from "@/lib/api/audio-clip-api";
import * as StoryAPI from "@/lib/api/audio-story-api";
import { getAuthToken } from "@/lib/auth/getAuthToken";

export class AppwriteAudioRepository implements AudioRepository {
	async getClips(projectId: string): Promise<AudioClip[]> {
		const token = await getAuthToken();
		return ClipAPI.getProjectAudioClips(projectId, token ?? "");
	}

	async getClip(clipId: string): Promise<AudioClip | null> {
		// T35: No dedicated GET /clips/:id endpoint exists in the current API.
		// Throwing explicitly so callers do not get silent false negatives.
		throw new Error(
			"AppwriteAudioRepository.getClip: no single-clip API endpoint. " +
				"Use getClips(projectId) and filter client-side, or extend the backend API.",
		);
	}

	async createClip(
		sceneId: string,
		projectId: string,
		payload: Partial<AudioClip>,
	): Promise<AudioClip> {
		const token = await getAuthToken();
		return ClipAPI.createClip(sceneId, projectId, payload, token ?? "");
	}

	async updateClip(
		clipId: string,
		patch: AudioClipUpdatePayload,
	): Promise<AudioClip> {
		const token = await getAuthToken();
		return ClipAPI.updateClip(clipId, patch, token ?? "");
	}

	async deleteClip(clipId: string): Promise<void> {
		const token = await getAuthToken();
		return ClipAPI.deleteClip(clipId, token ?? "");
	}

	async getTracks(sceneId: string): Promise<AudioTrack[]> {
		return StoryAPI.getSceneAudioTracks(sceneId);
	}

	async getProjectTracks(projectId: string): Promise<AudioTrack[]> {
		return StoryAPI.getProjectAudioTracks(projectId);
	}

	async getVoiceAssignments(projectId: string): Promise<CharacterVoiceAssignment[]> {
		return StoryAPI.getProjectVoiceAssignments(projectId);
	}

	async assignVoice(
		projectId: string,
		characterId: string,
		voiceActorType: "human" | "tts",
		assignmentData?: Partial<CharacterVoiceAssignment>,
	): Promise<CharacterVoiceAssignment> {
		return StoryAPI.assignVoice(
			projectId,
			characterId,
			voiceActorType,
			assignmentData ?? {},
		);
	}
}
