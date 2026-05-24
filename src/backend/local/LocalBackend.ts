/**
 * LocalBackend
 *
 * T35: Stub-Implementierung für lokalen Modus.
 * Reale Persistenz wird in späteren Tickets ergänzt.
 */

import type { ScriptonyBackend } from "../ScriptonyBackend";
import type { AuthClient } from "@/lib/auth/AuthClient";

import { LocalProjectRepository } from "./LocalProjectRepository";
import { LocalAudioRepository } from "./LocalAudioRepository";
import { LocalAssetRepository } from "./LocalAssetRepository";
import { LocalJobService } from "./LocalJobService";

import {
	StubStructureRepository,
	StubScriptRepository,
	StubCharacterRepository,
	StubWorldbuildingRepository,
	StubTimelineRepository,
	StubAiService,
	StubStorageRepository,
} from "../appwrite/stubs";

export class LocalBackend implements ScriptonyBackend {
	readonly auth: AuthClient;
	readonly projects = new LocalProjectRepository();
	readonly structure = new StubStructureRepository();
	readonly scripts = new StubScriptRepository();
	readonly characters = new StubCharacterRepository();
	readonly worldbuilding = new StubWorldbuildingRepository();
	readonly timeline = new StubTimelineRepository();
	readonly audio = new LocalAudioRepository();
	readonly assets = new LocalAssetRepository();
	readonly jobs = new LocalJobService();
	readonly ai = new StubAiService();
	readonly storage = new StubStorageRepository();

	constructor(auth: AuthClient) {
		this.auth = auth;
	}
}
