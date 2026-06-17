/**
 * Dialog to create a new style profile from template (8 presets + 2 base).
 * Location: src/components/projects/styles/CreateStyleProfileDialog.tsx
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Checkbox } from "../../ui/checkbox";
import { ScrollArea } from "../../ui/scroll-area";
import {
  STYLE_PROFILE_TEMPLATES,
  type StyleProfileTemplateId,
} from "@/lib/api/style-profile-api";

interface CreateStyleProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: {
    name: string;
    templateId: StyleProfileTemplateId;
    setActive: boolean;
  }) => void;
  loading?: boolean;
}

export function CreateStyleProfileDialog({
  open,
  onOpenChange,
  onCreate,
  loading,
}: CreateStyleProfileDialogProps) {
  const [name, setName] = useState("");
  const [templateId, setTemplateId] =
    useState<StyleProfileTemplateId>("cutout_satire");
  const [setActive, setSetActive] = useState(true);

  const selected = STYLE_PROFILE_TEMPLATES.find((t) => t.id === templateId);

  const handleSubmit = () => {
    const trimmed = name.trim() || selected?.labelDe || "Projekt-Style";
    onCreate({ name: trimmed, templateId, setActive });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Neues Style Profile</DialogTitle>
          <DialogDescription>
            Wähle eine Referenz-Vorlage oder Basis-Template.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-2">
            <Label htmlFor="style-profile-name">Name</Label>
            <Input
              id="style-profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={selected?.labelDe ?? "Projekt-Style"}
            />
          </div>
          <div className="space-y-2">
            <Label>Vorlage</Label>
            <ScrollArea className="h-[220px] rounded-md border p-2">
              <div className="grid gap-2 sm:grid-cols-2">
                {STYLE_PROFILE_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplateId(t.id)}
                    className={`text-left rounded-md border p-3 text-sm transition-colors ${
                      templateId === t.id
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "hover:border-primary/40"
                    }`}
                  >
                    <p className="font-medium leading-tight">{t.labelDe}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {t.descriptionDe}
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={setActive}
              onCheckedChange={(checked) => setSetActive(checked === true)}
            />
            Als aktives Projekt-Style setzen
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90"
            disabled={loading}
            onClick={handleSubmit}
          >
            Erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
