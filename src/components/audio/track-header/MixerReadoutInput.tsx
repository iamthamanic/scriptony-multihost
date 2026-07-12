/**
 * MixerReadoutInput — editable dB / pan readout beside track sliders.
 */

import { useEffect, useState } from "react";
import { cn } from "../../../lib/utils";

export interface MixerReadoutInputProps {
  displayValue: string;
  parse: (raw: string) => number | null;
  onCommit: (value: number) => void;
  ariaLabel: string;
  title?: string;
  className?: string;
}

export function MixerReadoutInput({
  displayValue,
  parse,
  onCommit,
  ariaLabel,
  title,
  className,
}: MixerReadoutInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(displayValue);

  useEffect(() => {
    if (!focused) setDraft(displayValue);
  }, [displayValue, focused]);

  const commit = () => {
    const parsed = parse(draft);
    if (parsed !== null) onCommit(parsed);
    setFocused(false);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? draft : displayValue}
      title={title ?? displayValue}
      aria-label={ariaLabel}
      className={cn(
        "h-5 w-full min-w-0 rounded border border-transparent bg-transparent",
        "px-0.5 text-right text-[9px] tabular-nums text-muted-foreground",
        "focus:border-border focus:bg-background focus:text-foreground focus:outline-none",
        className,
      )}
      onFocus={() => {
        setDraft(displayValue);
        setFocused(true);
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          setDraft(displayValue);
          setFocused(false);
          e.currentTarget.blur();
        }
      }}
    />
  );
}
