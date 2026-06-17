/**
 * Confirm deletion of an audio lane (clips only, or character + dialog lane).
 * Location: src/components/audio/AudioLaneDeleteAlertDialog.tsx
 */

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import type { Character } from "../../lib/types";

export type LaneDeleteRequest =
  | { kind: "clips"; laneIndex: number; clipCount: number }
  | {
      kind: "character";
      laneIndex: number;
      clipCount: number;
      character: Character;
    };

export interface AudioLaneDeleteAlertDialogProps {
  open: boolean;
  pending: LaneDeleteRequest | null;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function AudioLaneDeleteAlertDialog({
  open,
  pending,
  loading,
  onOpenChange,
  onConfirm,
}: AudioLaneDeleteAlertDialogProps) {
  const isCharacter = pending?.kind === "character";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="size-5 text-red-500" aria-hidden />
            </div>
            <AlertDialogTitle>
              {isCharacter ? "Charakter-Spur löschen?" : "Audio-Spur löschen?"}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              {isCharacter ? (
                <>
                  <p>
                    Bist du dir sicher? Die Dialog-Spur von{" "}
                    <strong>{pending.character.name}</strong> wird entfernt —
                    und der <strong>gesamte Charakter</strong> wird aus dem
                    Projekt gelöscht.
                  </p>
                  {pending.clipCount > 0 ? (
                    <p>
                      Zusätzlich werden{" "}
                      <strong>
                        {pending.clipCount} Audio-Clip
                        {pending.clipCount > 1 ? "s" : ""}
                      </strong>{" "}
                      auf dieser Spur gelöscht.
                    </p>
                  ) : null}
                </>
              ) : (
                <p>
                  {pending?.clipCount ?? 0} Audio-Clip
                  {(pending?.clipCount ?? 0) > 1 ? "s" : ""} von dieser Spur
                  endgültig löschen?
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Abbrechen</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-4" aria-hidden />
            )}
            {isCharacter ? "Charakter löschen" : "Spur löschen"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
