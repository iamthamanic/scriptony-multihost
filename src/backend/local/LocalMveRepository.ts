/**
 * LocalMveRepository — facade over line + lane link + voice profile + render SQLite repos.
 * Location: src/backend/local/LocalMveRepository.ts
 */

import type {
  MveAudioJobCreatePayload,
  MveAudioJobUpdatePayload,
  MveLaneLinkCreatePayload,
  MveLaneLinkUpdatePayload,
  MveLineCreatePayload,
  MveLineUpdatePayload,
  MveRepository,
  MveTakeCreatePayload,
  MveTakeUpdatePayload,
  MveVoiceProfileCreatePayload,
  MveVoiceProfileUpdatePayload,
  MveVoiceConsentCreatePayload,
  MveVoiceConsentUpdatePayload,
  MveVoiceRequestCreatePayload,
  MveVoiceRequestUpdatePayload,
} from "../ScriptonyBackend";
import type { LocalDb } from "./LocalDb";
import type { MveAudioJob } from "@/lib/multi-voice-engine/schema/audio-job";
import type { MveLaneLink } from "@/lib/multi-voice-engine/schema/lane-link";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { MveTake } from "@/lib/multi-voice-engine/schema/take";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import type { MveVoiceConsent } from "@/lib/multi-voice-engine/schema/voice-consent";
import type { MveVoiceRequest } from "@/lib/multi-voice-engine/schema/voice-operations";
import {
  ensureMveRenderTables,
  ensureMveTables,
  ensureMveVoiceStudioTables,
} from "@/local/schema-migrations";
import { LocalMveAudioJobRepository } from "./LocalMveAudioJobRepository";
import { LocalMveLaneLinkRepository } from "./LocalMveLaneLinkRepository";
import { LocalMveLineRepository } from "./LocalMveLineRepository";
import { LocalMveTakeRepository } from "./LocalMveTakeRepository";
import { LocalMveVoiceProfileRepository } from "./LocalMveVoiceProfileRepository";
import { LocalMveVoiceConsentRepository } from "./LocalMveVoiceConsentRepository";
import { LocalMveVoiceRequestRepository } from "./LocalMveVoiceRequestRepository";

export class LocalMveRepository implements MveRepository {
  private readonly lines: LocalMveLineRepository;
  private readonly laneLinks: LocalMveLaneLinkRepository;
  private readonly voiceProfiles: LocalMveVoiceProfileRepository;
  private readonly voiceConsents: LocalMveVoiceConsentRepository;
  private readonly voiceRequests: LocalMveVoiceRequestRepository;
  private readonly audioJobs: LocalMveAudioJobRepository;
  private readonly takes: LocalMveTakeRepository;
  private readonly schemaReady: Promise<void>;

  constructor(db: LocalDb) {
    this.lines = new LocalMveLineRepository(db);
    this.laneLinks = new LocalMveLaneLinkRepository(db);
    this.voiceProfiles = new LocalMveVoiceProfileRepository(db);
    this.voiceConsents = new LocalMveVoiceConsentRepository(db);
    this.voiceRequests = new LocalMveVoiceRequestRepository(db);
    this.audioJobs = new LocalMveAudioJobRepository(db);
    this.takes = new LocalMveTakeRepository(db);
    this.schemaReady = Promise.all([
      ensureMveTables(db),
      ensureMveRenderTables(db),
      ensureMveVoiceStudioTables(db),
    ]).then(() => undefined);
  }

  private ready<T>(fn: () => Promise<T>): Promise<T> {
    return this.schemaReady.then(fn);
  }

  listLines(projectId: string): Promise<MveLine[]> {
    return this.ready(() => this.lines.listByProject(projectId));
  }

  listLinesByScene(sceneId: string): Promise<MveLine[]> {
    return this.ready(() => this.lines.listByScene(sceneId));
  }

  getLine(id: string): Promise<MveLine | null> {
    return this.ready(() => this.lines.get(id));
  }

  getLineByAudioClipId(clipId: string): Promise<MveLine | null> {
    return this.ready(() => this.lines.getByAudioClipId(clipId));
  }

  createLine(
    projectId: string,
    payload: MveLineCreatePayload,
  ): Promise<MveLine> {
    return this.ready(() => this.lines.create(projectId, payload));
  }

  updateLine(id: string, patch: MveLineUpdatePayload): Promise<MveLine> {
    return this.ready(() => this.lines.update(id, patch));
  }

  deleteLine(id: string): Promise<void> {
    return this.ready(() => this.lines.delete(id));
  }

  listLaneLinks(projectId: string): Promise<MveLaneLink[]> {
    return this.laneLinks.listByProject(projectId);
  }

  getLaneLink(id: string): Promise<MveLaneLink | null> {
    return this.laneLinks.get(id);
  }

  getLaneLinkForCharacter(
    projectId: string,
    characterId: string,
  ): Promise<MveLaneLink | null> {
    return this.laneLinks.getForCharacter(projectId, characterId);
  }

  createLaneLink(
    projectId: string,
    payload: MveLaneLinkCreatePayload,
  ): Promise<MveLaneLink> {
    return this.laneLinks.create(projectId, payload);
  }

  updateLaneLink(
    id: string,
    patch: MveLaneLinkUpdatePayload,
  ): Promise<MveLaneLink> {
    return this.laneLinks.update(id, patch);
  }

  deleteLaneLink(id: string): Promise<void> {
    return this.laneLinks.delete(id);
  }

  listVoiceProfiles(projectId: string): Promise<MveVoiceProfile[]> {
    return this.ready(() => this.voiceProfiles.listByProject(projectId));
  }

  getVoiceProfile(id: string): Promise<MveVoiceProfile | null> {
    return this.ready(() => this.voiceProfiles.get(id));
  }

  getVoiceProfileForCharacter(
    projectId: string,
    characterId: string,
  ): Promise<MveVoiceProfile | null> {
    return this.ready(() =>
      this.voiceProfiles.getForCharacter(projectId, characterId),
    );
  }

  createVoiceProfile(
    projectId: string,
    payload: MveVoiceProfileCreatePayload,
  ): Promise<MveVoiceProfile> {
    return this.ready(() => this.voiceProfiles.create(projectId, payload));
  }

  updateVoiceProfile(
    id: string,
    patch: MveVoiceProfileUpdatePayload,
  ): Promise<MveVoiceProfile> {
    return this.ready(() => this.voiceProfiles.update(id, patch));
  }

  deleteVoiceProfile(id: string): Promise<void> {
    return this.ready(() => this.voiceProfiles.delete(id));
  }

  listAudioJobsByLine(lineId: string): Promise<MveAudioJob[]> {
    return this.ready(() => this.audioJobs.listByLine(lineId));
  }

  getAudioJob(id: string): Promise<MveAudioJob | null> {
    return this.ready(() => this.audioJobs.get(id));
  }

  createAudioJob(
    projectId: string,
    payload: MveAudioJobCreatePayload,
  ): Promise<MveAudioJob> {
    return this.ready(() => this.audioJobs.create(projectId, payload));
  }

  updateAudioJob(
    id: string,
    patch: MveAudioJobUpdatePayload,
  ): Promise<MveAudioJob> {
    return this.ready(() => this.audioJobs.update(id, patch));
  }

  listTakesByLine(lineId: string): Promise<MveTake[]> {
    return this.ready(() => this.takes.listByLine(lineId));
  }

  listTakesByJob(jobId: string): Promise<MveTake[]> {
    return this.ready(() => this.takes.listByJob(jobId));
  }

  getTake(id: string): Promise<MveTake | null> {
    return this.ready(() => this.takes.get(id));
  }

  createTake(
    projectId: string,
    payload: MveTakeCreatePayload,
  ): Promise<MveTake> {
    return this.ready(() => this.takes.create(projectId, payload));
  }

  updateTake(id: string, patch: MveTakeUpdatePayload): Promise<MveTake> {
    return this.ready(() => this.takes.update(id, patch));
  }

  selectTake(lineId: string, takeId: string): Promise<MveTake> {
    return this.ready(() => this.takes.selectTake(lineId, takeId));
  }

  listVoiceConsents(projectId: string): Promise<MveVoiceConsent[]> {
    return this.ready(() => this.voiceConsents.listByProject(projectId));
  }

  listVoiceConsentsByVoice(voiceId: string): Promise<MveVoiceConsent[]> {
    return this.ready(() => this.voiceConsents.listByVoice(voiceId));
  }

  getVoiceConsent(id: string): Promise<MveVoiceConsent | null> {
    return this.ready(() => this.voiceConsents.get(id));
  }

  getLatestVerifiedVoiceConsent(
    voiceId: string,
  ): Promise<MveVoiceConsent | null> {
    return this.ready(() => this.voiceConsents.getLatestVerifiedForVoice(voiceId));
  }

  createVoiceConsent(
    projectId: string,
    payload: MveVoiceConsentCreatePayload,
  ): Promise<MveVoiceConsent> {
    return this.ready(() => this.voiceConsents.create(projectId, payload));
  }

  updateVoiceConsent(
    id: string,
    patch: MveVoiceConsentUpdatePayload,
  ): Promise<MveVoiceConsent> {
    return this.ready(() => this.voiceConsents.update(id, patch));
  }

  deleteVoiceConsent(id: string): Promise<void> {
    return this.ready(() => this.voiceConsents.delete(id));
  }

  listVoiceRequests(projectId: string): Promise<MveVoiceRequest[]> {
    return this.ready(() => this.voiceRequests.listByProject(projectId));
  }

  getVoiceRequest(id: string): Promise<MveVoiceRequest | null> {
    return this.ready(() => this.voiceRequests.get(id));
  }

  createVoiceRequest(
    projectId: string,
    payload: MveVoiceRequestCreatePayload,
  ): Promise<MveVoiceRequest> {
    return this.ready(() => this.voiceRequests.create(projectId, payload));
  }

  updateVoiceRequest(
    id: string,
    patch: MveVoiceRequestUpdatePayload,
  ): Promise<MveVoiceRequest> {
    return this.ready(() => this.voiceRequests.update(id, patch));
  }

  deleteVoiceRequest(id: string): Promise<void> {
    return this.ready(() => this.voiceRequests.delete(id));
  }
}
