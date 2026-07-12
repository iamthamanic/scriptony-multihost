import { forwardRef, useRef, useImperativeHandle, type ReactNode } from "react";
import { cn } from "../ui/utils";
import { Textarea } from "../ui/textarea";

interface HighlightedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value?: string;
  highlightPattern?: RegExp;
  highlightClassName?: string;
  /** Custom overlay node for each pattern match (overrides highlightClassName). */
  renderHighlight?: (match: string) => ReactNode;
  /** Typography/padding for the highlight overlay — must match `className` on the textarea. */
  overlayClassName?: string;
  /** Shared font metrics applied to overlay + textarea (caret alignment). */
  mirrorClassName?: string;
  /** Wrapper around textarea + overlay (e.g. focus ring). */
  containerClassName?: string;
}

/**
 * HighlightedTextarea - Textarea with @-mention syntax highlighting
 * Uses backdrop technique: Normal text uses same color as regular textarea, @mentions are highlighted
 */
export const HighlightedTextarea = forwardRef<
  HTMLTextAreaElement,
  HighlightedTextareaProps
>((props, ref) => {
  const {
    value = "",
    highlightPattern = /@\\w+/g,
    highlightClassName = "text-[#60A5FA] font-bold",
    renderHighlight,
    overlayClassName,
    mirrorClassName,
    containerClassName,
    className,
    onChange,
    onScroll,
    style,
    ...restProps
  } = props;

  const backdropRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Expose textarea ref to parent
  useImperativeHandle(ref, () => textareaRef.current!);

  // Sync scroll between textarea and backdrop
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (backdropRef.current && textareaRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    onScroll?.(e);
  };

  // Render highlighted text in backdrop
  const renderHighlightedText = () => {
    if (!value) return null;

    const parts: ReactNode[] = [];
    let lastIndex = 0;

    const text = String(value);
    const matches = Array.from(text.matchAll(highlightPattern));

    matches.forEach((match, matchIdx) => {
      const matchStart = match.index!;
      const matchEnd = matchStart + match[0].length;

      // Add normal text before match - inherits color from parent
      if (matchStart > lastIndex) {
        const normalText = text.slice(lastIndex, matchStart);
        parts.push(<span key={`normal-${matchIdx}`}>{normalText}</span>);
      }

      parts.push(
        renderHighlight ? (
          <span key={`highlight-${matchIdx}`} className="inline align-baseline">
            {renderHighlight(match[0])}
          </span>
        ) : (
          <span key={`highlight-${matchIdx}`} className={highlightClassName}>
            {match[0]}
          </span>
        ),
      );

      lastIndex = matchEnd;
    });

    // Add remaining normal text - inherits color from parent
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      parts.push(<span key="normal-end">{remainingText}</span>);
    }

    return parts;
  };

  return (
    <div className={cn("relative h-full w-full", containerClassName)}>
      {/* Highlight overlay behind textarea so the caret stays visible on top. */}
      <div
        ref={backdropRef}
        className={cn(
          "absolute inset-0 z-0 overflow-auto pointer-events-none",
          "whitespace-pre-wrap",
          mirrorClassName,
          overlayClassName ??
            "p-2 text-[13px] leading-[1.5] text-[#0A0A0A] dark:text-[#EDE9FE]",
        )}
        aria-hidden="true"
      >
        {renderHighlightedText()}
      </div>

      <Textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onScroll={handleScroll}
        className={cn(
          "relative z-10 overflow-auto",
          mirrorClassName,
          "text-transparent caret-gray-900 dark:caret-gray-100",
          "[&::selection]:bg-blue-500/30",
          className,
        )}
        style={style}
        {...restProps}
      />
    </div>
  );
});

HighlightedTextarea.displayName = "HighlightedTextarea";
