/**
 * CharacterVoiceSelector — Voice-Auswahl fuer Charaktere (Kokoro lokal).
 *
 * Zeigt Dropdown aller verfuegbaren lokalen Stimmen an.
 * Fragt Kokoro Sidecar nach Voice-Liste ab.
 *
 * Location: src/components/audio/CharacterVoiceSelector.tsx
 */

import { useState, useCallback } from "react";
import { Mic, Loader2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { useLocalVoices } from "../../hooks/useLocalVoices";
import { ensureKokoroSidecar } from "../../lib/api/local-tts-api";
import { isDesktopShell } from "../../runtime/detect-runtime";
import { cn } from "../../lib/utils";

export interface VoiceAssignment {
  type: "kokoro" | "openai" | "elevenlabs";
  voiceId: string;
}

interface CharacterVoiceSelectorProps {
  projectDir: string;
  value?: VoiceAssignment;
  onChange: (assignment: VoiceAssignment) => void;
  disabled?: boolean;
}

export function CharacterVoiceSelector({
  projectDir,
  value,
  onChange,
  disabled,
}: CharacterVoiceSelectorProps) {
  const [isStarting, setIsStarting] = useState(false);

  // Start sidecar on first interaction if needed
  const ensureSidecar = useCallback(async () => {
    if (!isDesktopShell() || !projectDir) return;
    if (isStarting) return;
    setIsStarting(true);
    try {
      await ensureKokoroSidecar(projectDir);
    } catch {
      /* ignore — voices query will show empty */
    } finally {
      setIsStarting(false);
    }
  }, [projectDir, isStarting]);

  const {
    data: voices = [],
    isLoading,
    error,
  } = useLocalVoices({ enabled: Boolean(projectDir) });

  // Auto-start sidecar when component mounts
  useState(() => {
    if (isDesktopShell() && projectDir) {
      ensureSidecar();
    }
  });

  const handleChange = (voiceId: string) => {
    onChange({ type: "kokoro", voiceId });
  };

  const selectedVoice = voices.find((v) => v.id === value?.voiceId);

  // Nur in Desktop-Shell anzeigen
  if (!isDesktopShell()) {
    return (
      <div className="text-muted-foreground text-sm italic">
        Voice-Auswahl nur in der Desktop-App verfuegbar.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        Stimme (Kokoro lokal)
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => ensureSidecar()}
          disabled={disabled || isLoading || isStarting}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-md border border-border",
            "bg-background px-3 py-2 text-sm text-foreground shadow-sm",
            "hover:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          <div className="flex items-center gap-2">
            {isLoading || isStarting ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Mic className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="truncate">
              {selectedVoice
                ? `${selectedVoice.name} (${selectedVoice.lang})`
                : "Stimme auswaehlen…"}
            </span>
          </div>
          <Volume2 className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Dropdown List */}
        {voices.length > 0 && !disabled && (
          <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-card shadow-lg">
            <div className="py-1">
              {voices.map((voice) => (
                <button
                  key={voice.id}
                  type="button"
                  onClick={() => handleChange(voice.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                    "hover:bg-muted/50 focus:bg-muted/50 focus:outline-none",
                    value?.voiceId === voice.id && "bg-primary/10 text-primary",
                  )}
                >
                  <Mic className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium">{voice.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {voice.lang} — {voice.gender}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive">
          {error.message || "Stimmen konnten nicht geladen werden."}
        </p>
      )}

      {voices.length === 0 && !isLoading && !isStarting && !error && (
        <p className="text-xs text-muted-foreground">
          Keine Stimmen gefunden. Stelle sicher, dass der Kokoro-Server laeuft.
        </p>
      )}
    </div>
  );
}
