/**
 * Compact character voice row (mockup): label + status + Play + Edit.
 * Location: src/components/characters/CharacterVoiceRow.tsx
 */

import { useCallback, useState } from "react";
import { Loader2, Pencil, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMveVoicePreview } from "@/hooks/useMveVoicePreview";
import { useTtsVoiceProfiles } from "@/hooks/useTtsVoiceProfiles";
import { mveDefaultPreviewForCharacter } from "@/lib/mve/default-preview-text";
import { resolveMveTtsVoiceId } from "@/lib/mve/resolve-tts-voice-id";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import { VoiceProfileEditorModal } from "./VoiceProfileEditorModal";

export interface CharacterVoiceRowProps {
  projectId: string;
  projectDir?: string;
  characterId: string;
  characterName: string;
  profile?: MveVoiceProfile | null;
  onVoiceChange: () => void;
}

export function CharacterVoiceRow({
  projectId,
  projectDir,
  characterId,
  characterName,
  profile,
  onVoiceChange,
}: CharacterVoiceRowProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const onSaved = useCallback(() => onVoiceChange(), [onVoiceChange]);
  const { playPreview, isPlaying } = useMveVoicePreview();
  const { data: voicesData } = useTtsVoiceProfiles({
    enabled: Boolean(projectDir),
    projectDir,
  });
  const voices = voicesData?.voices ?? [];

  const voiceId = resolveMveTtsVoiceId(profile);
  const selectedVoice = voices.find((v) => v.id === voiceId);
  const previewText =
    profile?.previewText ?? mveDefaultPreviewForCharacter(characterName);
  const voiceLabel = selectedVoice
    ? selectedVoice.name
    : voiceId
      ? "Stimme zugewiesen"
      : "nicht zugewiesen";

  return (
    <>
      <div className="mb-3 flex items-center gap-2 rounded-md border border-border bg-muted/15 px-2.5 py-2">
        <span className="text-xs font-semibold text-foreground shrink-0">
          Charakterstimme
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {voiceLabel}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          disabled={!voiceId || isPlaying}
          onClick={() =>
            playPreview({
              projectDir,
              voiceId,
              characterName,
              previewText,
              speed: profile?.defaultSettings?.speed,
            })
          }
          aria-label="Charakterstimme abspielen"
        >
          {isPlaying ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => setModalOpen(true)}
          aria-label="Charakterstimme bearbeiten"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>

      <VoiceProfileEditorModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        projectId={projectId}
        projectDir={projectDir}
        characterId={characterId}
        characterName={characterName}
        profile={profile}
        onSaved={onSaved}
      />
    </>
  );
}
