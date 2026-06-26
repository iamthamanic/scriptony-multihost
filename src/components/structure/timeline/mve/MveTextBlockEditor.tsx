/**
 * MVE Text Block Editor — inline editor shell for dialog text with `--*` tag
 * highlighting, tag dropdown, and confirmable enhance suggestions (T27).
 *
 * Location: src/components/structure/timeline/mve/MveTextBlockEditor.tsx
 */

import { Sparkles, Loader2, X } from "lucide-react";
import { Button } from "../../../ui/button";
import { cn } from "../../../../lib/utils";
import { HighlightedTextarea } from "../../../shared/HighlightedTextarea";
import { MveTagDropdown } from "./MveTagDropdown";
import { MveTagPalette } from "./MveTagPalette";
import { MveEnhanceSuggestions } from "./MveEnhanceSuggestions";
import { useMveTextBlockEditor } from "../../../../hooks/useMveTextBlockEditor";
import { getMveTagPattern } from "../../../../lib/mve/tags";
import type { MveEnhanceLineDraft } from "../../../../lib/multi-voice-engine/schema/enhance-script";

export interface MveTextBlockEditorProps {
  initialText: string;
  onSave: (text: string) => Promise<void>;
  onEnhance: (rawText: string) => Promise<MveEnhanceLineDraft[] | null>;
  onClose: () => void;
  className?: string;
}

export function MveTextBlockEditor({
  initialText,
  onSave,
  onEnhance,
  onClose,
  className,
}: MveTextBlockEditorProps) {
  const editor = useMveTextBlockEditor({ initialText, onSave, onEnhance });

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-background shadow-sm p-2 space-y-2",
        className,
      )}
      onDrop={editor.handleDrop}
      onDragOver={editor.handleDragOver}
      data-testid="mve-text-block-editor"
    >
      <div className="flex items-center gap-2">
        <MveTagDropdown
          onInsert={editor.insertTag}
          disabled={editor.isEnhancing}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!editor.text.trim() || editor.isEnhancing}
          onClick={() => void editor.enhance()}
          data-testid="mve-text-block-enhance"
        >
          {editor.isEnhancing ? (
            <Loader2 className="size-4 animate-spin mr-1.5" />
          ) : (
            <Sparkles className="size-4 mr-1.5" />
          )}
          Enhance
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={async () => {
            await editor.flushSave();
            onClose();
          }}
          aria-label="Editor schließen"
        >
          <X className="size-4" />
        </Button>
      </div>

      <HighlightedTextarea
        ref={editor.textareaRef}
        value={editor.text}
        onChange={(e) => editor.setText(e.target.value)}
        highlightPattern={getMveTagPattern()}
        highlightClassName="text-primary font-bold"
        className="text-sm resize-y min-h-[4rem] font-mono"
        placeholder="Dialogtext eingeben…"
        data-testid="mve-text-block-textarea"
        rows={3}
      />

      <MveTagPalette disabled={editor.isEnhancing} />

      <MveEnhanceSuggestions
        suggestions={editor.suggestions}
        onConfirm={editor.applySuggestion}
        onReject={editor.rejectSuggestions}
      />
    </div>
  );
}
