/**
 * Chat-style contenteditable dialog editor with inline MVE emotion chips.
 * No mirror overlay — native caret placement at click position.
 *
 * Location: src/components/structure/timeline/mve/MveDialogTextEditor.tsx
 */

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { cn } from "@/lib/utils";
import {
  getCaretTextOffset,
  getMveTagRemoveTarget,
  replaceMveDialogTextDom,
  serializeMveDialogText,
  setCaretTextOffset,
} from "@/lib/mve/mve-dialog-text-dom";
import type { MveTag } from "@/lib/mve/tags";

export interface MveDialogTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRemoveTag?: (tag: MveTag) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

export const MveDialogTextEditor = forwardRef<
  HTMLDivElement,
  MveDialogTextEditorProps
>(function MveDialogTextEditor(
  {
    value,
    onChange,
    onRemoveTag,
    onFocus,
    onBlur,
    placeholder,
    className,
    "data-testid": dataTestId,
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const emittedValueRef = useRef(value);

  useImperativeHandle(ref, () => rootRef.current!);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (value === emittedValueRef.current && root.childNodes.length > 0) {
      return;
    }

    const caret =
      document.activeElement === root ? getCaretTextOffset(root) : null;
    replaceMveDialogTextDom(root, value);
    emittedValueRef.current = value;

    if (caret != null) {
      root.focus();
      setCaretTextOffset(root, caret);
    }
  }, [value]);

  const emitChange = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const next = serializeMveDialogText(root);
    emittedValueRef.current = next;
    onChange(next);
  }, [onChange]);

  const handleInput = useCallback(() => {
    emitChange();
  }, [emitChange]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const tag = getMveTagRemoveTarget(event.target);
      if (!tag) return;
      event.preventDefault();
      event.stopPropagation();
      onRemoveTag?.(tag);
    },
    [onRemoveTag],
  );

  const showPlaceholder = !value.trim();

  return (
    <div className="relative min-h-0 w-full">
      {showPlaceholder && placeholder ? (
        <span
          className="pointer-events-none absolute left-0 top-0 text-[10px] leading-[14px] text-white/40"
          aria-hidden="true"
        >
          {placeholder}
        </span>
      ) : null}
      <div
        ref={rootRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-testid={dataTestId}
        className={cn(
          "w-full whitespace-pre-wrap break-words outline-none",
          "text-[10px] leading-[14px] text-white",
          "caret-[var(--color-violet-400)]",
          "[&::selection]:bg-violet-500/30",
          className,
        )}
        style={{ caretColor: "var(--color-violet-400)" }}
        onInput={handleInput}
        onClick={handleClick}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </div>
  );
});
