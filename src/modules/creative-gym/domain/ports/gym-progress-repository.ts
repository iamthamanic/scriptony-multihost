/**
 * Gym progress port — user-scoped, not project sync (Axis 3).
 * Location: src/modules/creative-gym/domain/ports/gym-progress-repository.ts
 */

import type { SkillProfile } from "../types";

export interface GymProgressRepository {
  getByUser(userId: string): Promise<SkillProfile | null>;
  save(profile: SkillProfile): Promise<SkillProfile>;
}
