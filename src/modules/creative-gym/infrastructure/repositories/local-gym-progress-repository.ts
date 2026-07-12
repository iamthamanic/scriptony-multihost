/**
 * Local gym progress via localStorage (offline-first).
 * Location: src/modules/creative-gym/infrastructure/repositories/local-gym-progress-repository.ts
 */

import type { GymProgressRepository } from "../../domain/ports/gym-progress-repository";
import { LocalSkillProfileRepository } from "./local-skill-profile-repository";

export class LocalGymProgressRepository implements GymProgressRepository {
  private readonly inner: LocalSkillProfileRepository;

  constructor(userId: string) {
    this.inner = new LocalSkillProfileRepository(userId);
  }

  getByUser(userId: string) {
    return this.inner.getByUser(userId);
  }

  save(profile: import("../../domain/types").SkillProfile) {
    return this.inner.save(profile);
  }
}
