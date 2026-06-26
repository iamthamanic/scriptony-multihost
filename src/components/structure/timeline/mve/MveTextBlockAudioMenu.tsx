/**
 * MVE Text Block Audio Menu — Generate / Upload / Record actions
 * bound to the selected MveLine (T28).
 *
 * Location: src/components/structure/timeline/mve/MveTextBlockAudioMenu.tsx
 */

import { useRef } from "react";
import { Mic, Upload, Wand2, Loader2, Square, MapPin } from "lucide-react";
import { Button } from "../../../ui/button";
import { TooltipProvider } from "../../../ui/tooltip";
import { MveAudioActionButton } from "./MveAudioActionButton";

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

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="flex items-center gap-1"
        data-testid="mve-text-block-audio-menu"
      >
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

        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={hasScene ? onGenerate : onRequestScene}
          data-testid="mve-text-block-generate"
        >
          {isGenerating ? (
            <Loader2 className="size-4 animate-spin mr-1.5" />
          ) : (
            <Wand2 className="size-4 mr-1.5" />
          )}
          Generate
        </Button>

        <MveAudioActionButton
          icon={isUploading ? Loader2 : Upload}
          label={hasScene ? "Audio-Datei hochladen" : "Szene wählen"}
          tooltip={hasScene ? "Audio-Datei hochladen" : "Szene wählen"}
          disabled={busy}
          onClick={
            hasScene ? () => fileInputRef.current?.click() : onRequestScene
          }
          isLoading={isUploading}
          testId="mve-text-block-upload"
        />

        <MveAudioActionButton
          icon={isRecording ? Square : Mic}
          label={
            hasScene
              ? isRecording
                ? "Aufnahme stoppen"
                : "Audio aufnehmen"
              : "Szene wählen"
          }
          tooltip={
            hasScene
              ? isRecording
                ? "Aufnahme stoppen"
                : "Audio aufnehmen"
              : "Szene wählen"
          }
          disabled={disabled || isGenerating || isUploading}
          variant={isRecording ? "destructive" : "ghost"}
          onClick={hasScene ? onToggleRecord : onRequestScene}
          testId="mve-text-block-record"
        />

        {!hasScene && (
          <MveAudioActionButton
            icon={MapPin}
            label="Szene wählen"
            tooltip="Szene wählen"
            variant="outline"
            className="text-warning border-warning/50"
            disabled={disabled}
            onClick={onRequestScene}
            testId="mve-text-block-scene"
          />
        )}
      </div>
    </TooltipProvider>
  );
}
