/**
 * Read-only detail sections for an expanded character card.
 * Location: src/components/projects/CharacterCardExpandedBody.tsx
 */
import { Badge } from "../ui/badge";
import { CardDescription } from "../ui/card";
import type { CharacterCardCharacter } from "./CharacterCardExpanded";

export interface CharacterCardReadDetailsProps {
  character: CharacterCardCharacter;
}

export function CharacterCardReadDetails({
  character,
}: CharacterCardReadDetailsProps) {
  return (
    <div className="space-y-2">
      <Badge variant="secondary" className="w-fit">
        {character.role}
      </Badge>
      <CardDescription className="text-sm">
        {character.description}
      </CardDescription>
      {(character.age || character.gender || character.species) && (
        <div className="flex gap-2 flex-wrap text-xs text-muted-foreground">
          {character.age && <span>Alter: {character.age}</span>}
          {character.gender && <span>• {character.gender}</span>}
          {character.species && <span>• {character.species}</span>}
        </div>
      )}
      {character.backgroundStory && (
        <div className="mt-2">
          <p className="text-xs font-bold mb-1">Background:</p>
          <CardDescription className="text-xs">
            {character.backgroundStory}
          </CardDescription>
        </div>
      )}
      {character.skills && (
        <div className="mt-2">
          <p className="text-xs font-bold mb-1">Skills:</p>
          <CardDescription className="text-xs">
            {character.skills}
          </CardDescription>
        </div>
      )}
      {character.strengths && (
        <div className="mt-2">
          <p className="text-xs font-bold mb-1">Stärken:</p>
          <CardDescription className="text-xs">
            {character.strengths}
          </CardDescription>
        </div>
      )}
      {character.weaknesses && (
        <div className="mt-2">
          <p className="text-xs font-bold mb-1">Schwächen:</p>
          <CardDescription className="text-xs">
            {character.weaknesses}
          </CardDescription>
        </div>
      )}
      {character.characterTraits && (
        <div className="mt-2">
          <p className="text-xs font-bold mb-1">Traits:</p>
          <CardDescription className="text-xs">
            {character.characterTraits}
          </CardDescription>
        </div>
      )}
    </div>
  );
}
