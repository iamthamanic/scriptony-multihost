/**
 * MveDialogClipCard — always-on inline dialog clip for text-only MVE lines (Skizze 3).
 * Header, character, regie/tools, textarea, and waveform footer inside lane height.
 *
 * Location: src/components/structure/timeline/mve/MveDialogClipCard.tsx
 */

import { Sparkles, Loader2, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState, type RefObject } from "react";
import { Button } from "../../../ui/button";
import { cn } from "@/lib/utils";
import { MveDialogTextEditor } from "./MveDialogTextEditor";
import { MveTagDropdown } from "./MveTagDropdown";
import { MveEnhanceSuggestions } from "./MveEnhanceSuggestions";
import { MveTextBlockAudioMenu } from "./MveTextBlockAudioMenu";
import { MveLineInspector } from "./MveLineInspector";
import { MveLineTakePanel } from "./MveLineTakePanel";
import { MveDialogClipWaveformFooter } from "./MveDialogClipWaveformFooter";
import { MveEmotionChip } from "./MveEmotionChip";
import { MveDurationChip } from "./MveDurationChip";
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
import { estimateDurationSec, formatDurationHms } from "@/lib/audio-utils";
import { stripMveTagsFromTextForDuration } from "@/lib/mve/tags";

export interface MveDialogClipCardProps {
  line: MveLine;
  clipWidthPx: number;
  sceneLabel?: string;
  character?: Character;
  onSaveText: (text: string) => Promise<void>;
  onEnhance: (rawText: string) => Promise<MveEnhanceLineDraft[] | null>;
  onSaveDirection?: (direction: MveLineDirection) => Promise<void>;
  onDeleteLine?: () => Promise<void>;
  onDraftTextChange?: (text: string) => void;
  /** Project reading speed for WPM duration label in header. */
  readingSpeedWpm?: number;
  /** Lane drag is disabled while the textarea is focused (WKWebView + draggable ancestor). */
  onTextareaFocusChange?: (focused: boolean) => void;
  audioMenu?: MveTextBlockAudioState;
  sceneId?: string;
  waveformData?: number[];
  headerAddon?: ReactNode;
  /** Bound audio clip length in seconds (footer chip). */
  audioDurationSec?: number;
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
  onDraftTextChange,
  readingSpeedWpm,
  onTextareaFocusChange,
  audioMenu,
  sceneId,
  waveformData,
  headerAddon,
  audioDurationSec,
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
    onDraftTextChange,
  });
  const emotionLabel = mveEmotionDisplayLabel(line.direction?.emotion);
  const [textareaFocused, setTextareaFocused] = useState(false);
  const hasScene = Boolean(audioMenu?.selectedSceneId ?? sceneId);
  const hasAudioClip = Boolean(line.audioClipId);

  const wpmDurationLabel = useMemo(() => {
    const draft = editor.text.trim();
    if (!draft) return null;
    const textForDuration = stripMveTagsFromTextForDuration(editor.text);
    const sec = estimateDurationSec(textForDuration, {
      type: "dialog",
      wpmOverride: readingSpeedWpm,
    });
    return formatDurationHms(sec);
  }, [editor.text, readingSpeedWpm]);

  const headerDurationChip = useMemo(() => {
    if (compact || !wpmDurationLabel) return null;
    return {
      label: wpmDurationLabel,
      variant: "estimate" as const,
      testId: "mve-dialog-clip-wpm-duration",
    };
  }, [compact, wpmDurationLabel]);

  const handleTextareaFocus = useCallback(() => {
    setTextareaFocused(true);
    onTextareaFocusChange?.(true);
  }, [onTextareaFocusChange]);

  const handleTextareaBlur = useCallback(() => {
    setTextareaFocused(false);
    onTextareaFocusChange?.(false);
  }, [onTextareaFocusChange]);

  const handleClearDirectionEmotion = useCallback(async () => {
    if (!onSaveDirection) return;
    const next = { ...line.direction };
    delete next.emotion;
    await onSaveDirection(next);
  }, [line.direction, onSaveDirection]);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-hidden rounded border border-white",
        "bg-zinc-900/95 text-white shadow-sm",
        className,
      )}
      onDrop={editor.handleDrop}
      onDragOver={editor.handleDragOver}
      onMouseDown={(e) => e.stopPropagation()}
      data-testid="mve-dialog-clip-card"
    >
      <div className="flex h-7 shrink-0 items-center justify-between gap-1 border-b border-white/10 px-1.5">
        <div className="flex min-w-0 flex-1 items-center truncate text-[8px] leading-none">
          {sceneLabel ? (
            <span className="text-rose-400 font-medium">{sceneLabel}</span>
          ) : null}
          {sceneLabel ? <span className="text-white/50 mx-1">·</span> : null}
          <span className="text-white/90 font-medium">Audio: Dialog</span>
          {headerDurationChip ? (
            <>
              <span className="text-white/50 mx-1">·</span>
              <MveDurationChip
                label={headerDurationChip.label}
                variant={headerDurationChip.variant}
                data-testid={headerDurationChip.testId}
              />
            </>
          ) : null}
        </div>
        {headerAddon}
      </div>

      <div className="mx-1 mt-1 flex h-7 shrink-0 items-center gap-0.5 overflow-x-auto overflow-y-hidden rounded-sm border border-white px-1 scrollbar-hide">
        {emotionLabel && !compact ? (
          <MveEmotionChip
            label={emotionLabel}
            onRemove={
              onSaveDirection
                ? () => void handleClearDirectionEmotion()
                : undefined
            }
            removeAriaLabel="Emotion entfernen"
            data-testid="mve-direction-emotion-chip"
          />
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

      <div
        className={cn(
          "relative mx-1 mb-1 mt-1 flex min-h-0 flex-1 flex-col overflow-y-auto rounded-sm px-1.5 py-1 transition-[border-color,box-shadow]",
          textareaFocused
            ? "border border-violet-400 shadow-[0_0_0_1px_var(--color-violet-400)]"
            : "border border-transparent",
        )}
        data-testid="mve-dialog-clip-textarea-shell"
        data-focused={textareaFocused ? "true" : "false"}
      >
        <MveDialogTextEditor
          ref={editor.textareaRef as React.RefObject<HTMLDivElement>}
          value={editor.text}
          onChange={editor.setText}
          onRemoveTag={editor.removeTag}
          placeholder="Dialogtext eingeben…"
          data-testid="mve-text-block-textarea"
          className="min-h-0 w-full"
          onFocus={handleTextareaFocus}
          onBlur={handleTextareaBlur}
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
        hasAudioClip={hasAudioClip}
        audioDurationSec={audioDurationSec}
      />
    </div>
  );
}
