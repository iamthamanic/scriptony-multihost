/**
 * MveLineTakePanel — render + take list popover for Structure Timeline clips (#23).
 * Location: src/components/structure/timeline/mve/MveLineTakePanel.tsx
 */

import { useState } from "react";
import { Check, Layers, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { MveTake } from "@/lib/multi-voice-engine/schema/take";
import { useMveLineTakes } from "@/hooks/useMveLineTakes";
import { playMveTakeAudio } from "@/lib/mve/play-take-audio";

const STATUS_LABEL: Record<MveTake["status"], string> = {
  processing: "Läuft…",
  ready: "Bereit",
  failed: "Fehlgeschlagen",
};

export interface MveLineTakePanelProps {
  line: MveLine;
  projectId: string;
  disabled?: boolean;
  renderBlockReason?: string;
  onRenderLine?: (lineId: string) => Promise<unknown>;
  isRendering?: boolean;
  /** DEV verify-ui harness — bypasses SQLite / local backend. */
  qaPreview?: {
    takes: MveTake[];
    loading?: boolean;
  };
}

function TakeRow({
  take,
  selected,
  disabled,
  playing,
  onPlay,
  onSelect,
}: {
  take: MveTake;
  selected: boolean;
  disabled?: boolean;
  playing: boolean;
  onPlay: () => void;
  onSelect: () => void;
}) {
  const canPlay = take.status === "ready" && Boolean(take.audioUrl);
  const canSelect = take.status === "ready";

  return (
    <li className="flex items-center gap-1.5 rounded-md border border-border/60 px-1.5 py-1 text-[10px]">
      <span className="shrink-0 w-4 text-center font-medium tabular-nums">
        {take.takeIndex + 1}
      </span>
      <span
        className="min-w-0 flex-1 truncate text-muted-foreground"
        title={STATUS_LABEL[take.status]}
      >
        {STATUS_LABEL[take.status]}
        {selected ? " · ausgewählt" : ""}
      </span>
      <button
        type="button"
        disabled={disabled || !canPlay || playing}
        className="shrink-0 p-0.5 rounded-sm hover:bg-muted disabled:opacity-40"
        aria-label={`Take ${take.takeIndex + 1} abspielen`}
        title="Abspielen"
        onClick={onPlay}
      >
        {playing ? (
          <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
        ) : (
          <Play className="w-3 h-3" aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        disabled={disabled || !canSelect || selected}
        className="shrink-0 p-0.5 rounded-sm hover:bg-muted disabled:opacity-40"
        aria-label={`Take ${take.takeIndex + 1} auswählen`}
        title="Auswählen"
        onClick={onSelect}
      >
        <Check
          className={`w-3 h-3 ${selected ? "text-primary" : "text-muted-foreground"}`}
          aria-hidden="true"
        />
      </button>
    </li>
  );
}

export function MveLineTakePanel({
  line,
  projectId,
  disabled,
  renderBlockReason,
  onRenderLine,
  isRendering,
  qaPreview,
}: MveLineTakePanelProps) {
  const [open, setOpen] = useState(false);
  const [playingTakeId, setPlayingTakeId] = useState<string | null>(null);
  const hook = useMveLineTakes(qaPreview ? undefined : line.id, projectId);
  const takes = qaPreview?.takes ?? hook.takes;
  const isLoading = qaPreview?.loading ?? hook.isLoading;
  const selectTake = hook.selectTake;
  const isSelecting = hook.isSelecting;
  const enabled = qaPreview ? true : hook.enabled;

  const handleRender = async () => {
    if (!onRenderLine || renderBlockReason) return;
    try {
      await onRenderLine(line.id);
    } catch {
      /* toast in hook */
    }
  };

  const handlePlay = async (take: MveTake) => {
    if (!take.audioUrl) return;
    setPlayingTakeId(take.id);
    try {
      await playMveTakeAudio(take.audioUrl);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Take konnte nicht abgespielt werden.",
      );
    } finally {
      setPlayingTakeId(null);
    }
  };

  if (!enabled) return null;

  const sortedTakes = [...takes].sort((a, b) => a.takeIndex - b.takeIndex);
  const renderDisabled = disabled || Boolean(renderBlockReason) || isRendering;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="shrink-0 p-0.5 rounded-sm hover:bg-white/30 transition-colors focus:outline-none focus:ring-1 focus:ring-white/50 disabled:opacity-50"
          aria-label="Takes verwalten"
          title="Takes rendern und auswählen"
        >
          <Layers className="w-3 h-3" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-2" align="start" sideOffset={4}>
        <p className="text-xs font-medium text-foreground">Takes</p>
        <Button
          type="button"
          size="sm"
          className="w-full h-8 text-xs"
          disabled={renderDisabled}
          title={renderBlockReason}
          onClick={() => void handleRender()}
        >
          {isRendering ? (
            <>
              <Loader2
                className="w-3 h-3 mr-1 animate-spin"
                aria-hidden="true"
              />
              Render läuft…
            </>
          ) : (
            "Takes rendern"
          )}
        </Button>
        {renderBlockReason ? (
          <p className="text-[10px] text-muted-foreground">
            {renderBlockReason}
          </p>
        ) : null}
        {isLoading ? (
          <p className="text-[10px] text-muted-foreground">Takes laden…</p>
        ) : sortedTakes.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">
            Noch keine Takes — oben rendern.
          </p>
        ) : (
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {sortedTakes.map((take) => (
              <TakeRow
                key={take.id}
                take={take}
                selected={take.isSelected || line.selectedTakeId === take.id}
                disabled={disabled || isSelecting}
                playing={playingTakeId === take.id}
                onPlay={() => void handlePlay(take)}
                onSelect={() => {
                  if (qaPreview) {
                    toast.success(
                      `Take ${take.takeIndex + 1} ausgewählt (QA).`,
                    );
                    return;
                  }
                  void selectTake(take.id);
                }}
              />
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
