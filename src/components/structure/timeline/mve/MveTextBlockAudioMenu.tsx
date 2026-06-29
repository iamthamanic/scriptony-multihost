/**
 * MVE Text Block Audio Menu — single "+" dropdown (Generate / Upload / Record).
 * Location: src/components/structure/timeline/mve/MveTextBlockAudioMenu.tsx
 */

import { useRef } from "react";
import {
  Loader2,
  MapPin,
  Mic,
  Plus,
  Square,
  Upload,
  Wand2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface MveTextBlockAudioMenuProps {
  isGenerating: boolean;
  isRecording: boolean;
  isUploading: boolean;
  disabled?: boolean;
  hasScene: boolean;
  onGenerate: () => void;
  onUploadFile: (file: File) => void;
  onToggleRecord: () => void;
  onRequestScene: () => void;
}

export function MveTextBlockAudioMenu({
  isGenerating,
  isRecording,
  isUploading,
  disabled,
  hasScene,
  onGenerate,
  onUploadFile,
  onToggleRecord,
  onRequestScene,
}: MveTextBlockAudioMenuProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const busy = disabled || isGenerating || isRecording || isUploading;
  const showSpinner = isGenerating || isUploading;

  return (
    <div data-testid="mve-text-block-audio-menu">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onUploadFile(file);
        }}
        data-testid="mve-text-block-upload-input"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={busy}
            aria-label="Audio hinzufügen"
            data-testid="mve-text-block-audio-add"
            className={cn(
              "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border text-[11px] font-bold",
              "border-white/30 bg-white/10 text-white hover:bg-white/20",
              "focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50",
              "disabled:pointer-events-none disabled:opacity-50",
              isRecording && "border-red-400/80 bg-red-500/90 text-white",
            )}
          >
            {showSpinner ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-3.5" aria-hidden />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            disabled={busy}
            onClick={() => (hasScene ? onGenerate() : onRequestScene())}
            className="gap-2 text-xs"
            data-testid="mve-text-block-generate"
          >
            {isGenerating ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Wand2 className="size-3.5" aria-hidden />
            )}
            Generate
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={busy}
            onClick={() =>
              hasScene ? fileInputRef.current?.click() : onRequestScene()
            }
            className="gap-2 text-xs"
            data-testid="mve-text-block-upload"
          >
            {isUploading ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Upload className="size-3.5" aria-hidden />
            )}
            {hasScene ? "Upload" : "Szene wählen…"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={disabled || isGenerating || isUploading}
            onClick={() => (hasScene ? onToggleRecord() : onRequestScene())}
            className="gap-2 text-xs"
            data-testid="mve-text-block-record"
          >
            {isRecording ? (
              <Square className="size-3.5 text-red-500" aria-hidden />
            ) : (
              <Mic className="size-3.5" aria-hidden />
            )}
            {hasScene
              ? isRecording
                ? "Aufnahme stoppen"
                : "Record"
              : "Szene wählen…"}
          </DropdownMenuItem>
          {!hasScene ? (
            <DropdownMenuItem
              disabled={disabled}
              onClick={onRequestScene}
              className="gap-2 text-xs"
              data-testid="mve-text-block-scene"
            >
              <MapPin className="size-3.5" aria-hidden />
              Szene wählen
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
