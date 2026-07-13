/**
 * Play/stop control + scrubbable waveform for one voice design candidate.
 * Location: src/components/characters/VoiceDesignCandidatePlayer.tsx
 */

import { Loader2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VoiceDesignCandidatePlaybackView } from "@/hooks/useVoiceDesignCandidatePlayback";
import { VoiceDesignCandidateWaveform } from "./VoiceDesignCandidateWaveform";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export interface VoiceDesignCandidatePlayerProps {
  candidateIndex: number;
  candidateLabel: string;
  audioPath: string;
  view: VoiceDesignCandidatePlaybackView;
  disabled?: boolean;
  onToggle: () => void;
  onSeek: (ratio: number) => void;
}

export function VoiceDesignCandidatePlayer({
  candidateIndex,
  candidateLabel,
  view,
  disabled,
  onToggle,
  onSeek,
}: VoiceDesignCandidatePlayerProps) {
  const showStop = view.isPlaying;
  const canInteract = !disabled && !view.isLoading && view.durationSec > 0;

  return (
    <div
      className="flex min-w-0 flex-1 flex-col gap-1"
      data-testid={`voice-design-player-${candidateIndex}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 shrink-0 p-0"
          disabled={disabled || view.isLoading}
          onClick={onToggle}
          aria-label={
            showStop
              ? `Kandidat ${candidateLabel} stoppen`
              : `Kandidat ${candidateLabel} abspielen`
          }
          data-testid={`voice-design-play-${candidateIndex}`}
        >
          {view.isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : showStop ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </Button>
        <VoiceDesignCandidateWaveform
          candidateIndex={candidateIndex}
          view={view}
          onSeek={onSeek}
        />
      </div>
      <div className="flex justify-between px-1 text-[10px] tabular-nums text-muted-foreground">
        <span data-testid={`voice-design-time-current-${candidateIndex}`}>
          {formatTime(view.currentTimeSec)}
        </span>
        <span data-testid={`voice-design-time-duration-${candidateIndex}`}>
          {canInteract || view.durationSec > 0
            ? formatTime(view.durationSec)
            : view.isLoading
              ? "Lädt…"
              : "0:00"}
        </span>
      </div>
    </div>
  );
}
