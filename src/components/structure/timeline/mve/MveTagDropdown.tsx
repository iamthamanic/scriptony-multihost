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

export interface MveTagDropdownProps {
  onInsert: (tag: MveTag) => void;
  disabled?: boolean;
}

export function MveTagDropdown({ onInsert, disabled }: MveTagDropdownProps) {
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
          <Tag className="size-4 mr-1.5" />
          Tags
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
