/**
 * CharacterVoiceSelector — Kokoro-Stimme für MVE VoiceProfile (Characters-Panel).
 *
 * Zeigt lokale Kokoro-Stimmen; persistiert Zuweisung in mve_voice_profiles.
 * Location: src/components/audio/CharacterVoiceSelector.tsx
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAssignMveVoice } from "../../hooks/useAssignMveVoice";
import { useLocalVoices } from "../../hooks/useLocalVoices";
import { ensureKokoroSidecar } from "../../lib/api/local-tts-api";
import { resolveMveTtsVoiceId } from "../../lib/mve/resolve-tts-voice-id";
import { isDesktopShell } from "../../runtime/detect-runtime";
import { cn } from "../../lib/utils";
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
  label = "Charakterstimme (Kokoro lokal)",
}: CharacterVoiceSelectorProps) {
  const [open, setOpen] = useState(false);
  const isStartingRef = useRef(false);
  const { assignVoice, isSaving } = useAssignMveVoice(onAssigned);

  const ensureSidecar = useCallback(async () => {
    if (!isDesktopShell() || !projectDir) return;
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    try {
      await ensureKokoroSidecar(projectDir);
    } catch (err) {
      console.warn("[CharacterVoiceSelector] Kokoro sidecar:", err);
      toast.error("Kokoro-Server konnte nicht gestartet werden.");
    } finally {
      isStartingRef.current = false;
    }
  }, [projectDir]);

  useEffect(() => {
    if (isDesktopShell() && projectDir) {
      void ensureSidecar();
    }
  }, [projectDir, ensureSidecar]);

  const {
    data: voices = [],
    isLoading,
    error,
  } = useLocalVoices({ enabled: Boolean(projectDir) });

  const selectedVoiceId = resolveMveTtsVoiceId(profile);
  const selectedVoice = voices.find((v) => v.id === selectedVoiceId);

  const handleSelect = async (voiceId: string) => {
    setOpen(false);
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
  };

  if (!isDesktopShell()) {
    return (
      <p className="text-muted-foreground text-xs italic">
        Voice-Auswahl nur in der Desktop-App verfügbar.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {showLabel && (
        <label className="text-[10px] font-medium text-muted-foreground">
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={() => void ensureSidecar()}
            disabled={disabled || isLoading || isSaving}
            aria-haspopup="listbox"
            aria-expanded={open}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-md border border-border",
              "bg-background px-2 py-1.5 text-xs text-foreground",
              "hover:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              {isLoading || isSaving ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <Mic className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">
                {selectedVoice
                  ? `${selectedVoice.name} (${selectedVoice.lang})`
                  : "Stimme auswählen…"}
              </span>
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          role="listbox"
          aria-label="Kokoro-Stimmen"
        >
          <div className="max-h-48 overflow-auto py-1">
            {voices.map((voice) => (
              <button
                key={voice.id}
                type="button"
                role="option"
                aria-selected={selectedVoiceId === voice.id}
                onClick={() => void handleSelect(voice.id)}
                className={cn(
                  "flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs",
                  "hover:bg-muted/50 focus:bg-muted/50 focus:outline-none",
                  selectedVoiceId === voice.id && "bg-primary/10 text-primary",
                )}
              >
                <Mic className="h-3 w-3 shrink-0 text-muted-foreground" />
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{voice.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {voice.lang} — {voice.gender}
                  </span>
                </div>
              </button>
            ))}
            {voices.length === 0 && !isLoading && (
              <p className="px-2 py-2 text-[10px] text-muted-foreground">
                Keine Stimmen gefunden.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {error && (
        <p className="text-[10px] text-destructive">
          {error.message || "Stimmen konnten nicht geladen werden."}
        </p>
      )}
    </div>
  );
}
