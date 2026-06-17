/**
 * Collapsible character card with inline edit, image crop upload, and delete.
 * Location: ProjectsPage project detail characters section.
 */
import { Suspense, lazy, useRef, useState, type ChangeEvent } from "react";
import { Card } from "../ui/card";
import { CharacterCardCollapsed } from "./CharacterCardCollapsed";
import {
  CharacterCardExpanded,
  createEditStateFromCharacter,
  type CharacterCardCharacter,
  type CharacterEditState,
} from "./CharacterCardExpanded";

const ImageCropDialog = lazy(() =>
  import("../shared/ImageCropDialog").then((module) => ({
    default: module.ImageCropDialog,
  })),
);

export type { CharacterCardCharacter };

export interface CharacterCardProps {
  character: CharacterCardCharacter;
  onImageUpload: (characterId: string, imageUrl: string) => void;
  onUpdateDetails: (
    characterId: string,
    updates: {
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
    },
  ) => void;
  onDelete: (characterId: string) => void;
}

export function CharacterCard({
  character,
  onImageUpload,
  onUpdateDetails,
  onDelete,
}: CharacterCardProps) {
  const characterImageInputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [edited, setEdited] = useState<CharacterEditState>(() =>
    createEditStateFromCharacter(character),
  );
  const [tempImageForCrop, setTempImageForCrop] = useState<string | undefined>(
    undefined,
  );
  const [showImageCropDialog, setShowImageCropDialog] = useState(false);

  const handleEditedChange = (
    field: keyof CharacterEditState,
    value: string,
  ) => {
    setEdited((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageClick = () => {
    characterImageInputRef.current?.click();
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImageForCrop(reader.result as string);
        setShowImageCropDialog(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCroppedImage = (croppedImage: string) => {
    onImageUpload(character.id, croppedImage);
    setShowImageCropDialog(false);
    setTempImageForCrop(undefined);
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      onUpdateDetails(character.id, {
        name: edited.name,
        role: edited.role,
        description: edited.description,
        age: edited.age,
        gender: edited.gender,
        species: edited.species,
        backgroundStory: edited.backgroundStory,
        skills: edited.skills,
        strengths: edited.strengths,
        weaknesses: edited.weaknesses,
        characterTraits: edited.characterTraits,
      });
      setIsEditing(false);
    } else {
      setEdited(createEditStateFromCharacter(character));
      setIsEditing(true);
    }
  };

  return (
    <Card className="overflow-hidden">
      {!isExpanded ? (
        <CharacterCardCollapsed
          character={character}
          onExpand={() => setIsExpanded(true)}
        />
      ) : (
        <CharacterCardExpanded
          character={character}
          isEditing={isEditing}
          edited={edited}
          onEditedChange={handleEditedChange}
          onToggleEdit={handleToggleEdit}
          onDelete={() => onDelete(character.id)}
          onCollapse={() => setIsExpanded(false)}
          onImageClick={handleImageClick}
          onImageChange={handleImageChange}
          imageInputRef={characterImageInputRef}
        />
      )}

      {showImageCropDialog && tempImageForCrop && (
        <Suspense fallback={null}>
          <ImageCropDialog
            image={tempImageForCrop}
            onComplete={handleCroppedImage}
            onCancel={() => {
              setShowImageCropDialog(false);
              setTempImageForCrop(undefined);
            }}
          />
        </Suspense>
      )}
    </Card>
  );
}
