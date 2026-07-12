/**
 * TrackCharacterRow — avatar + name for character-bound dialog lanes.
 */

import { Link2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { cn } from "../../../lib/utils";
import type { Character } from "../../../lib/types";

export interface TrackCharacterRowProps {
  character: Character;
  laneLinkLabel?: string;
  laneLinkOrphan?: boolean;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function TrackCharacterRow({
  character,
  laneLinkLabel,
  laneLinkOrphan,
  className,
}: TrackCharacterRowProps) {
  return (
    <div
      className={
        className ?? "flex min-w-0 flex-col gap-0.5 overflow-hidden py-0.5"
      }
    >
      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
        <Avatar className="size-5 shrink-0 border border-border/60">
          <AvatarImage src={character.imageUrl} alt="" />
          <AvatarFallback className="text-[8px] font-semibold">
            {initials(character.name)}
          </AvatarFallback>
        </Avatar>
        <span
          className="text-[10px] font-medium text-foreground truncate min-w-0 leading-tight"
          title={character.name}
        >
          {character.name}
        </span>
      </div>
      {laneLinkLabel ? (
        <span
          className={cn(
            "flex min-w-0 items-center gap-0.5 pl-6 text-[8px] truncate leading-tight",
            laneLinkOrphan ? "text-amber-600" : "text-muted-foreground",
          )}
          title={laneLinkLabel}
          data-testid="mve-lane-link-indicator"
        >
          <Link2 className="size-2.5 shrink-0" aria-hidden />
          {laneLinkLabel}
        </span>
      ) : null}
    </div>
  );
}
