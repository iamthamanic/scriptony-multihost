/**
 * Backend Barrel Export
 *
 * T35: Öffentliche API für Backend-Initialisierung und -Zugriff.
 */

export type {
	ScriptonyBackend,
	Project,
	ProjectRepository,
	CreateProjectPayload,
	UpdateProjectPayload,
	StructureNode,
	StructureRepository,
	Script,
	ScriptRepository,
	CharacterRepository,
	WorldbuildingEntry,
	WorldbuildingRepository,
	TimelineRepository,
	AudioRepository,
	AudioClipUpdatePayload,
	AssetRepository,
	ImageUploadGifMode,
	JobService,
	JobStartResponse,
	JobStatusResponse,
	AiService,
	AiPromptPayload,
	AiPromptResult,
	StorageRepository,
} from "./ScriptonyBackend";

export { createBackend } from "./create-backend";
export { BackendProvider, useScriptonyBackend } from "./backend-provider";
