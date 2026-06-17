/**
 * Edit-mode form fields for an expanded character card.
 * Location: src/components/projects/CharacterCardExpandedBody.tsx
 */
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import type { CharacterEditState } from "./CharacterCardExpanded";

export interface CharacterCardEditFormProps {
  edited: CharacterEditState;
  onEditedChange: (field: keyof CharacterEditState, value: string) => void;
}

export function CharacterCardEditForm({
  edited,
  onEditedChange,
}: CharacterCardEditFormProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground font-bold">Rolle</Label>
        <Input
          value={edited.role}
          onChange={(e) => onEditedChange("role", e.target.value)}
          className="h-9 border-2"
          placeholder="z.B. Protagonist, Antagonist, Unterstützer"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground font-bold">
          Beschreibung
        </Label>
        <Textarea
          value={edited.description}
          onChange={(e) => onEditedChange("description", e.target.value)}
          rows={2}
          className="border-2"
          placeholder="Kurze Zusammenfassung des Charakters..."
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-bold">
            Alter
          </Label>
          <Input
            value={edited.age}
            onChange={(e) => onEditedChange("age", e.target.value)}
            className="h-9 border-2"
            placeholder="35"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-bold">
            Geschlecht
          </Label>
          <Input
            value={edited.gender}
            onChange={(e) => onEditedChange("gender", e.target.value)}
            className="h-9 border-2"
            placeholder="Female"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-bold">
            Spezies
          </Label>
          <Input
            value={edited.species}
            onChange={(e) => onEditedChange("species", e.target.value)}
            className="h-9 border-2"
            placeholder="Human"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground font-bold">
          Background Story
        </Label>
        <Textarea
          value={edited.backgroundStory}
          onChange={(e) => onEditedChange("backgroundStory", e.target.value)}
          rows={3}
          className="border-2"
          placeholder="Die Hintergrundgeschichte des Charakters - Herkunft, wichtige Ereignisse, Motivation..."
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground font-bold">
          Skills
        </Label>
        <Textarea
          value={edited.skills}
          onChange={(e) => onEditedChange("skills", e.target.value)}
          rows={2}
          className="border-2"
          placeholder="Fähigkeiten kommagetrennt (z.B. Piloting, Schwertkampf, Hacking)"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground font-bold">
          Stärken
        </Label>
        <Textarea
          value={edited.strengths}
          onChange={(e) => onEditedChange("strengths", e.target.value)}
          rows={2}
          className="border-2"
          placeholder="Was macht den Charakter stark? (z.B. Entscheidungsfreudig, Mutig, Intelligent)"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground font-bold">
          Schwächen
        </Label>
        <Textarea
          value={edited.weaknesses}
          onChange={(e) => onEditedChange("weaknesses", e.target.value)}
          rows={2}
          className="border-2"
          placeholder="Schwachstellen und Verletzlichkeiten (z.B. Impulsiv, Vertrauensselig, Sturköpfig)"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground font-bold">
          Charakter Traits
        </Label>
        <Textarea
          value={edited.characterTraits}
          onChange={(e) => onEditedChange("characterTraits", e.target.value)}
          rows={2}
          className="border-2"
          placeholder="Persönlichkeitsmerkmale (z.B. Mutig, Sarkastisch, Mitfühlend, Neugierig)"
        />
      </div>
    </div>
  );
}
