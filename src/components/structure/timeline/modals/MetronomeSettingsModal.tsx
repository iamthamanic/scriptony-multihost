/**
 * MetronomeSettingsModal — BPM, time signature, and count-in beats (T31).
 * Location: src/components/structure/timeline/modals/MetronomeSettingsModal.tsx
 */

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../ui/dialog";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/select";
import type { MetronomeConfig } from "@/lib/audio/metronome-config";

export interface MetronomeSettingsModalProps {
  open: boolean;
  config: MetronomeConfig;
  onSave: (config: MetronomeConfig) => void;
  onClose: () => void;
}

export function MetronomeSettingsModal({
  open,
  config,
  onSave,
  onClose,
}: MetronomeSettingsModalProps) {
  const [draft, setDraft] = useState(config);

  useEffect(() => {
    if (open) setDraft(config);
  }, [open, config]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent data-testid="metronome-settings-modal">
        <DialogHeader>
          <DialogTitle>Metronom — Count-in</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Vor jeder Aufnahme spielt ein Count-in. BPM 0 = ein einzelner Klick.
        </p>
        <div className="grid gap-3 py-2">
          <div className="flex items-center gap-2">
            <input
              id="metronome-enabled"
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, enabled: e.target.checked }))
              }
              className="size-3.5"
            />
            <Label htmlFor="metronome-enabled" className="text-sm">
              Count-in vor Aufnahme
            </Label>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="metronome-bpm">BPM</Label>
            <Input
              id="metronome-bpm"
              type="number"
              min={0}
              max={300}
              value={draft.bpm}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  bpm: Math.max(0, Number(e.target.value) || 0),
                }))
              }
              data-testid="metronome-bpm-input"
            />
          </div>
          <div className="grid gap-1">
            <Label>Takt</Label>
            <Select
              value={String(draft.beatsPerBar)}
              onValueChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  beatsPerBar: Number(value) as MetronomeConfig["beatsPerBar"],
                }))
              }
            >
              <SelectTrigger data-testid="metronome-time-signature">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2/4</SelectItem>
                <SelectItem value="3">3/4</SelectItem>
                <SelectItem value="4">4/4</SelectItem>
                <SelectItem value="6">6/8</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="metronome-count-in">Count-in (Schläge)</Label>
            <Input
              id="metronome-count-in"
              type="number"
              min={1}
              max={8}
              value={draft.countInBeats}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  countInBeats: Math.min(
                    8,
                    Math.max(1, Number(e.target.value) || 1),
                  ),
                }))
              }
              data-testid="metronome-count-in-input"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            data-testid="metronome-settings-save"
          >
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
