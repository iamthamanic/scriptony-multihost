/**
 * React hook — stateful logic for the MVE inline text-block editor (T27).
 * Handles text input, debounced save, tag insertion, and enhance suggestions.
 *
 * Location: src/hooks/useMveTextBlockEditor.ts
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  formatMveTag,
  parseMveTag,
  removeMveTagFromText,
} from "@/lib/mve/tags";
import type { MveTag } from "@/lib/mve/tags";
import {
  getCaretTextOffset,
  setCaretTextOffset,
} from "@/lib/mve/mve-dialog-text-dom";
import type { MveEnhanceLineDraft } from "@/lib/multi-voice-engine/schema/enhance-script";

export interface UseMveTextBlockEditorOptions {
  initialText: string;
  onSave: (text: string) => Promise<void>;
  onEnhance: (rawText: string) => Promise<MveEnhanceLineDraft[] | null>;
  /** Live draft for WPM width preview (not persisted). */
  onDraftTextChange?: (text: string) => void;
}

export function useMveTextBlockEditor({
  initialText,
  onSave,
  onEnhance,
  onDraftTextChange,
}: UseMveTextBlockEditorOptions) {
  const [text, setText] = useState(initialText);
  const [suggestions, setSuggestions] = useState<MveEnhanceLineDraft[] | null>(
    null,
  );
  const [isEnhancing, setIsEnhancing] = useState(false);
  const textareaRef = useRef<HTMLElement | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const insertTag = useCallback(
    (tag: MveTag) => {
      const surface = textareaRef.current;
      const start =
        surface instanceof HTMLTextAreaElement
          ? (surface.selectionStart ?? text.length)
          : surface?.isContentEditable
            ? getCaretTextOffset(surface)
            : text.length;
      const end =
        surface instanceof HTMLTextAreaElement
          ? (surface.selectionEnd ?? start)
          : start;
      const before = text.slice(0, start);
      const after = text.slice(end);
      const token = formatMveTag(tag);
      const needsSpaceBefore =
        before.length > 0 && !/\s$/.test(before) ? " " : "";
      const needsSpaceAfter = after.length > 0 && !/^\s/.test(after) ? " " : "";
      const next = `${before}${needsSpaceBefore}${token}${needsSpaceAfter}${after}`;
      setText(next);
      const caret =
        start + needsSpaceBefore.length + token.length + needsSpaceAfter.length;
      window.requestAnimationFrame(() => {
        if (!surface) return;
        surface.focus();
        if (surface instanceof HTMLTextAreaElement) {
          surface.setSelectionRange(caret, caret);
        } else {
          setCaretTextOffset(surface, caret);
        }
      });
    },
    [text],
  );

  const removeTag = useCallback((tag: MveTag) => {
    setText((prev) => removeMveTagFromText(prev, tag));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const payload = e.dataTransfer.getData("text/plain").trim();
      const tag = parseMveTag(payload);
      if (tag) insertTag(tag);
    },
    [insertTag],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const enhance = useCallback(async () => {
    if (!text.trim()) return;
    setIsEnhancing(true);
    setSuggestions(null);
    const result = await onEnhance(text);
    setSuggestions(result);
    setIsEnhancing(false);
  }, [text, onEnhance]);

  const applySuggestion = useCallback((suggestionText: string) => {
    setText(suggestionText);
    setSuggestions(null);
  }, []);

  const rejectSuggestions = useCallback(() => {
    setSuggestions(null);
  }, []);

  const doSave = useCallback(
    async (value: string) => {
      try {
        await onSave(value);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Speichern fehlgeschlagen.";
        toast.error(msg);
      }
    },
    [onSave],
  );

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (text !== initialText) {
      await doSave(text);
    }
  }, [text, initialText, doSave]);

  useEffect(() => {
    onDraftTextChange?.(text);
  }, [text, onDraftTextChange]);

  useEffect(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      if (text !== initialText) {
        void doSave(text);
      }
    }, 800);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [text, initialText, doSave]);

  return {
    text,
    setText,
    suggestions,
    isEnhancing,
    /** Text surface: `<textarea>` or contenteditable dialog editor. */
    editorRef: textareaRef,
    textareaRef,
    insertTag,
    removeTag,
    handleDrop,
    handleDragOver,
    enhance,
    applySuggestion,
    rejectSuggestions,
    flushSave,
  };
}
