/**
 * Remaining Voice Studio 0.4 sections (generate, clone, tune, perf ref).
 * Location: src/components/characters/VoiceProfileFutureSections.tsx
 */

import { Lock } from "lucide-react";
import type { VoiceDesignCandidate } from "@/lib/mve/casting/voice-design-candidate";
import { VoiceStudioGenerateSection } from "./VoiceStudioGenerateSection";
import { VoiceDesignCandidateList } from "./VoiceDesignCandidateList";
import { VoiceStudioCloneSection } from "./VoiceStudioCloneSection";
import {
  VoiceStudioTuneSection,
  type VoiceTuneSubmitOptions,
} from "./VoiceStudioTuneSection";
import type { MveVoiceConsent } from "@/lib/multi-voice-engine/schema/voice-consent";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";

const LOCKED_ITEMS = ["Performance Reference"] as const;

export interface VoiceProfileFutureSectionsProps {
  description: string;
  profile?: MveVoiceProfile | null;
  latestConsent?: MveVoiceConsent | null;
  generateBusy?: boolean;
  generateDisabled?: boolean;
  generateHint?: string;
  showDesign?: boolean;
  designDisabled?: boolean;
  onDesignFromDescription?: () => void;
  designCandidates?: VoiceDesignCandidate[];
  previewText?: string;
  playingCandidateId?: string | null;
  savingCandidateId?: string | null;
  onPlayDesignCandidate?: (candidate: VoiceDesignCandidate) => void;
  onSaveDesignCandidate?: (candidate: VoiceDesignCandidate) => void;
  cloneBusy?: boolean;
  cloneDisabled?: boolean;
  cloneStartBusy?: boolean;
  tuneBusy?: boolean;
  tuneDisabled?: boolean;
  /** Clone UI only for Eigene Stimmen (voicebox profile provider). */
  showClone?: boolean;
  onSuggestFromDescription?: () => void;
  onCloneSubmit?: (
    file: File,
    options: { consentConfirmed: boolean; commercialUseAllowed: boolean },
  ) => void;
  onCloneRevoke?: () => void;
  onCloneStart?: () => void;
  onTuneSubmit?: (options: VoiceTuneSubmitOptions) => void;
}

export function VoiceProfileFutureSections({
  description,
  profile,
  latestConsent,
  generateBusy = false,
  generateDisabled,
  generateHint,
  showDesign,
  designDisabled,
  onDesignFromDescription,
  designCandidates = [],
  previewText = "",
  playingCandidateId,
  savingCandidateId,
  onPlayDesignCandidate,
  onSaveDesignCandidate,
  cloneBusy = false,
  cloneDisabled,
  cloneStartBusy = false,
  tuneBusy = false,
  tuneDisabled,
  showClone = true,
  onSuggestFromDescription,
  onCloneSubmit,
  onCloneRevoke,
  onCloneStart,
  onTuneSubmit,
}: VoiceProfileFutureSectionsProps) {
  const tuneBaseProfile = profile?.type === "tuned" ? null : profile;

  return (
    <div className="space-y-2">
      <VoiceStudioGenerateSection
        description={description}
        isBusy={generateBusy}
        disabled={generateDisabled}
        hint={generateHint}
        showDesign={showDesign}
        designDisabled={designDisabled}
        onDesign={onDesignFromDescription}
        onSuggest={() => onSuggestFromDescription?.()}
      />

      <VoiceDesignCandidateList
        candidates={designCandidates}
        previewText={previewText}
        playingCandidateId={playingCandidateId}
        savingCandidateId={savingCandidateId}
        disabled={generateBusy}
        onPlay={(c) => onPlayDesignCandidate?.(c)}
        onSave={(c) => onSaveDesignCandidate?.(c)}
      />

      {showClone ? (
        <VoiceStudioCloneSection
          profile={profile}
          latestConsent={latestConsent}
          isBusy={cloneBusy}
          disabled={cloneDisabled}
          onSubmit={(file, options) => onCloneSubmit?.(file, options)}
          onRevoke={onCloneRevoke}
          onStartClone={onCloneStart}
          isStartBusy={cloneStartBusy}
        />
      ) : null}

      <VoiceStudioTuneSection
        baseProfile={tuneBaseProfile}
        isBusy={tuneBusy}
        disabled={tuneDisabled}
        onSubmit={(options) => onTuneSubmit?.(options)}
      />

      <div
        className="space-y-2 rounded-lg border border-dashed border-border bg-muted/10 p-3"
        data-testid="voice-studio-locked"
      >
        <p className="text-xs font-semibold text-muted-foreground">
          Demnächst (MVP 0.5)
        </p>
        <ul className="space-y-1.5">
          {LOCKED_ITEMS.map((label) => (
            <li
              key={label}
              className="flex items-center gap-2 rounded-md border border-border/60 bg-background/50 px-2 py-1.5 text-xs text-muted-foreground"
            >
              <Lock className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
