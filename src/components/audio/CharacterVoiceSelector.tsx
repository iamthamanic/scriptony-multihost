/**
 * CharacterVoiceSelector — lokale Stimme für MVE VoiceProfile (Characters-Panel).
 *
 * Select statt Popover: sichtbar über Dialog-Modals (z-index 11000).
 * Location: src/components/audio/CharacterVoiceSelector.tsx
 */

import { useCallback } from "react";
import { Loader2, Mic } from "lucide-react";
import { useAssignMveVoice } from "../../hooks/useAssignMveVoice";
import { useTtsVoiceProfiles } from "../../hooks/useTtsVoiceProfiles";
import {
  DEFAULT_VOICE_ENGINE,
  isVoiceboxDefault,
  localVoiceEngineLabel,
} from "@/lib/config/voice-engine";
import { resolveMveTtsVoiceId } from "../../lib/mve/resolve-tts-voice-id";
import { isDesktopShell } from "../../runtime/detect-runtime";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";

interface CharacterVoiceSelectorProps {
  projectId: string;
  projectDir?: string;
  characterId: string;
  characterName: string;
  profile?: MveVoiceProfile | null;
  previewText?: string;
  disabled?: boolean;
  onAssigned?: () => void;
  onAssignedProfile?: (profile: MveVoiceProfile) => void;
  showLabel?: boolean;
  label?: string;
}

export function CharacterVoiceSelector({
  projectId,
  projectDir,
  characterId,
  characterName,
  profile,
  previewText,
  disabled,
  onAssigned,
  onAssignedProfile,
  showLabel = true,
  label = `Charakterstimme (${localVoiceEngineLabel(DEFAULT_VOICE_ENGINE)} lokal)`,
}: CharacterVoiceSelectorProps) {
  const { assignVoice, isSaving } = useAssignMveVoice(onAssigned);

  const { data, isLoading, isFetching, error, refetch } = useTtsVoiceProfiles({
    enabled: Boolean(projectDir),
    projectDir,
  });

  const voices = data?.voices ?? [];
  const engineLabel =
    data?.engineLabel ?? localVoiceEngineLabel(DEFAULT_VOICE_ENGINE);
  const engineReady = data?.engineReady ?? false;
  const engineError = data?.engineError;
  const sidecarReady = data?.sidecarReady ?? false;
  const kokoroReady = data?.kokoroReady ?? false;
  const usedCatalogFallback = data?.usedCatalogFallback ?? false;

  const selectedVoiceId = resolveMveTtsVoiceId(profile);

  const handleSelect = useCallback(
    async (voiceId: string) => {
      const assigned = await assignVoice({
        projectId,
        characterId,
        characterName,
        voiceId,
        previewText,
        existingProfile: profile,
      });
      if (assigned) {
        onAssignedProfile?.(assigned);
      }
    },
    [
      assignVoice,
      projectId,
      characterId,
      characterName,
      previewText,
      profile,
      onAssignedProfile,
    ],
  );

  if (!isDesktopShell()) {
    return (
      <p className="text-muted-foreground text-xs italic">
        Voice-Auswahl nur in der Desktop-App verfügbar.
      </p>
    );
  }

  if (!projectDir) {
    return (
      <p className="text-muted-foreground text-xs italic">
        Lokales .scriptony-Projekt öffnen, um {engineLabel}-Stimmen zu laden.
      </p>
    );
  }

  const selectDisabled = disabled || isLoading || isSaving;
  const busy = isLoading || isFetching || isSaving;

  return (
    <div className="space-y-1">
      {showLabel && (
        <label className="text-[10px] font-medium text-muted-foreground">
          {label}
        </label>
      )}
      <Select
        value={selectedVoiceId || undefined}
        onValueChange={(value) => {
          if (!value || value === "__empty__") return;
          void handleSelect(value);
        }}
        disabled={selectDisabled}
        onOpenChange={(open) => {
          if (open) void refetch();
        }}
      >
        <SelectTrigger
          className="h-9 w-full text-xs"
          aria-label={`${engineLabel}-Stimme auswählen`}
          data-testid="character-voice-select-trigger"
        >
          <div className="flex items-center gap-2 min-w-0">
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <Mic className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <SelectValue placeholder="Stimme auswählen…" />
          </div>
        </SelectTrigger>
        <SelectContent data-testid="character-voice-select-content">
          {voices.length === 0 && !busy ? (
            <SelectItem value="__empty__" disabled>
              Keine Stimmen geladen
            </SelectItem>
          ) : (
            voices.map((voice) => (
              <SelectItem key={voice.id} value={voice.id}>
                {voice.name} ({voice.lang}, {voice.gender})
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {engineError ? (
        <p className="text-[10px] text-destructive">{engineError}</p>
      ) : null}

      {error ? (
        <p className="text-[10px] text-destructive">
          {error.message || "Stimmen konnten nicht geladen werden."}
        </p>
      ) : null}

      {!error && busy && voices.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">
          {isVoiceboxDefault()
            ? `${engineLabel} wird verbunden…`
            : "Kokoro-Server wird gestartet (beim ersten Mal ggf. Python-Setup)…"}
        </p>
      ) : null}

      {!error && voices.length > 0 ? (
        <p className="text-[10px] text-muted-foreground">
          {voices.length} Stimmen
          {isVoiceboxDefault()
            ? engineReady
              ? " — TTS bereit"
              : ""
            : kokoroReady
              ? " — TTS bereit"
              : sidecarReady
                ? " — Sidecar läuft, Modell wird geladen…"
                : usedCatalogFallback
                  ? " — Vorschau startet Sidecar automatisch"
                  : ""}
        </p>
      ) : null}
    </div>
  );
}
