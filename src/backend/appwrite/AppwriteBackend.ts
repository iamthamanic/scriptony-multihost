/**
 * AppwriteBackend
 *
 * T35: Implementierung von ScriptonyBackend für Appwrite.
 * Nutzt intern src/lib/api/* und src/lib/appwrite/*.
 */

import type { ScriptonyBackend } from "../ScriptonyBackend";
import type { AuthClient } from "@/lib/auth/AuthClient";

import { AppwriteProjectRepository } from "./AppwriteProjectRepository";
import { AppwriteStructureRepository } from "./AppwriteStructureRepository";
import { AppwriteAudioRepository } from "./AppwriteAudioRepository";
import { AppwriteAssetRepository } from "./AppwriteAssetRepository";
import { AppwriteJobService } from "./AppwriteJobService";
import { AppwriteBlenderService } from "./AppwriteBlenderService";
import { AppwriteCharacterRepository } from "./AppwriteCharacterRepository";
import { AppwriteTimelineRepository } from "./AppwriteTimelineRepository";

import {
	StubScriptRepository,
	StubWorldbuildingRepository,
	StubBeatRepository,
} from "./stubs";
import { HybridAiService, HybridStorageRepository } from "../hybrid";

export class AppwriteBackend implements ScriptonyBackend {
	readonly auth: AuthClient;
	readonly projects: AppwriteProjectRepository;
	readonly structure: AppwriteStructureRepository;
	readonly scripts = new StubScriptRepository();
	readonly characters = new AppwriteCharacterRepository();
	readonly worldbuilding = new StubWorldbuildingRepository();
	readonly timeline = new AppwriteTimelineRepository();
	readonly audio = new AppwriteAudioRepository();
	readonly assets = new AppwriteAssetRepository();
	readonly jobs = new AppwriteJobService();
	readonly ai = new HybridAiService();
	readonly storage = new HybridStorageRepository();
	readonly beats = new StubBeatRepository();
	readonly blender = new AppwriteBlenderService();

	constructor(auth: AuthClient) {
		this.auth = auth;
		this.projects = new AppwriteProjectRepository(auth);
		this.structure = new AppwriteStructureRepository(auth);
	}
}
