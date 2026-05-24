/**
 * Stub Repositories für Domains, die in T35 noch nicht voll implementiert sind.
 * Werden durch echte Implementierungen ersetzt, sobald die entsprechenden Tickets fertig sind.
 * Jede Methode wirft einen expliziten Fehler, damit unbeabsichtigte Nutzung sofort sichtbar wird.
 */

import type {
	StructureRepository,
	StructureNode,
	ScriptRepository,
	Script,
	CharacterRepository,
	Character,
	WorldbuildingRepository,
	WorldbuildingEntry,
	TimelineRepository,
	AiService,
	AiPromptPayload,
	AiPromptResult,
	StorageRepository,
	StorageProviderConfig,
	StorageContainer,
	StorageFile,
	StorageFileInfo,
	StorageUsageInfo,
	StorageBucketKind,
} from "../ScriptonyBackend";

// ── Structure ───────────────────────────────────────────────────────────────

export class StubStructureRepository implements StructureRepository {
	async getByProject(): Promise<StructureNode[]> {
		throw new Error("StubStructureRepository.getByProject not implemented");
	}
	async getNode(): Promise<StructureNode | null> {
		throw new Error("StubStructureRepository.getNode not implemented");
	}
	async create(): Promise<StructureNode> {
		throw new Error("StubStructureRepository.create not implemented");
	}
	async update(): Promise<StructureNode> {
		throw new Error("StubStructureRepository.update not implemented");
	}
	async delete(): Promise<void> {
		throw new Error("StubStructureRepository.delete not implemented");
	}
}

// ── Scripts ─────────────────────────────────────────────────────────────────

export class StubScriptRepository implements ScriptRepository {
	async get(): Promise<Script | null> {
		throw new Error("StubScriptRepository.get not implemented");
	}
	async getByProject(): Promise<Script[]> {
		throw new Error("StubScriptRepository.getByProject not implemented");
	}
	async create(): Promise<Script> {
		throw new Error("StubScriptRepository.create not implemented");
	}
	async update(): Promise<Script> {
		throw new Error("StubScriptRepository.update not implemented");
	}
	async delete(): Promise<void> {
		throw new Error("StubScriptRepository.delete not implemented");
	}
}

// ── Characters ────────────────────────────────────────────────────────────────

export class StubCharacterRepository implements CharacterRepository {
	async list(): Promise<Character[]> {
		throw new Error("StubCharacterRepository.list not implemented");
	}
	async get(): Promise<Character | null> {
		throw new Error("StubCharacterRepository.get not implemented");
	}
	async create(): Promise<Character> {
		throw new Error("StubCharacterRepository.create not implemented");
	}
	async update(): Promise<Character> {
		throw new Error("StubCharacterRepository.update not implemented");
	}
	async delete(): Promise<void> {
		throw new Error("StubCharacterRepository.delete not implemented");
	}
}

// ── Worldbuilding ───────────────────────────────────────────────────────────

export class StubWorldbuildingRepository implements WorldbuildingRepository {
	async list(): Promise<WorldbuildingEntry[]> {
		throw new Error("StubWorldbuildingRepository.list not implemented");
	}
	async get(): Promise<WorldbuildingEntry | null> {
		throw new Error("StubWorldbuildingRepository.get not implemented");
	}
	async create(): Promise<WorldbuildingEntry> {
		throw new Error("StubWorldbuildingRepository.create not implemented");
	}
	async update(): Promise<WorldbuildingEntry> {
		throw new Error("StubWorldbuildingRepository.update not implemented");
	}
	async delete(): Promise<void> {
		throw new Error("StubWorldbuildingRepository.delete not implemented");
	}
}

// ── Timeline ──────────────────────────────────────────────────────────────────

export class StubTimelineRepository implements TimelineRepository {
	async getByProject(): Promise<unknown[]> {
		throw new Error("StubTimelineRepository.getByProject not implemented");
	}
	async getByScene(): Promise<unknown[]> {
		throw new Error("StubTimelineRepository.getByScene not implemented");
	}
	async create(): Promise<unknown> {
		throw new Error("StubTimelineRepository.create not implemented");
	}
	async update(): Promise<unknown> {
		throw new Error("StubTimelineRepository.update not implemented");
	}
	async delete(): Promise<void> {
		throw new Error("StubTimelineRepository.delete not implemented");
	}
}

// ── AI ────────────────────────────────────────────────────────────────────────

export class StubAiService implements AiService {
	async generateText(): Promise<AiPromptResult> {
		throw new Error("StubAiService.generateText not implemented");
	}
	async streamText(): Promise<void> {
		throw new Error("StubAiService.streamText not implemented");
	}
}

// ── Storage ───────────────────────────────────────────────────────────────────

export class StubStorageRepository implements StorageRepository {
	async listProviders(): Promise<StorageProviderConfig[]> {
		throw new Error("StubStorageRepository.listProviders not implemented");
	}
	async getProviderMeta(): Promise<StorageProviderConfig | null> {
		throw new Error("StubStorageRepository.getProviderMeta not implemented");
	}
	async getDefaultProviderId(): Promise<string | null> {
		throw new Error("StubStorageRepository.getDefaultProviderId not implemented");
	}
	async getSelectedProviderId(): Promise<string | null> {
		throw new Error("StubStorageRepository.getSelectedProviderId not implemented");
	}
	async setSelectedProviderId(): Promise<void> {
		throw new Error("StubStorageRepository.setSelectedProviderId not implemented");
	}
	async listContainers(): Promise<StorageContainer[]> {
		throw new Error("StubStorageRepository.listContainers not implemented");
	}
	async listFiles(): Promise<StorageFile[]> {
		throw new Error("StubStorageRepository.listFiles not implemented");
	}
	async uploadFile(): Promise<StorageFileInfo> {
		throw new Error("StubStorageRepository.uploadFile not implemented");
	}
	async deleteFile(): Promise<void> {
		throw new Error("StubStorageRepository.deleteFile not implemented");
	}
	async getUsage(): Promise<StorageUsageInfo> {
		throw new Error("StubStorageRepository.getUsage not implemented");
	}
}
