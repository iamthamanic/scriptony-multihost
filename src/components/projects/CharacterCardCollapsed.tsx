/**
 * Collapsed row view for a character card in the projects detail list.
 * Location: src/components/projects/CharacterCard.tsx
 */
import { ChevronDown, User } from "lucide-react";
import { Badge } from "../ui/badge";
import { CardDescription, CardTitle } from "../ui/card";
import type { CharacterCardCharacter } from "./CharacterCardExpanded";

export interface CharacterCardCollapsedProps {
  character: CharacterCardCharacter;
  onExpand: () => void;
}

export function CharacterCardCollapsed({
  character,
  onExpand,
}: CharacterCardCollapsedProps) {
  return (
    <div
      className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/10 transition-colors"
      onClick={onExpand}
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-muted/30 border-2 border-character-blue-light">
        {character.image ? (
          <img
            src={character.image}
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="size-6 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <CardTitle className="text-sm truncate text-character-blue mb-0.5">
          @{character.name}
        </CardTitle>
        <Badge
          variant="secondary"
          className="w-fit text-xs mb-1 bg-character-blue-light text-character-blue border-0"
        >
          {character.role}
        </Badge>
        <CardDescription className="text-xs line-clamp-1">
          {character.description}
        </CardDescription>
      </div>

      <ChevronDown
        className="size-5 text-muted-foreground shrink-0"
        aria-hidden="true"
      />
    </div>
  );
}
