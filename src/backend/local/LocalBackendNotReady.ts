/**
 * LocalBackend placeholder when no .scriptony project is open (T38).
 */

import type {
  ScriptonyBackend,
  Asset,
  ImportAssetInput,
  Project,
  CreateProjectPayload,
  UpdateProjectPayload,
  ImageUploadGifMode,
  AudioRepository,
  AudioClipUpdatePayload,
  JobService,
  JobStartResponse,
  JobStatusResponse,
} from "../ScriptonyBackend";
import type { AuthClient } from "@/lib/auth/AuthClient";
import type { AudioClip, AudioTrack, CharacterVoiceAssignment } from "@/lib/types";
import { AppwriteBlenderService } from "../appwrite/AppwriteBlenderService";
import {
  StubStructureRepository,
  StubScriptRepository,
  StubCharacterRepository,
  StubWorldbuildingRepository,
  StubTimelineRepository,
  StubAiService,
  StubStorageRepository,
} from "../appwrite/stubs";

const NOT_READY = "Open a local .scriptony project first.";

function notReady<T>(): Promise<T> {
  return Promise.reject(new Error(NOT_READY));
}

class NotReadyProjectRepository {
  async list(): Promise<Project[]> {
    return notReady();
  }
  async get(_id: string): Promise<Project | null> {
    return notReady();
  }
  async create(_payload: CreateProjectPayload): Promise<Project> {
    return notReady();
  }
  async update(_id: string, _payload: UpdateProjectPayload): Promise<Project> {
    return notReady();
  }
  async delete(_id: string): Promise<void> {
    return notReady();
  }
}

class NotReadyAudioRepository implements AudioRepository {
  async getClips(_projectId: string): Promise<AudioClip[]> {
    return notReady();
  }
  async getClip(_clipId: string): Promise<AudioClip | null> {
    return notReady();
  }
  async createClip(
    _sceneId: string,
    _projectId: string,
    _payload: Partial<AudioClip>,
  ): Promise<AudioClip> {
    return notReady();
  }
  async updateClip(
    _clipId: string,
    _patch: AudioClipUpdatePayload,
  ): Promise<AudioClip> {
    return notReady();
  }
  async deleteClip(_clipId: string): Promise<void> {
    return notReady();
  }
  async getTracks(_sceneId: string): Promise<AudioTrack[]> {
    return notReady();
  }
  async getProjectTracks(_projectId: string): Promise<AudioTrack[]> {
    return notReady();
  }
  async getVoiceAssignments(_projectId: string): Promise<CharacterVoiceAssignment[]> {
    return notReady();
  }
  async assignVoice(
    _projectId: string,
    _characterId: string,
    _voiceActorType: "human" | "tts",
    _assignmentData?: Partial<CharacterVoiceAssignment>,
  ): Promise<CharacterVoiceAssignment> {
    return notReady();
  }
}

class NotReadyJobService implements JobService {
  async start<TPayload>(
    _functionName: string,
    _payload: TPayload,
  ): Promise<JobStartResponse> {
    return notReady();
  }
  async getStatus<TResult>(_jobId: string): Promise<JobStatusResponse<TResult>> {
    return notReady();
  }
  async getResult<TResult>(_jobId: string): Promise<TResult> {
    return notReady();
  }
}

class NotReadyAssetRepository {
  async importAsset(_input: ImportAssetInput): Promise<Asset> {
    return notReady();
  }
  async list(_projectId: string): Promise<Asset[]> {
    return notReady();
  }
  async get(_id: string): Promise<Asset | null> {
    return notReady();
  }
  async delete(_id: string): Promise<void> {
    return notReady();
  }
  async resolveUrl(_asset: Asset): Promise<string | null> {
    return null;
  }
  async uploadProjectImage(
    _projectId: string,
    _file: File,
    _options?: { gifMode?: ImageUploadGifMode },
  ): Promise<{ imageUrl: string }> {
    return notReady();
  }
  async uploadWorldImage(
    _worldId: string,
    _file: File,
    _options?: { gifMode?: ImageUploadGifMode },
  ): Promise<{ imageUrl: string }> {
    return notReady();
  }
}

export class LocalBackendNotReady implements ScriptonyBackend {
  readonly auth: AuthClient;
  readonly projects = new NotReadyProjectRepository();
  readonly structure = new StubStructureRepository();
  readonly scripts = new StubScriptRepository();
  readonly characters = new StubCharacterRepository();
  readonly worldbuilding = new StubWorldbuildingRepository();
  readonly timeline = new StubTimelineRepository();
  readonly audio = new NotReadyAudioRepository();
  readonly assets = new NotReadyAssetRepository();
  readonly jobs = new NotReadyJobService();
  readonly ai = new StubAiService();
  readonly storage = new StubStorageRepository();
  readonly blender = new AppwriteBlenderService();

  constructor(auth: AuthClient) {
    this.auth = auth;
  }
}
