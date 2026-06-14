/**
 * Factory: local gym progress vs cloud-backed (session required).
 * Location: src/modules/creative-gym/infrastructure/repositories/create-gym-progress-repository.ts
 */

import { requireCapability } from "@/capabilities/registry";
import type { GymProgressRepository } from "../../domain/ports/gym-progress-repository";
import { CloudGymProgressRepository } from "./gym-progress-cloud-http";
import { LocalGymProgressRepository } from "./local-gym-progress-repository";

export async function createGymProgressRepository(
  userId: string,
): Promise<GymProgressRepository> {
  try {
    await requireCapability("feature.creative_gym");
    return new CloudGymProgressRepository(userId);
  } catch (err) {
    console.warn(
      "[CreativeGym] Cloud repository unavailable, using local storage:",
      err,
    );
    return new LocalGymProgressRepository(userId);
  }
}
