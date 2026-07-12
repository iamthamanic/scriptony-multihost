/**
 * Build frozen MVE line render snapshot (PRD §25.2).
 * Location: src/lib/multi-voice-engine/render/create-render-snapshot.ts
 */

import type { MveLineRenderSnapshot } from "../schema/audio-job";
import type { MveLine } from "../schema/line";
import type { MveVoiceProfile } from "../schema/voice-profile";

export function createMveLineRenderSnapshot(
  line: MveLine,
  voice: MveVoiceProfile,
): MveLineRenderSnapshot {
  return {
    line: {
      ...line,
      direction: line.direction ? { ...line.direction } : undefined,
    },
    voice: { ...voice },
    direction: line.direction ? { ...line.direction } : undefined,
  };
}
