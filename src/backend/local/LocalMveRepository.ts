/**
 * LocalMveRepository — facade over line + voice profile SQLite repos.
 * Location: src/backend/local/LocalMveRepository.ts
 */

import type {
  MveLineCreatePayload,
  MveLineUpdatePayload,
  MveRepository,
  MveVoiceProfileCreatePayload,
  MveVoiceProfileUpdatePayload,
} from "../ScriptonyBackend";
import type { LocalDb } from "./LocalDb";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import { LocalMveLineRepository } from "./LocalMveLineRepository";
import { LocalMveVoiceProfileRepository } from "./LocalMveVoiceProfileRepository";

export class LocalMveRepository implements MveRepository {
  private readonly lines: LocalMveLineRepository;
  private readonly voiceProfiles: LocalMveVoiceProfileRepository;

  constructor(db: LocalDb) {
    this.lines = new LocalMveLineRepository(db);
    this.voiceProfiles = new LocalMveVoiceProfileRepository(db);
  }

  listLines(projectId: string): Promise<MveLine[]> {
    return this.lines.listByProject(projectId);
  }

  listLinesByScene(sceneId: string): Promise<MveLine[]> {
    return this.lines.listByScene(sceneId);
  }

  getLine(id: string): Promise<MveLine | null> {
    return this.lines.get(id);
  }

  getLineByAudioClipId(clipId: string): Promise<MveLine | null> {
    return this.lines.getByAudioClipId(clipId);
  }

  createLine(
    projectId: string,
    payload: MveLineCreatePayload,
  ): Promise<MveLine> {
    return this.lines.create(projectId, payload);
  }

  updateLine(id: string, patch: MveLineUpdatePayload): Promise<MveLine> {
    return this.lines.update(id, patch);
  }

  deleteLine(id: string): Promise<void> {
    return this.lines.delete(id);
  }

  listVoiceProfiles(projectId: string): Promise<MveVoiceProfile[]> {
    return this.voiceProfiles.listByProject(projectId);
  }

  getVoiceProfile(id: string): Promise<MveVoiceProfile | null> {
    return this.voiceProfiles.get(id);
  }

  getVoiceProfileForCharacter(
    projectId: string,
    characterId: string,
  ): Promise<MveVoiceProfile | null> {
    return this.voiceProfiles.getForCharacter(projectId, characterId);
  }

  createVoiceProfile(
    projectId: string,
    payload: MveVoiceProfileCreatePayload,
  ): Promise<MveVoiceProfile> {
    return this.voiceProfiles.create(projectId, payload);
  }

  updateVoiceProfile(
    id: string,
    patch: MveVoiceProfileUpdatePayload,
  ): Promise<MveVoiceProfile> {
    return this.voiceProfiles.update(id, patch);
  }

  deleteVoiceProfile(id: string): Promise<void> {
    return this.voiceProfiles.delete(id);
  }
}
