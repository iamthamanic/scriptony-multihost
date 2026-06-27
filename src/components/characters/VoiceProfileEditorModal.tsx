/**
 * MVE voice editor modal — all voice settings for a character (MVP 0.1).
 * Location: src/components/characters/VoiceProfileEditorModal.tsx
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMveVoicePreview } from "@/hooks/useMveVoicePreview";
import { useSaveVoiceProfile } from "@/hooks/useSaveVoiceProfile";
import { useLocalVoices } from "@/hooks/useLocalVoices";
import { generateVoiceFromDescription } from "@/lib/mve/casting/generate-voice-from-description";
import { createTunedVoiceProfile } from "@/lib/mve/tune/create-tuned-voice-profile";
import { getMveVoiceProfile } from "@/lib/api-adapter/mve-adapter";
import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import { KOKORO_VOICE_CATALOG } from "@/lib/api/kokoro-voice-catalog";
import { mveDefaultPreviewForCharacter } from "@/lib/mve/default-preview-text";
import { resolveMveTtsVoiceId } from "@/lib/mve/resolve-tts-voice-id";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import { VoiceProfileEditorForm } from "./VoiceProfileEditorForm";
import type { VoiceTuneSubmitOptions } from "./VoiceStudioTuneSection";

export interface VoiceProfileEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectDir?: string;
  characterId: string;
  characterName: string;
  profile?: MveVoiceProfile | null;
  onSaved: () => void;
}

export function VoiceProfileEditorModal({
  open,
  onOpenChange,
  projectId,
  projectDir,
  characterId,
  characterName,
  profile,
  onSaved,
}: VoiceProfileEditorModalProps) {
  const [activeProfile, setActiveProfile] = useState<MveVoiceProfile | null>(
    profile ?? null,
  );
  const [previewText, setPreviewText] = useState(
    profile?.previewText ?? mveDefaultPreviewForCharacter(characterName),
  );
  const [description, setDescription] = useState(profile?.description ?? "");
  const [speed, setSpeed] = useState(profile?.defaultSettings?.speed ?? 1);
  const [generateHint, setGenerateHint] = useState<string | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTuneBusy, setIsTuneBusy] = useState(false);
  const [tuneSourceProfile, setTuneSourceProfile] =
    useState<MveVoiceProfile | null>(null);

  const localVoices = useLocalVoices({
    projectDir,
    enabled: open && Boolean(projectDir),
  });

  const refreshSaved = useCallback(() => onSaved(), [onSaved]);
  const { playPreview, isPlaying } = useMveVoicePreview();
  const { saveVoiceProfile, isSaving } = useSaveVoiceProfile(refreshSaved);

  useEffect(() => {
    if (!open) return;
    setActiveProfile(profile ?? null);
    setPreviewText(
      profile?.previewText ?? mveDefaultPreviewForCharacter(characterName),
    );
    setDescription(profile?.description ?? "");
    setSpeed(profile?.defaultSettings?.speed ?? 1);
    setGenerateHint(undefined);
    setTuneSourceProfile(null);
  }, [open, profile, characterName]);

  useEffect(() => {
    if (
      !open ||
      activeProfile?.type !== "tuned" ||
      !activeProfile.baseVoiceId
    ) {
      setTuneSourceProfile(null);
      return;
    }
    void getMveVoiceProfile(activeProfile.baseVoiceId).then(
      setTuneSourceProfile,
    );
  }, [open, activeProfile?.type, activeProfile?.baseVoiceId]);

  const voiceId = resolveMveTtsVoiceId(activeProfile, tuneSourceProfile);

  const handleVoiceAssigned = useCallback(
    (assigned: MveVoiceProfile) => {
      setActiveProfile(assigned);
      refreshSaved();
    },
    [refreshSaved],
  );

  const handleSave = async () => {
    if (!activeProfile?.id) {
      return;
    }
    const ok = await saveVoiceProfile({
      profileId: activeProfile.id,
      previewText,
      description,
      defaultSettings: { speed },
    });
    if (ok) onOpenChange(false);
  };

  const catalogVoices = localVoices.data?.voices?.length
    ? localVoices.data.voices
    : KOKORO_VOICE_CATALOG;

  const handleSuggestFromDescription = useCallback(async () => {
    if (!description.trim()) return;

    if (localVoices.data && !localVoices.data.kokoroReady) {
      toast.error(
        localVoices.data.kokoroError ??
          "Kokoro ist noch nicht bereit — Vorschau ggf. erst nach Sidecar-Start.",
      );
    }

    setIsGenerating(true);
    setGenerateHint(undefined);
    try {
      const result = await generateVoiceFromDescription({
        projectId,
        characterId,
        characterName,
        description,
        voices: catalogVoices,
        existingProfile: activeProfile,
        previewText,
      });
      setActiveProfile(result.profile);
      setGenerateHint(result.hint);
      refreshSaved();
      toast.success(
        `Stimme zugeordnet: ${result.matchedVoice.name}${result.weakMatch ? " (Näherung)" : ""}`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Stimme konnte nicht zugeordnet werden.",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    activeProfile,
    catalogVoices,
    characterId,
    characterName,
    description,
    localVoices.data,
    previewText,
    projectId,
    refreshSaved,
  ]);

  const handleTuneSubmit = useCallback(
    async (options: VoiceTuneSubmitOptions) => {
      if (!isLocalProfile()) {
        toast.error("Voice Tune ist nur lokal verfügbar.");
        return;
      }
      if (!activeProfile?.id || activeProfile.type === "tuned") {
        toast.error("Bitte zuerst eine Basis-Stimme wählen oder erzeugen.");
        return;
      }
      setIsTuneBusy(true);
      try {
        const tuned = await createTunedVoiceProfile({
          projectId,
          baseProfile: activeProfile,
          tuneDescription: options.tuneDescription,
          overrides: {
            pitch: options.pitch,
            pace: options.pace,
            energy: options.energy,
            speed: options.speed,
          },
        });
        setActiveProfile(tuned);
        setSpeed(tuned.defaultSettings?.speed ?? options.speed);
        setDescription(tuned.description ?? "");
        refreshSaved();
        toast.success("Getunte Stimme erstellt — Original unverändert.");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Tune fehlgeschlagen.",
        );
      } finally {
        setIsTuneBusy(false);
      }
    },
    [activeProfile, projectId, refreshSaved],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Charakterstimme — {characterName}</DialogTitle>
          <DialogDescription>
            Stimme zuweisen, Vorschau-Satz und Basis-Einstellungen für diesen
            Charakter.
          </DialogDescription>
        </DialogHeader>

        <VoiceProfileEditorForm
          projectId={projectId}
          projectDir={projectDir}
          characterId={characterId}
          characterName={characterName}
          profile={activeProfile}
          previewText={previewText}
          description={description}
          speed={speed}
          voiceId={voiceId}
          isPlaying={isPlaying}
          generateBusy={isGenerating}
          generateDisabled={localVoices.isLoading}
          generateHint={generateHint}
          tuneBusy={isTuneBusy}
          tuneDisabled={!isLocalProfile()}
          onPreviewTextChange={setPreviewText}
          onDescriptionChange={setDescription}
          onSpeedChange={setSpeed}
          onPlayPreview={() =>
            playPreview({
              projectDir,
              voiceId,
              characterName,
              previewText,
              speed,
            })
          }
          onVoiceAssignedProfile={handleVoiceAssigned}
          onSuggestFromDescription={() => void handleSuggestFromDescription()}
          onTuneSubmit={(options) => void handleTuneSubmit(options)}
        />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || !activeProfile?.id}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Speichern…
              </>
            ) : (
              "Speichern"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
