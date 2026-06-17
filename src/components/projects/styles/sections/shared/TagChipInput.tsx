/**
 * Tag chip input for style section machineParams (T79).
 * Location: src/components/projects/styles/sections/shared/TagChipInput.tsx
 */

import { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "../../../../ui/badge";
import { Input } from "../../../../ui/input";
import { Button } from "../../../../ui/button";

interface TagChipInputProps {
  label: string;
  tags: string[];
  readOnly?: boolean;
  placeholder?: string;
  tone?: "default" | "do" | "avoid";
  onChange: (tags: string[]) => void;
}

const TONE_CLASS: Record<NonNullable<TagChipInputProps["tone"]>, string> = {
  default: "bg-secondary text-secondary-foreground",
  do: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30",
  avoid: "bg-destructive/10 text-destructive border border-destructive/30",
};

export function TagChipInput({
  label,
  tags,
  readOnly,
  placeholder = "Tag hinzufügen…",
  tone = "default",
  onChange,
}: TagChipInputProps) {
  const [draft, setDraft] = useState("");

  const addTag = (raw: string) => {
    const value = raw.trim();
    if (!value || tags.includes(value)) return;
    onChange([...tags, value]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className={`gap-1 pr-1 ${TONE_CLASS[tone]}`}
          >
            {tag}
            {!readOnly && (
              <button
                type="button"
                className="rounded-full hover:bg-muted p-0.5"
                aria-label={`${tag} entfernen`}
                onClick={() => onChange(tags.filter((t) => t !== tag))}
              >
                <X className="size-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>
      {!readOnly && (
        <div className="flex gap-2">
          <Input
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(draft);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addTag(draft)}
          >
            +
          </Button>
        </div>
      )}
    </div>
  );
}
