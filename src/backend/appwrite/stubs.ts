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
	async generateText(_payload: AiPromptPayload): Promise<AiPromptResult> {
		console.warn("[StubAiService] AI wird im Offline-Modus nicht unterstützt. Bitte melde dich an, um Cloud-KI zu nutzen.");
		return { text: "[Offline-Modus: KI nicht verfügbar]" };
	}
	async streamText(_payload: AiPromptPayload, _onChunk: (chunk: string) => void): Promise<void> {
		console.warn("[StubAiService] Streaming wird im Offline-Modus nicht unterstützt.");
	}
}

// ── Storage ───────────────────────────────────────────────────────────────────

export class StubStorageRepository implements StorageRepository {
	async listProviders(): Promise<StorageProviderConfig[]> {
		return [];
	}
	async getProviderMeta(_providerId: string): Promise<StorageProviderConfig | null> {
		return null;
	}
	async getDefaultProviderId(): Promise<string | null> {
		return null;
	}
	async getSelectedProviderId(): Promise<string | null> {
		return null;
	}
	async setSelectedProviderId(_id: string): Promise<void> {
		/* no-op */
	}
	async listContainers(_providerId: string, _bucket: StorageBucketKind): Promise<StorageContainer[]> {
		return [];
	}
	async listFiles(_providerId: string, _containerId: string): Promise<StorageFile[]> {
		return [];
	}
	async uploadFile(_providerId: string, _containerId: string, _file: File): Promise<StorageFileInfo> {
		throw new Error("Upload ist nur im Online-Modus verfügbar. Bitte melde dich an.");
	}
	async deleteFile(_providerId: string, _fileId: string): Promise<void> {
		/* no-op */
	}
	async getUsage(_providerId: string): Promise<StorageUsageInfo> {
		return { usedBytes: 0, totalBytes: 0, fileCount: 0 };
	}
}
