/**
 * Dialog to name a voice design candidate before persisting.
 * Location: src/components/characters/VoiceDesignSaveDialog.tsx
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface VoiceDesignSaveDialogProps {
  open: boolean;
  defaultName?: string;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string) => void;
}

export function VoiceDesignSaveDialog({
  open,
  defaultName = "",
  busy,
  onOpenChange,
  onConfirm,
}: VoiceDesignSaveDialogProps) {
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (open) setName(defaultName);
  }, [open, defaultName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        data-testid="voice-design-save-dialog"
      >
        <DialogHeader>
          <DialogTitle>Stimme speichern</DialogTitle>
          <DialogDescription>
            Gib der gewählten Stimme einen Namen. Sie erscheint unter Eigene
            Stimmen.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-1">
          <Label htmlFor="voice-design-save-name" className="text-xs font-bold">
            Stimmenname
          </Label>
          <Input
            id="voice-design-save-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Max — warme Erzählerstimme"
            disabled={busy}
            data-testid="voice-design-save-name-input"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            disabled={!name.trim() || busy}
            onClick={() => onConfirm(name.trim())}
            data-testid="voice-design-save-confirm"
          >
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
