/**
 * CharacterVoiceSelector — provider + voice for MVE VoiceProfile (Characters-Panel).
 *
 * Two-step: Provider (Eigene Stimmen / preset engines via Voicebox / ElevenLabs) → Stimme.
 * Location: src/components/audio/CharacterVoiceSelector.tsx
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mic } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { useAssignMveVoice } from "../../hooks/useAssignMveVoice";
import {
  retryVoiceboxConnection,
  useTtsVoiceProfiles,
} from "../../hooks/useTtsVoiceProfiles";
import {
  isProfileVoiceProvider,
  isVoiceboxBackedProvider,
  listAvailableVoiceProviders,
  persistedEngineForProvider,
  resolveVoiceProviderId,
  voiceProviderLabel,
  type VoiceProviderId,
} from "@/lib/config/voice-providers";
import { voiceboxPresetEngineLabel } from "@/lib/config/voicebox-preset-engines";
import {
  voiceboxModelStatusHint,
  voiceboxModelStatusShort,
} from "@/lib/voicebox/voicebox-model-status";
import {
  createVoiceboxProfile,
  resolveVoiceboxProfileIdForSelection,
} from "@/lib/api/voicebox-api";
import { isElevenLabsProviderReady } from "@/lib/config/voice-providers";
import { resolveMveTtsVoiceId } from "../../lib/mve/resolve-tts-voice-id";
import { voiceEntriesForAssignedSelection } from "../../lib/mve/resolve-assigned-voice-label";
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
  /** Controlled provider (syncs with parent Voice Studio state). */
  provider?: VoiceProviderId;
  onProviderChange?: (provider: VoiceProviderId) => void;
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
  label = "Charakterstimme",
  provider: controlledProvider,
  onProviderChange,
}: CharacterVoiceSelectorProps) {
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [internalProvider, setInternalProvider] = useState<VoiceProviderId>(
    resolveVoiceProviderId(profile?.engine),
  );
  const selectedProvider = controlledProvider ?? internalProvider;

  const setSelectedProvider = useCallback(
    (next: VoiceProviderId) => {
      if (!controlledProvider) {
        setInternalProvider(next);
      }
      onProviderChange?.(next);
    },
    [controlledProvider, onProviderChange],
  );

  const { assignVoice, isSaving } = useAssignMveVoice(onAssigned);

  useEffect(() => {
    if (controlledProvider) return;
    if (profile?.engine) {
      setInternalProvider(resolveVoiceProviderId(profile.engine));
    }
  }, [controlledProvider, profile?.engine]);

  useEffect(() => {
    if (controlledProvider) {
      setInternalProvider(controlledProvider);
    }
  }, [controlledProvider]);

  const providers = listAvailableVoiceProviders();

  const { data, isLoading, isFetching, error, refetch } = useTtsVoiceProfiles({
    enabled: Boolean(projectDir) || selectedProvider === "elevenlabs",
    projectDir,
    provider: selectedProvider,
  });

  const voices = data?.voices ?? [];
  const selectedVoiceId = resolveMveTtsVoiceId(profile);
  const displayVoices = voiceEntriesForAssignedSelection(
    voices,
    selectedVoiceId,
    profile,
  );

  const providerLabel =
    data?.providerLabel ?? voiceProviderLabel(selectedProvider);
  const engineReady = data?.engineReady ?? false;
  const engineError = data?.engineError;
  const voiceSelectNeedsSidecar = isVoiceboxBackedProvider(selectedProvider);
  const voiceboxModelLoaded = data?.voiceboxModelLoaded ?? false;
  const voiceboxModelDownloaded = data?.voiceboxModelDownloaded ?? null;
  const modelStatusHint =
    voiceSelectNeedsSidecar && engineReady && !voiceboxModelLoaded
      ? voiceboxModelStatusHint({
          modelLoaded: voiceboxModelLoaded,
          modelDownloaded: voiceboxModelDownloaded,
        })
      : undefined;
  const elevenLabsReady = isElevenLabsProviderReady();

  const handleSelect = useCallback(
    async (voiceId: string) => {
      let resolvedVoiceId = voiceId;
      if (isVoiceboxBackedProvider(selectedProvider)) {
        resolvedVoiceId = await resolveVoiceboxProfileIdForSelection({
          voiceId,
          characterName,
          language: "de",
        });
      }

      const assigned = await assignVoice({
        projectId,
        characterId,
        characterName,
        voiceId: resolvedVoiceId,
        engine: persistedEngineForProvider(selectedProvider),
        previewText,
        existingProfile: profile,
      });
      if (assigned) {
        onAssignedProfile?.(assigned);
      }
      if (isVoiceboxBackedProvider(selectedProvider)) {
        await refetch();
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
      selectedProvider,
      refetch,
    ],
  );

  const handleCreateVoiceProfile = useCallback(async () => {
    if (!isProfileVoiceProvider(selectedProvider) || !engineReady) return;
    setIsCreatingProfile(true);
    try {
      const created = await createVoiceboxProfile({
        name: characterName.trim() || "Charakter",
        description: `Scriptony — ${characterName.trim() || "Charakter"}`,
        language: "de",
        voiceType: "cloned",
      });
      const assigned = await assignVoice({
        projectId,
        characterId,
        characterName,
        voiceId: created.id,
        engine: "voicebox",
        previewText,
        existingProfile: profile,
      });
      if (assigned) {
        onAssignedProfile?.(assigned);
        toast.success(`Stimme „${created.name}“ angelegt und zugewiesen.`);
      }
      await refetch();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Stimme konnte nicht angelegt werden.",
      );
    } finally {
      setIsCreatingProfile(false);
    }
  }, [
    assignVoice,
    characterId,
    characterName,
    engineReady,
    onAssignedProfile,
    previewText,
    profile,
    projectId,
    refetch,
    selectedProvider,
  ]);

  if (!isDesktopShell() && selectedProvider !== "elevenlabs") {
    return (
      <p className="text-muted-foreground text-xs italic">
        Voice-Auswahl nur in der Desktop-App verfügbar.
      </p>
    );
  }

  if (!projectDir && isVoiceboxBackedProvider(selectedProvider)) {
    return (
      <p className="text-muted-foreground text-xs italic">
        Lokales .scriptony-Projekt öffnen, um {providerLabel} zu laden.
      </p>
    );
  }

  const selectDisabled =
    disabled ||
    isLoading ||
    isSaving ||
    isCreatingProfile ||
    (selectedProvider === "elevenlabs" && !elevenLabsReady);
  const busy = isLoading || isFetching || isSaving || isCreatingProfile;

  return (
    <div className="space-y-2">
      {showLabel ? (
        <label className="text-[10px] font-medium text-muted-foreground">
          {label}
        </label>
      ) : null}

      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground">Provider</label>
        <Select
          value={selectedProvider}
          onValueChange={(value) => {
            if (!value) return;
            setSelectedProvider(resolveVoiceProviderId(value));
          }}
          disabled={disabled || isSaving || isCreatingProfile}
        >
          <SelectTrigger
            className="h-9 w-full text-xs"
            aria-label="TTS-Provider auswählen"
            data-testid="character-voice-provider-select"
          >
            <SelectValue placeholder="Provider wählen…" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                {provider.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground">
          {providers.find((p) => p.id === selectedProvider)?.description ??
            voiceProviderLabel(selectedProvider)}
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground">Stimme</label>
        <Select
          value={selectedVoiceId || undefined}
          onValueChange={(value) => {
            if (!value || value === "__empty__") return;
            void handleSelect(value);
          }}
          disabled={selectDisabled || (voiceSelectNeedsSidecar && !engineReady)}
        >
          <SelectTrigger
            className="h-9 w-full text-xs"
            aria-label={`${providerLabel} — Stimme auswählen`}
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
            {displayVoices.length === 0 && !busy ? (
              <SelectItem value="__empty__" disabled>
                Keine Stimmen geladen
              </SelectItem>
            ) : (
              displayVoices.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  {voice.name} ({voice.lang}, {voice.gender})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {engineError ? (
        <div className="space-y-1.5">
          <p className="text-[10px] text-destructive">{engineError}</p>
          {voiceSelectNeedsSidecar ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-fit text-xs"
              disabled={disabled || isFetching}
              onClick={() => void retryVoiceboxConnection(refetch)}
              data-testid="character-voice-retry-connection"
            >
              {isFetching ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Erneut verbinden
            </Button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="text-[10px] text-destructive">
          {error.message || "Stimmen konnten nicht geladen werden."}
        </p>
      ) : null}

      {!error && busy && voices.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">
          {selectedProvider === "elevenlabs"
            ? "ElevenLabs-Stimmen werden geladen…"
            : `${providerLabel} wird verbunden…`}
        </p>
      ) : null}

      {!error &&
      voices.length === 0 &&
      !busy &&
      selectedProvider === "voicebox" &&
      engineReady ? (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground">
            Noch keine Stimme — alles in Scriptony einrichten (TTS-Dienst läuft
            im Hintergrund).
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-full text-xs"
            disabled={selectDisabled}
            onClick={() => void handleCreateVoiceProfile()}
            data-testid="character-voice-create-profile"
          >
            {isCreatingProfile ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Stimme für {characterName.trim() || "Charakter"} anlegen
          </Button>
        </div>
      ) : null}

      {!error && voices.length > 0 ? (
        <p className="text-[10px] text-muted-foreground">
          {voices.length} Stimmen
          {voiceSelectNeedsSidecar
            ? engineReady
              ? ` — ${voiceboxModelStatusShort({
                  modelLoaded: voiceboxModelLoaded,
                  modelDownloaded: voiceboxModelDownloaded,
                })}`
              : ""
            : engineReady
              ? " — API bereit"
              : ""}
        </p>
      ) : null}

      {modelStatusHint ? (
        <p
          className="text-[10px] text-amber-600 dark:text-amber-500"
          data-testid="voicebox-model-status-hint"
        >
          {modelStatusHint}
        </p>
      ) : null}

      {!error &&
      voices.length === 0 &&
      !busy &&
      selectedProvider !== "voicebox" &&
      selectedProvider !== "elevenlabs" &&
      engineReady ? (
        <p
          className="text-[10px] text-muted-foreground"
          data-testid="voicebox-empty-preset-hint"
        >
          Keine {voiceboxPresetEngineLabel(selectedProvider)}-Presets — in
          Voicebox ggf. Engine installieren.
        </p>
      ) : null}

      {selectedProvider === "elevenlabs" && !elevenLabsReady && !busy ? (
        <p className="text-[10px] text-muted-foreground">
          ElevenLabs API-Key in `.env.local` setzen (`VITE_ELEVENLABS_API_KEY`).
        </p>
      ) : null}
    </div>
  );
}
