/**
 * LocalBackend — SQLite-backed domain backend for an open .scriptony project.
 *
 * T38/T39: Requires LocalProjectContext (file-backed DB + manifest).
 */

import type { ScriptonyBackend } from "../ScriptonyBackend";
import type { AuthClient } from "@/lib/auth/AuthClient";
import type { LocalProjectContext } from "./LocalProjectContext";
import { LocalProjectRepository } from "./LocalProjectRepository";
import { LocalStructureRepository } from "./LocalStructureRepository";
import { LocalScriptRepository } from "./LocalScriptRepository";
import { LocalAudioRepository } from "./LocalAudioRepository";
import { LocalAssetRepository } from "./LocalAssetRepository";
import { LocalStorageService } from "./LocalStorageService";
import { LocalJobService } from "./LocalJobService";
import { LocalBlenderService } from "./LocalBlenderService";
import { LocalCharacterRepository } from "./LocalCharacterRepository";
import { LocalWorldbuildingRepository } from "./LocalWorldbuildingRepository";
import { LocalTimelineRepository } from "./LocalTimelineRepository";
import { StubAiService, StubStorageRepository } from "../appwrite/stubs";

export class LocalBackend implements ScriptonyBackend {
  readonly auth: AuthClient;
  readonly projects: LocalProjectRepository;
  readonly structure: LocalStructureRepository;
  readonly scripts: LocalScriptRepository;
  readonly characters: LocalCharacterRepository;
  readonly worldbuilding: LocalWorldbuildingRepository;
  readonly timeline: LocalTimelineRepository;
  readonly audio: LocalAudioRepository;
  readonly assets: LocalAssetRepository;
  readonly jobs: LocalJobService;
  readonly ai = new StubAiService();
  readonly storage = new StubStorageRepository();
  readonly blender = new LocalBlenderService();

  /** Active local project session (manifest + persist). */
  readonly localProject: LocalProjectContext;

  constructor(auth: AuthClient, localProject: LocalProjectContext) {
    this.auth = auth;
    this.localProject = localProject;
    const storage = new LocalStorageService(localProject.dirPath);
    this.projects = new LocalProjectRepository(localProject.db);
    this.structure = new LocalStructureRepository(localProject.db);
    this.scripts = new LocalScriptRepository(localProject.db);
    this.characters = new LocalCharacterRepository(localProject.db);
    this.worldbuilding = new LocalWorldbuildingRepository(localProject.db);
    this.timeline = new LocalTimelineRepository(localProject.db);
    this.audio = new LocalAudioRepository(localProject.db);
    this.assets = new LocalAssetRepository(
      localProject.db,
      localProject.dirPath,
      storage,
    );
    this.jobs = new LocalJobService(localProject.db, localProject.projectId);
  }
}
