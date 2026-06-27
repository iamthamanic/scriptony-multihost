/**
 * Form body for VoiceProfileEditorModal (MVP 0.1 fields).
 * Location: src/components/characters/VoiceProfileEditorForm.tsx
 */

import { Loader2, Play } from "lucide-react";
import { CharacterVoiceSelector } from "@/components/audio/CharacterVoiceSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { mveDefaultPreviewForCharacter } from "@/lib/mve/default-preview-text";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import type { MveVoiceConsent } from "@/lib/multi-voice-engine/schema/voice-consent";
import { VoiceProfileFutureSections } from "./VoiceProfileFutureSections";

export interface VoiceProfileEditorFormProps {
  projectId: string;
  projectDir?: string;
  characterId: string;
  characterName: string;
  profile?: MveVoiceProfile | null;
  previewText: string;
  description: string;
  speed: number;
  voiceId?: string;
  isPlaying: boolean;
  generateBusy?: boolean;
  generateDisabled?: boolean;
  generateHint?: string;
  cloneBusy?: boolean;
  cloneDisabled?: boolean;
  latestConsent?: MveVoiceConsent | null;
  onPreviewTextChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSpeedChange: (value: number) => void;
  onPlayPreview: () => void;
  onVoiceAssignedProfile: (profile: MveVoiceProfile) => void;
  onSuggestFromDescription?: () => void;
  onCloneSubmit?: (
    file: File,
    options: { consentConfirmed: boolean; commercialUseAllowed: boolean },
  ) => void;
  onCloneRevoke?: () => void;
}

export function VoiceProfileEditorForm({
  projectId,
  projectDir,
  characterId,
  characterName,
  profile,
  previewText,
  description,
  speed,
  voiceId,
  isPlaying,
  generateBusy,
  generateDisabled,
  generateHint,
  cloneBusy,
  cloneDisabled,
  latestConsent,
  onPreviewTextChange,
  onDescriptionChange,
  onSpeedChange,
  onPlayPreview,
  onVoiceAssignedProfile,
  onSuggestFromDescription,
  onCloneSubmit,
  onCloneRevoke,
}: VoiceProfileEditorFormProps) {
  return (
    <div className="space-y-4 py-1">
      <CharacterVoiceSelector
        projectId={projectId}
        projectDir={projectDir}
        characterId={characterId}
        characterName={characterName}
        profile={profile}
        previewText={previewText}
        onAssignedProfile={onVoiceAssignedProfile}
        showLabel
        label="Stimme (Kokoro lokal)"
      />

      <div className="space-y-1.5">
        <Label htmlFor="mve-preview-text" className="text-xs font-bold">
          Standard-Satz (Vorschau)
        </Label>
        <div className="flex gap-2">
          <Input
            id="mve-preview-text"
            value={previewText}
            onChange={(e) => onPreviewTextChange(e.target.value)}
            className="h-9 border-2 text-sm"
            placeholder={mveDefaultPreviewForCharacter(characterName)}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={!voiceId || isPlaying}
            onClick={onPlayPreview}
            aria-label="Vorschau abspielen"
          >
            {isPlaying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs font-bold">Geschwindigkeit</Label>
          <span className="text-xs text-muted-foreground tabular-nums">
            {speed.toFixed(2)}×
          </span>
        </div>
        <Slider
          min={0.5}
          max={2}
          step={0.05}
          value={[speed]}
          onValueChange={([v]) => onSpeedChange(v ?? 1)}
          aria-label="TTS-Geschwindigkeit"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="mve-voice-desc" className="text-xs font-bold">
          Beschreibung (optional)
        </Label>
        <Textarea
          id="mve-voice-desc"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={3}
          className="text-sm resize-none"
          placeholder="z. B. warme, ruhige Erzählerstimme mit leichtem Akzent"
        />
      </div>

      <VoiceProfileFutureSections
        description={description}
        profile={profile}
        latestConsent={latestConsent}
        generateBusy={generateBusy}
        generateDisabled={generateDisabled}
        generateHint={generateHint}
        cloneBusy={cloneBusy}
        cloneDisabled={cloneDisabled}
        onSuggestFromDescription={onSuggestFromDescription}
        onCloneSubmit={onCloneSubmit}
        onCloneRevoke={onCloneRevoke}
      />
    </div>
  );
}
