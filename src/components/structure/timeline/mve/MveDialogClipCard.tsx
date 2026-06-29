/**
 * MveDialogClipCard — always-on inline dialog clip for text-only MVE lines (Skizze 3).
 * Header, character, regie/tools, textarea, and waveform footer inside lane height.
 *
 * Location: src/components/structure/timeline/mve/MveDialogClipCard.tsx
 */

import { Sparkles, Loader2, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../../../ui/button";
import { Textarea } from "../../../ui/textarea";
import { cn } from "@/lib/utils";
import { MveTagDropdown } from "./MveTagDropdown";
import { MveEnhanceSuggestions } from "./MveEnhanceSuggestions";
import { MveTextBlockAudioMenu } from "./MveTextBlockAudioMenu";
import { MveLineInspector } from "./MveLineInspector";
import { MveLineTakePanel } from "./MveLineTakePanel";
import { MveDialogClipWaveformFooter } from "./MveDialogClipWaveformFooter";
import { useMveTextBlockEditor } from "@/hooks/useMveTextBlockEditor";
import {
  mveDialogClipLayoutTier,
  mveEmotionDisplayLabel,
} from "@/lib/mve/mve-dialog-clip-layout";
import type { MveEnhanceLineDraft } from "@/lib/multi-voice-engine/schema/enhance-script";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { MveLineDirection } from "@/lib/multi-voice-engine/schema/line-direction";
import type { Character } from "@/lib/types";
import type { MveTextBlockAudioState } from "@/hooks/useMveTextBlockAudio";

export interface MveDialogClipCardProps {
  line: MveLine;
  clipWidthPx: number;
  sceneLabel?: string;
  character?: Character;
  onSaveText: (text: string) => Promise<void>;
  onEnhance: (rawText: string) => Promise<MveEnhanceLineDraft[] | null>;
  onSaveDirection?: (direction: MveLineDirection) => Promise<void>;
  onDeleteLine?: () => Promise<void>;
  audioMenu?: MveTextBlockAudioState;
  sceneId?: string;
  waveformData?: number[];
  headerAddon?: ReactNode;
  projectId?: string;
  renderBlockReason?: string;
  onRenderLine?: (lineId: string) => Promise<unknown>;
  isRendering?: boolean;
  className?: string;
}

export function MveDialogClipCard({
  line,
  clipWidthPx,
  sceneLabel,
  onSaveText,
  onEnhance,
  onSaveDirection,
  onDeleteLine,
  audioMenu,
  sceneId,
  waveformData,
  headerAddon,
  projectId,
  renderBlockReason,
  onRenderLine,
  isRendering,
  className,
}: MveDialogClipCardProps) {
  const tier = mveDialogClipLayoutTier(clipWidthPx);
  const compact = tier === "compact";
  const iconOnlyToolbar = true;
  const editor = useMveTextBlockEditor({
    initialText: line.text ?? "",
    onSave: onSaveText,
    onEnhance,
  });
  const emotionLabel = mveEmotionDisplayLabel(line.direction?.emotion);
  const hasScene = Boolean(audioMenu?.selectedSceneId ?? sceneId);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-hidden rounded border border-white/80",
        "bg-zinc-900/95 text-white shadow-sm",
        className,
      )}
      onDrop={editor.handleDrop}
      onDragOver={editor.handleDragOver}
      onMouseDown={(e) => e.stopPropagation()}
      data-testid="mve-dialog-clip-card"
    >
      <div className="flex shrink-0 items-center justify-between gap-1 border-b border-white/10 px-1.5 py-0.5">
        <div className="min-w-0 truncate text-[8px] leading-tight">
          {sceneLabel ? (
            <span className="text-rose-400 font-medium">{sceneLabel}</span>
          ) : null}
          {sceneLabel ? <span className="text-white/50 mx-1">·</span> : null}
          <span className="text-white/90 font-medium">Audio: Dialog</span>
        </div>
        {headerAddon}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 overflow-x-auto overflow-y-hidden border-b border-white/10 px-1 py-0.5 scrollbar-hide">
        {emotionLabel && !compact ? (
          <span className="inline-flex max-w-[7rem] shrink-0 truncate rounded-full border border-white/25 bg-white/10 px-1.5 py-px text-[8px] text-white/90">
            Emotion: {emotionLabel}
          </span>
        ) : null}
        {onSaveDirection && !compact ? (
          <MveLineInspector
            direction={line.direction}
            disabled={editor.isEnhancing}
            onSave={onSaveDirection}
          />
        ) : null}
        <MveTagDropdown
          onInsert={editor.insertTag}
          disabled={editor.isEnhancing}
          compact={iconOnlyToolbar || compact}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 w-7 shrink-0 p-0 text-white hover:bg-white/10 hover:text-white"
          disabled={!editor.text.trim() || editor.isEnhancing}
          onClick={() => void editor.enhance()}
          aria-label="Enhance"
          title="Enhance"
          data-testid="mve-text-block-enhance"
        >
          {editor.isEnhancing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
        </Button>
        {audioMenu ? (
          <MveTextBlockAudioMenu
            isGenerating={audioMenu.isGenerating}
            isRecording={audioMenu.isRecording}
            isUploading={audioMenu.isUploading}
            hasScene={hasScene}
            disabled={editor.isEnhancing}
            onGenerate={() => void audioMenu.generate()}
            onUploadFile={(file) => void audioMenu.uploadFile(file)}
            onToggleRecord={
              audioMenu.isRecording
                ? audioMenu.stopRecord
                : audioMenu.startRecord
            }
            onRequestScene={() => audioMenu.requestSceneForAction("generate")}
          />
        ) : null}
        {onDeleteLine ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 w-7 shrink-0 p-0 text-white/80 hover:bg-red-500/20 hover:text-red-300"
            disabled={editor.isEnhancing}
            onClick={() => void onDeleteLine()}
            aria-label="Textblock löschen"
            title="Löschen"
            data-testid="mve-text-block-delete"
          >
            <Trash2 className="size-3.5" />
          </Button>
        ) : null}
        {projectId && onRenderLine ? (
          <MveLineTakePanel
            line={line}
            projectId={projectId}
            disabled={editor.isEnhancing}
            renderBlockReason={renderBlockReason}
            onRenderLine={onRenderLine}
            isRendering={isRendering}
          />
        ) : null}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-1 py-0.5">
        <Textarea
          ref={editor.textareaRef}
          value={editor.text}
          onChange={(e) => editor.setText(e.target.value)}
          className={cn(
            "h-full min-h-0 w-full resize-none rounded-none border-0 bg-transparent p-0 text-[10px] leading-snug text-white",
            "[field-sizing:fixed] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
            "placeholder:text-white/45 caret-white",
          )}
          placeholder="Dialogtext eingeben…"
          data-testid="mve-text-block-textarea"
          rows={compact ? 2 : 3}
        />
        {editor.suggestions ? (
          <div className="absolute inset-x-1 bottom-0 z-10 max-h-[55%] overflow-y-auto rounded border border-white/20 bg-zinc-950/95 p-1 shadow-lg">
            <MveEnhanceSuggestions
              suggestions={editor.suggestions}
              onConfirm={editor.applySuggestion}
              onReject={editor.rejectSuggestions}
            />
          </div>
        ) : null}
      </div>

      <MveDialogClipWaveformFooter
        clipWidthPx={clipWidthPx}
        waveformData={waveformData}
      />
    </div>
  );
}
