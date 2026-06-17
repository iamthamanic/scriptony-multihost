/**
 * Thin wrapper switching between edit form and read-only character details.
 * Location: src/components/projects/CharacterCardExpanded.tsx
 */
import type {
  CharacterCardCharacter,
  CharacterEditState,
} from "./CharacterCardExpanded";
import { CharacterCardEditForm } from "./CharacterCardEditForm";
import { CharacterCardReadDetails } from "./CharacterCardReadDetails";

export interface CharacterCardExpandedBodyProps {
  character: CharacterCardCharacter;
  isEditing: boolean;
  edited: CharacterEditState;
  onEditedChange: (field: keyof CharacterEditState, value: string) => void;
}

export function CharacterCardExpandedBody({
  character,
  isEditing,
  edited,
  onEditedChange,
}: CharacterCardExpandedBodyProps) {
  if (isEditing) {
    return (
      <CharacterCardEditForm edited={edited} onEditedChange={onEditedChange} />
    );
  }

  return <CharacterCardReadDetails character={character} />;
}
