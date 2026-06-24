/**
 * Save MVE voice profile metadata (preview text, description, settings).
 * Location: src/hooks/useSaveVoiceProfile.ts
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { updateMveVoiceProfile } from "@/lib/api-adapter/mve-adapter";
import type { MveVoiceRenderSettings } from "@/lib/multi-voice-engine/schema/voice-profile";

export function useSaveVoiceProfile(onSaved?: () => void) {
  const [isSaving, setIsSaving] = useState(false);

  const saveVoiceProfile = useCallback(
    async (params: {
      profileId: string;
      previewText: string;
      description: string;
      defaultSettings: MveVoiceRenderSettings;
    }) => {
      const trimmedPreview = params.previewText.trim();
      if (!trimmedPreview) {
        toast.error("Bitte einen Standard-Satz für die Vorschau eingeben.");
        return false;
      }
      setIsSaving(true);
      try {
        await updateMveVoiceProfile(params.profileId, {
          previewText: trimmedPreview,
          description: params.description.trim() || null,
          defaultSettings: params.defaultSettings,
        });
        toast.success("Stimme gespeichert");
        onSaved?.();
        return true;
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Speichern fehlgeschlagen.",
        );
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [onSaved],
  );

  return { saveVoiceProfile, isSaving };
}
