/**
 * Expanded edit/read view with form fields for a character card.
 * Location: src/components/projects/CharacterCard.tsx
 */
import type { ChangeEvent, RefObject } from "react";
import { Camera, ChevronDown, Edit2, Save, Trash2, User } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { CharacterCardExpandedBody } from "./CharacterCardExpandedBody";

export interface CharacterCardCharacter {
  id: string;
  name: string;
  role: string;
  description: string;
  age?: string;
  gender?: string;
  species?: string;
  backgroundStory?: string;
  skills?: string;
  strengths?: string;
  weaknesses?: string;
  characterTraits?: string;
  image?: string;
  referenceImages?: string[];
  lastEdited: Date;
}

export interface CharacterEditState {
  name: string;
  role: string;
  description: string;
  age: string;
  gender: string;
  species: string;
  backgroundStory: string;
  skills: string;
  strengths: string;
  weaknesses: string;
  characterTraits: string;
}

export function createEditStateFromCharacter(
  character: CharacterCardCharacter,
): CharacterEditState {
  return {
    name: character.name,
    role: character.role,
    description: character.description,
    age: character.age || "",
    gender: character.gender || "",
    species: character.species || "",
    backgroundStory: character.backgroundStory || "",
    skills: character.skills || "",
    strengths: character.strengths || "",
    weaknesses: character.weaknesses || "",
    characterTraits: character.characterTraits || "",
  };
}

export interface CharacterCardExpandedProps {
  character: CharacterCardCharacter;
  isEditing: boolean;
  edited: CharacterEditState;
  onEditedChange: (field: keyof CharacterEditState, value: string) => void;
  onToggleEdit: () => void;
  onDelete: () => void;
  onCollapse: () => void;
  onImageClick: () => void;
  onImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  imageInputRef: RefObject<HTMLInputElement | null>;
}

export function CharacterCardExpanded({
  character,
  isEditing,
  edited,
  onEditedChange,
  onToggleEdit,
  onDelete,
  onCollapse,
  onImageClick,
  onImageChange,
  imageInputRef,
}: CharacterCardExpandedProps) {
  return (
    <CardHeader className="p-4">
      <div className="flex items-center justify-end gap-2 mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleEdit}
          className="h-7 px-3 shrink-0 rounded-[10px] bg-muted hover:bg-muted/80 text-muted-foreground dark:text-foreground"
        >
          {isEditing ? (
            <>
              <Save className="size-3 mr-1" />
              <span className="text-xs">Speichern</span>
            </>
          ) : (
            <>
              <Edit2 className="size-3 mr-1" />
              <span className="text-xs">Bearbeiten</span>
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-7 px-3 shrink-0 rounded-[10px] bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
        >
          <Trash2 className="size-3 mr-1" />
          <span className="text-xs">Löschen</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCollapse}
          className="h-7 px-2 shrink-0 rounded-[10px] bg-muted hover:bg-muted/80 text-muted-foreground dark:text-foreground"
          aria-label="Charakterkarte einklappen"
        >
          <ChevronDown className="size-4 rotate-180" />
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="shrink-0">
          {character.image ? (
            isEditing ? (
              <button
                type="button"
                onClick={onImageClick}
                aria-label="Charakterbild ändern"
                className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-character-blue-light hover:border-character-blue transition-colors cursor-pointer group"
              >
                <img
                  src={character.image}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="size-5 text-white" />
                </div>
              </button>
            ) : (
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-character-blue-light">
                <img
                  src={character.image}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )
          ) : isEditing ? (
            <button
              type="button"
              onClick={onImageClick}
              aria-label="Charakterbild hochladen"
              className="w-16 h-16 rounded-full border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center bg-muted/10"
            >
              <Camera className="size-6 text-muted-foreground" />
            </button>
          ) : (
            <div className="w-16 h-16 rounded-full border-2 border-character-blue-light flex items-center justify-center bg-muted/10">
              <User className="size-8 text-muted-foreground" />
            </div>
          )}
          {isEditing && (
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={onImageChange}
              className="hidden"
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <div className="shrink-0 rounded-lg border border-border bg-card flex items-center justify-center px-3 h-8">
                <span className="text-base text-character-blue">@</span>
              </div>
              <div className="flex-1 rounded-lg border border-border bg-character-blue-light flex items-center h-8 overflow-hidden">
                <Input
                  value={edited.name}
                  onChange={(e) => onEditedChange("name", e.target.value)}
                  className="h-full border-0 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-character-blue px-3"
                  placeholder="Charakter-Name"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="shrink-0 rounded-lg border border-border bg-card flex items-center justify-center px-3 h-8">
                <span className="text-base text-character-blue">@</span>
              </div>
              <div className="flex-1 rounded-lg border border-border bg-character-blue-light flex items-center px-3 h-8">
                <p className="text-base text-character-blue">
                  {character.name}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <CharacterCardExpandedBody
        character={character}
        isEditing={isEditing}
        edited={edited}
        onEditedChange={onEditedChange}
      />

      <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/15 border-0 w-fit">
        {character.lastEdited.toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}
        ,{" "}
        {character.lastEdited.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        })}{" "}
        Uhr
      </Badge>
    </CardHeader>
  );
}
