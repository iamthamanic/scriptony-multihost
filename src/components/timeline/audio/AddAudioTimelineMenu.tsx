/**
 * AddAudioTimelineMenu — Mockup „Add Audio“ (Record / Upload / Generate).
 */

import { Mic, Sparkles, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Button } from "../../ui/button";
import { cn } from "../../../lib/utils";

export interface AddAudioTimelineMenuProps {
  laneIndex: number;
  startSec: number;
  disabled?: boolean;
  isRecording?: boolean;
  onRecord: (laneIndex: number, startSec: number) => void;
  onUpload: (laneIndex: number, startSec: number) => void;
  onGenerate: (laneIndex: number, startSec: number) => void;
  triggerClassName?: string;
  /** compact + in header | panel at playhead | default labeled button */
  variant?: "compact" | "panel" | "default";
}

export function AddAudioTimelineMenu({
  laneIndex,
  startSec,
  disabled,
  isRecording,
  onRecord,
  onUpload,
  onGenerate,
  triggerClassName,
  variant = "default",
}: AddAudioTimelineMenuProps) {
  const content = (
    <>
      <DropdownMenuItem
        onClick={() => onRecord(laneIndex, startSec)}
        className="gap-2"
      >
        <Mic
          className={cn("size-4", isRecording && "text-red-500")}
          aria-hidden
        />
        {isRecording ? "Aufnahme stoppen" : "Record Audio"}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => onUpload(laneIndex, startSec)}
        className="gap-2"
      >
        <Upload className="size-4" aria-hidden />
        Upload Audio
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => onGenerate(laneIndex, startSec)}
        className="gap-2"
      >
        <Sparkles className="size-4" aria-hidden />
        Generate Audio
      </DropdownMenuItem>
    </>
  );

  const compactTrigger = (
    <button
      type="button"
      disabled={disabled}
      aria-label="Audio hinzufügen"
      className={cn(
        "h-5 w-5 shrink-0 text-[9px] font-bold rounded border",
        "inline-flex items-center justify-center transition-colors",
        "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        isRecording
          ? "border-red-500/80 bg-red-500 text-white hover:bg-red-600"
          : "border-primary/80 bg-primary text-white hover:bg-primary/90",
        triggerClassName,
      )}
    >
      +
    </button>
  );

  const defaultTrigger = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      className={cn(
        variant === "panel" && "h-8 shadow-md border-primary/40",
        isRecording && "border-red-500 bg-red-500 text-white hover:bg-red-600",
        triggerClassName,
      )}
      aria-label="Audio hinzufügen"
    >
      Add Audio
    </Button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "compact" ? compactTrigger : defaultTrigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={variant === "panel" ? "center" : "start"}
        className={cn(
          "w-52",
          variant === "panel" &&
            "border-2 border-border bg-card shadow-xl p-0 overflow-hidden",
        )}
      >
        {variant === "panel" ? (
          <div>
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
              <span className="text-sm font-semibold">Add Audio</span>
            </div>
            <div className="p-1">{content}</div>
          </div>
        ) : (
          content
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
