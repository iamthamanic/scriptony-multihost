/**
 * Cloud gym progress (user-scoped) — placeholder until Appwrite collections exist.
 * Route TBD; not project sync. Capability: feature.creative_gym.
 *
 * @note MVP-Skizze: Persistiert aktuell nur lokal. Die echte Cloud-POST-Integration
 *   folgt, sobald die Appwrite-Collection existiert. Die Factory schaltet bereits
 *   über requireCapability('feature.creative_gym') zwischen Local und Cloud.
 *
 * Location: src/modules/creative-gym/infrastructure/repositories/gym-progress-cloud-http.ts
 */

import type { GymProgressRepository } from "../../domain/ports/gym-progress-repository";
import type { SkillProfile } from "../../domain/types";
import { LocalGymProgressRepository } from "./local-gym-progress-repository";

/**
 * MVP: persist locally and queue cloud upload when API is ready.
 * Avoids silent failures while keeping CLOUD_SESSION gate in factory.
 */
export class CloudGymProgressRepository implements GymProgressRepository {
  private readonly local: LocalGymProgressRepository;

  constructor(userId: string) {
    this.local = new LocalGymProgressRepository(userId);
  }

  async getByUser(userId: string): Promise<SkillProfile | null> {
    return this.local.getByUser(userId);
  }

  async save(profile: SkillProfile): Promise<SkillProfile> {
    const saved = await this.local.save(profile);
    // TODO: POST user-scoped gym progress to Appwrite when collection exists
    return saved;
  }
}
