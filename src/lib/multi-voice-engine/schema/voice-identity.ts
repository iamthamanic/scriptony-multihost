/**
 * Voice identity helpers — creationMode defaults from legacy profile type.
 * Location: src/lib/multi-voice-engine/schema/voice-identity.ts
 */

import type { MveVoiceCreationMode, MveVoiceProfileType } from "./enums";

export function inferCreationModeFromProfileType(
  type: MveVoiceProfileType | string | undefined,
): MveVoiceCreationMode {
  switch (type) {
    case "generated":
      return "designed";
    case "cloned":
      return "cloned";
    case "uploaded":
      return "recorded";
    case "default":
    case "tuned":
    case "licensed":
    case "external_api":
    default:
      return "preset";
  }
}
