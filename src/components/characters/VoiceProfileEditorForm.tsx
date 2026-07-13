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
import { mveDefaultPreviewForCharacter } from "@/lib/mve/default-preview-text";
import {
  isProfileVoiceProvider,
  resolveVoiceProviderId,
  type VoiceProviderId,
} from "@/lib/config/voice-providers";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import type { MveVoiceConsent } from "@/lib/multi-voice-engine/schema/voice-consent";
import {
  emptyVoiceDesignSpec,
  type MveVoiceDesignSpec,
} from "@/lib/multi-voice-engine/schema/voice-design-spec";
import type { VoiceDesignCandidate } from "@/lib/mve/casting/voice-design-candidate";
import { VoiceDesignDescriptionPanel } from "./VoiceDesignDescriptionPanel";
import { VoiceProfileFutureSections } from "./VoiceProfileFutureSections";
import type { VoiceTuneSubmitOptions } from "./VoiceStudioTuneSection";

export interface VoiceProfileEditorFormProps {
  projectId: string;
  projectDir?: string;
  characterId: string;
  characterName: string;
  profile?: MveVoiceProfile | null;
  previewText: string;
  description: string;
  designSpec: MveVoiceDesignSpec;
  speed: number;
  voiceId?: string;
  isPlaying: boolean;
  generateBusy?: boolean;
  generateDisabled?: boolean;
  generateHint?: string;
  showDesignVoice?: boolean;
  designVoiceDisabled?: boolean;
  onDesignFromDescription?: () => void;
  cloneBusy?: boolean;
  cloneDisabled?: boolean;
  cloneStartBusy?: boolean;
  tuneBusy?: boolean;
  tuneDisabled?: boolean;
  latestConsent?: MveVoiceConsent | null;
  onPreviewTextChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDesignSpecChange: (spec: MveVoiceDesignSpec) => void;
  designCandidates?: VoiceDesignCandidate[];
  playingCandidateId?: string | null;
  savingCandidateId?: string | null;
  onPlayDesignCandidate?: (candidate: VoiceDesignCandidate) => void;
  onSaveDesignCandidate?: (candidate: VoiceDesignCandidate) => void;
  onSpeedChange: (value: number) => void;
  onPlayPreview: () => void;
  onVoiceAssignedProfile: (profile: MveVoiceProfile) => void;
  onSuggestFromDescription?: () => void;
  onCloneSubmit?: (
    file: File,
    options: { consentConfirmed: boolean; commercialUseAllowed: boolean },
  ) => void;
  onCloneRevoke?: () => void;
  onCloneStart?: () => void;
  onTuneSubmit?: (options: VoiceTuneSubmitOptions) => void;
  voiceProvider?: VoiceProviderId;
  onVoiceProviderChange?: (provider: VoiceProviderId) => void;
}

export function VoiceProfileEditorForm({
  projectId,
  projectDir,
  characterId,
  characterName,
  profile,
  previewText,
  description,
  designSpec,
  speed,
  voiceId,
  isPlaying,
  generateBusy,
  generateDisabled,
  generateHint,
  showDesignVoice,
  designVoiceDisabled,
  onDesignFromDescription,
  cloneBusy,
  cloneDisabled,
  cloneStartBusy,
  tuneBusy,
  tuneDisabled,
  latestConsent,
  onPreviewTextChange,
  onDescriptionChange,
  onDesignSpecChange,
  designCandidates,
  playingCandidateId,
  savingCandidateId,
  onPlayDesignCandidate,
  onSaveDesignCandidate,
  onSpeedChange,
  onPlayPreview,
  onVoiceAssignedProfile,
  onSuggestFromDescription,
  onCloneSubmit,
  onCloneRevoke,
  onCloneStart,
  onTuneSubmit,
  voiceProvider,
  onVoiceProviderChange,
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
        provider={voiceProvider}
        onProviderChange={onVoiceProviderChange}
        showLabel
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

      <VoiceDesignDescriptionPanel
        description={description}
        designSpec={designSpec}
        disabled={generateBusy}
        onDescriptionChange={onDescriptionChange}
        onDesignSpecChange={onDesignSpecChange}
      />

      <VoiceProfileFutureSections
        description={description}
        profile={profile}
        latestConsent={latestConsent}
        generateBusy={generateBusy}
        generateDisabled={generateDisabled}
        generateHint={generateHint}
        showDesign={showDesignVoice}
        designDisabled={designVoiceDisabled}
        onDesignFromDescription={onDesignFromDescription}
        designCandidates={designCandidates}
        previewText={previewText}
        playingCandidateId={playingCandidateId}
        savingCandidateId={savingCandidateId}
        onPlayDesignCandidate={onPlayDesignCandidate}
        onSaveDesignCandidate={onSaveDesignCandidate}
        cloneBusy={cloneBusy}
        cloneDisabled={cloneDisabled}
        cloneStartBusy={cloneStartBusy}
        tuneBusy={tuneBusy}
        tuneDisabled={tuneDisabled}
        showClone={isProfileVoiceProvider(
          voiceProvider ?? resolveVoiceProviderId(profile?.engine),
        )}
        onSuggestFromDescription={onSuggestFromDescription}
        onCloneSubmit={onCloneSubmit}
        onCloneRevoke={onCloneRevoke}
        onCloneStart={onCloneStart}
        onTuneSubmit={onTuneSubmit}
      />
    </div>
  );
}
