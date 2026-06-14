/**
 * ScriptonyBackend — zentrales Domain-Backend-Interface.
 *
 * T35: Domain Backend Boundary.
 * Jedes Repository ist eine abgekapselte Einheit (SRP).
 * Keine HTTP-Logik hier — nur Verträge (Interfaces).
 */

import type { AuthClient } from "@/lib/auth/AuthClient";
import type {
	CreateBeatPayload,
	StoryBeat,
	UpdateBeatPayload,
} from "@/lib/api/beats-api-types";
import type { AudioClip, AudioTrack, CharacterVoiceAssignment } from "@/lib/types";
import type { Character } from "@/lib/types";
import type {
	StorageBucketKind,
	StorageContainer,
	StorageFile,
	StorageFileInfo,
	StorageProviderConfig,
	StorageUsageInfo,
} from "@/lib/storage-provider";

// ── Auth ───────────────────────────────────────────────────────────────────

// AuthClient wird 1:1 wiederverwendet (T34).

// ── Projects ───────────────────────────────────────────────────────────────

export interface Project {
	$id: string;
	name: string;
	description?: string;
	projectType?: string;
	userId: string;
	createdAt: string;
	updatedAt: string;
}

export interface CreateProjectPayload {
	name: string;
	description?: string;
	projectType?: string;
}

export interface UpdateProjectPayload {
	name?: string;
	description?: string;
	projectType?: string;
}

export interface ProjectRepository {
	list(): Promise<Project[]>;
	get(id: string): Promise<Project | null>;
	create(payload: CreateProjectPayload): Promise<Project>;
	update(id: string, payload: UpdateProjectPayload): Promise<Project>;
	delete(id: string): Promise<void>;
}

// ── Structure ──────────────────────────────────────────────────────────────

export interface StructureNode {
	id: string;
	projectId: string;
	parentId?: string | null;
	type: string;
	label: string;
	orderIndex: number;
	metadata?: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
}

export interface StructureRepository {
	getByProject(projectId: string): Promise<StructureNode[]>;
	getNode(id: string): Promise<StructureNode | null>;
	create(node: Omit<StructureNode, "id" | "createdAt" | "updatedAt">): Promise<StructureNode>;
	update(id: string, patch: Partial<StructureNode>): Promise<StructureNode>;
	delete(id: string): Promise<void>;
}

// ── Scripts ────────────────────────────────────────────────────────────────

export interface Script {
	id: string;
	projectId: string;
	containerId?: string;
	content: string;
	format: "fountain" | "markdown" | "json";
	version: number;
	createdAt: string;
	updatedAt: string;
}

export interface ScriptRepository {
	get(id: string): Promise<Script | null>;
	getByProject(projectId: string): Promise<Script[]>;
	create(payload: Omit<Script, "id" | "createdAt" | "updatedAt">): Promise<Script>;
	update(id: string, patch: Partial<Script>): Promise<Script>;
	delete(id: string): Promise<void>;
}

// ── Characters ─────────────────────────────────────────────────────────────

export interface CharacterRepository {
	list(projectId: string): Promise<Character[]>;
	get(id: string): Promise<Character | null>;
	create(projectId: string, payload: Partial<Character>): Promise<Character>;
	update(id: string, patch: Partial<Character>): Promise<Character>;
	delete(id: string): Promise<void>;
}

// ── Story Beats (T62 — local SQLite; cloud uses HTTP beats-api) ───────────

export interface BeatRepository {
	list(projectId: string): Promise<StoryBeat[]>;
	get(id: string): Promise<StoryBeat | null>;
	create(projectId: string, payload: CreateBeatPayload): Promise<StoryBeat>;
	update(id: string, patch: UpdateBeatPayload): Promise<StoryBeat>;
	delete(id: string): Promise<void>;
}

// ── Worldbuilding ──────────────────────────────────────────────────────────

export interface WorldbuildingEntry {
	id: string;
	projectId: string;
	category: string;
	label: string;
	content: string;
	createdAt: string;
	updatedAt: string;
}

export interface WorldbuildingRepository {
	list(projectId: string): Promise<WorldbuildingEntry[]>;
	get(id: string): Promise<WorldbuildingEntry | null>;
	create(projectId: string, payload: Partial<WorldbuildingEntry>): Promise<WorldbuildingEntry>;
	update(id: string, patch: Partial<WorldbuildingEntry>): Promise<WorldbuildingEntry>;
	delete(id: string): Promise<void>;
}

// ── Timeline ───────────────────────────────────────────────────────────────

export interface TimelineRepository {
	getByProject(projectId: string): Promise<unknown[]>;
	getByScene(sceneId: string): Promise<unknown[]>;
	create(projectId: string, payload: unknown): Promise<unknown>;
	update(id: string, patch: unknown): Promise<unknown>;
	delete(id: string): Promise<void>;
}

// ── Audio ────────────────────────────────────────────────────────────────────

export interface AudioClipUpdatePayload {
	laneIndex?: number;
	characterId?: string;
	fxPresetId?: string;
	fxSlots?: (string | null)[];
	fxChainEnabled?: boolean;
	startSec?: number;
	endSec?: number;
	orderIndex?: number;
	audioFileId?: string;
	waveformData?: number[];
}

export interface AudioRepository {
	getClips(projectId: string): Promise<AudioClip[]>;
	getClipsByScene(sceneId: string): Promise<AudioClip[]>;
	getClip(clipId: string): Promise<AudioClip | null>;
	createClip(sceneId: string, projectId: string, payload: Partial<AudioClip>): Promise<AudioClip>;
	updateClip(clipId: string, patch: AudioClipUpdatePayload): Promise<AudioClip>;
	deleteClip(clipId: string): Promise<void>;

	getTracks(sceneId: string): Promise<AudioTrack[]>;
	getProjectTracks(projectId: string): Promise<AudioTrack[]>;
	getVoiceAssignments(projectId: string): Promise<CharacterVoiceAssignment[]>;
	assignVoice(
		projectId: string,
		characterId: string,
		voiceActorType: "human" | "tts",
		assignmentData?: Partial<CharacterVoiceAssignment>,
	): Promise<CharacterVoiceAssignment>;
}

// ── Assets ───────────────────────────────────────────────────────────────────

export type ImageUploadGifMode = "keep" | "convert" | "strip";

export type AssetType = "image" | "audio" | "video" | "document" | "other";

export type AssetStorageRef =
	| { mode: "local"; relativePath: string }
	| { mode: "appwrite"; bucketId: string; fileId: string }
	| { mode: "external"; url: string };

export interface Asset {
	id: string;
	projectId: string;
	type: AssetType;
	filename: string;
	mimeType: string | null;
	sizeBytes: number | null;
	storage: AssetStorageRef;
	missing?: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface ImportAssetInput {
	projectId: string;
	file: File;
	type: AssetType;
	originalFilename?: string;
}

export interface AssetRepository {
	importAsset(input: ImportAssetInput): Promise<Asset>;
	list(projectId: string): Promise<Asset[]>;
	get(id: string): Promise<Asset | null>;
	delete(id: string): Promise<void>;
	resolveUrl(asset: Asset): Promise<string | null>;
	uploadProjectImage(
		projectId: string,
		file: File,
		options?: { gifMode?: ImageUploadGifMode },
	): Promise<{ imageUrl: string }>;
	uploadWorldImage(
		worldId: string,
		file: File,
		options?: { gifMode?: ImageUploadGifMode },
	): Promise<{ imageUrl: string }>;
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

export interface JobStartResponse {
	jobId: string;
	status: string;
}

export type JobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface JobStatusResponse<TResult = unknown> {
	jobId: string;
	status: JobStatus;
	result?: TResult;
	error?: string;
}

export interface JobService {
	start<TPayload>(functionName: string, payload: TPayload): Promise<JobStartResponse>;
	getStatus<TResult>(jobId: string): Promise<JobStatusResponse<TResult>>;
	getResult<TResult>(jobId: string): Promise<TResult>;
}

// ── AI ───────────────────────────────────────────────────────────────────────

export interface AiPromptPayload {
	prompt: string;
	model?: string;
	maxTokens?: number;
	stream?: boolean;
}

export interface AiPromptResult {
	text: string;
	tokensUsed?: number;
	model?: string;
}

export interface AiService {
	generateText(payload: AiPromptPayload): Promise<AiPromptResult>;
	streamText(payload: AiPromptPayload, onChunk: (chunk: string) => void): Promise<void>;
}

// ── Storage ──────────────────────────────────────────────────────────────────

export interface StorageRepository {
	listProviders(): Promise<StorageProviderConfig[]>;
	getProviderMeta(providerId: string): Promise<StorageProviderConfig | null>;
	getDefaultProviderId(): Promise<string | null>;
	getSelectedProviderId(): Promise<string | null>;
	setSelectedProviderId(id: string): Promise<void>;
	listContainers(providerId: string, bucket: StorageBucketKind): Promise<StorageContainer[]>;
	listFiles(providerId: string, containerId: string): Promise<StorageFile[]>;
	uploadFile(providerId: string, containerId: string, file: File): Promise<StorageFileInfo>;
	deleteFile(providerId: string, fileId: string): Promise<void>;
	getUsage(providerId: string): Promise<StorageUsageInfo>;
}

import type { BlenderService } from "./blender/types";

export type {
	BlenderService,
	ExportBlenderProjectInput,
	BlenderExportResult,
	InstallBlenderAddonInput,
	ConnectBlenderInput,
	BlenderConnection,
	SyncBlenderSceneInput,
	BlenderProjectSource,
} from "./blender/types";

// ── ScriptonyBackend ─────────────────────────────────────────────────────────

export interface ScriptonyBackend {
	readonly auth: AuthClient;
	readonly projects: ProjectRepository;
	readonly structure: StructureRepository;
	readonly scripts: ScriptRepository;
	readonly characters: CharacterRepository;
	readonly worldbuilding: WorldbuildingRepository;
	readonly timeline: TimelineRepository;
	readonly audio: AudioRepository;
	readonly assets: AssetRepository;
	readonly jobs: JobService;
	readonly ai: AiService;
	readonly storage: StorageRepository;
	readonly blender: BlenderService;
	readonly beats: BeatRepository;
}

export type {
	Character,
	AudioClip,
	AudioTrack,
	CharacterVoiceAssignment,
	StorageBucketKind,
	StorageContainer,
	StorageFile,
	StorageFileInfo,
	StorageProviderConfig,
	StorageUsageInfo,
};
