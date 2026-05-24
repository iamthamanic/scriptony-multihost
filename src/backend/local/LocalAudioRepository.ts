/**
 * LocalAudioRepository
 *
 * T35: Stub — gibt leere Arrays zurück.
 */

import type {
	AudioClip,
	AudioTrack,
	AudioRepository,
	AudioClipUpdatePayload,
} from "../ScriptonyBackend";
import type { CharacterVoiceAssignment } from "@/lib/types";

export class LocalAudioRepository implements AudioRepository {
	async getClips(): Promise<AudioClip[]> {
		return [];
	}

	async getClip(): Promise<AudioClip | null> {
		return null;
	}

	async createClip(): Promise<AudioClip> {
		throw new Error("LocalAudioRepository.createClip not implemented");
	}

	async updateClip(): Promise<AudioClip> {
		throw new Error("LocalAudioRepository.updateClip not implemented");
	}

	async deleteClip(): Promise<void> {
		// no-op
	}

	async getTracks(): Promise<AudioTrack[]> {
		return [];
	}

	async getProjectTracks(): Promise<AudioTrack[]> {
		return [];
	}

	async getVoiceAssignments(): Promise<CharacterVoiceAssignment[]> {
		return [];
	}

	async assignVoice(
		projectId: string,
		characterId: string,
		voiceActorType: "human" | "tts",
		_assignmentData?: Partial<CharacterVoiceAssignment>,
	): Promise<CharacterVoiceAssignment> {
		return {
			id: `stub-${Date.now()}`,
			projectId,
			characterId,
			voiceActorType,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
	}
}
