/**
 * Inline dialog text editor for MVE clips on AudioTimelineSegment.
 * Location: src/components/audio/AudioTimelineSegmentMveText.tsx
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { MveLineDirection } from "@/lib/multi-voice-engine/schema/line-direction";
import { MveLineInspector } from "@/components/structure/timeline/mve/MveLineInspector";

export interface AudioTimelineSegmentMveTextProps {
  line: MveLine;
  disabled?: boolean;
  onSaveText: (lineId: string, text: string) => Promise<void>;
  onSaveDirection: (
    lineId: string,
    direction: MveLineDirection,
  ) => Promise<void>;
}

export function AudioTimelineSegmentMveText({
  line,
  disabled,
  onSaveText,
  onSaveDirection,
}: AudioTimelineSegmentMveTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(line.text ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(line.text ?? "");
  }, [line.text, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = async () => {
    const trimmed = draft.trim();
    if (trimmed === (line.text ?? "").trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSaveText(line.id, trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const displayText = line.text?.trim() || "Text hinzufügen…";
  const isDirty = line.status === "dirty";

  return (
    <div className="flex items-center gap-1 min-w-0 flex-1">
      <MveLineInspector
        direction={line.direction}
        disabled={disabled || saving}
        onSave={(direction) => onSaveDirection(line.id, direction)}
      />
      {isDirty && (
        <span
          className="shrink-0 text-[8px] uppercase tracking-wide bg-white/25 px-1 rounded"
          title="Änderungen noch nicht neu gerendert"
        >
          dirty
        </span>
      )}
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          disabled={disabled || saving}
          className="min-w-0 flex-1 bg-black/20 border border-white/30 rounded px-1 py-0 text-[10px] text-white placeholder:text-white/60"
          placeholder="Dialogtext…"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commit();
            }
            if (e.key === "Escape") {
              setDraft(line.text ?? "");
              setEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      ) : (
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "truncate font-medium text-left min-w-0 flex-1",
            !line.text?.trim() && "italic opacity-80",
          )}
          title={displayText}
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
        >
          {displayText}
        </button>
      )}
    </div>
  );
}
