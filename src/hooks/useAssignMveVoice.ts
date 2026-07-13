/**
 * Assign / upsert MVE voice profile for a character (mutation hook).
 * Location: src/hooks/useAssignMveVoice.ts
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { assignMveVoiceToCharacter } from "@/lib/mve/assign-voice-profile";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";

export function useAssignMveVoice(onSuccess?: () => void) {
  const [isSaving, setIsSaving] = useState(false);

  const assignVoice = useCallback(
    async (params: {
      projectId: string;
      characterId: string;
      characterName: string;
      voiceId: string;
      engine?: string;
      previewText?: string;
      existingProfile?: MveVoiceProfile | null;
    }): Promise<MveVoiceProfile | null> => {
      setIsSaving(true);
      try {
        const profile = await assignMveVoiceToCharacter(params);
        toast.success("Stimme zugewiesen");
        onSuccess?.();
        return profile;
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Stimme konnte nicht zugewiesen werden.",
        );
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [onSuccess],
  );

  return { assignVoice, isSaving };
}
