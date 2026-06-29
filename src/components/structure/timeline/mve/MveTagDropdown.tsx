/**
 * MVE Tag Dropdown — shows available `--*` tags and supports click insertion
 * into the inline text editor (T27).
 *
 * Location: src/components/structure/timeline/mve/MveTagDropdown.tsx
 */

import { Tag } from "lucide-react";
import { Button } from "../../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../ui/dropdown-menu";
import { MVE_TAGS, formatMveTag, type MveTag } from "../../../../lib/mve/tags";
import { cn } from "../../../../lib/utils";

export interface MveTagDropdownProps {
  onInsert: (tag: MveTag) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function MveTagDropdown({
  onInsert,
  disabled,
  compact,
}: MveTagDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          aria-label="Tags einfügen"
          title="Tags"
        >
          <Tag className={cn("size-4", !compact && "mr-1.5")} />
          {!compact ? "Tags" : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
        {MVE_TAGS.map((tag) => (
          <DropdownMenuItem
            key={tag}
            onClick={() => onInsert(tag)}
            aria-label={`Tag ${formatMveTag(tag)} einfügen`}
          >
            <span className="text-primary font-medium">
              {formatMveTag(tag)}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
