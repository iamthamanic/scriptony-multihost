/**
 * Delete cloud account with warnings and password confirmation.
 * Location: src/components/settings/cloud-account/CloudAccountDeleteCard.tsx
 */

import { AlertTriangle, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  isDemoMode: boolean;
  deletePassword: string;
  deletingAccount: boolean;
  deleteDialogOpen: boolean;
  onDeletePasswordChange: (v: string) => void;
  onDeleteDialogOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
};

export function CloudAccountDeleteCard({
  isDemoMode,
  deletePassword,
  deletingAccount,
  deleteDialogOpen,
  onDeletePasswordChange,
  onDeleteDialogOpenChange,
  onConfirmDelete,
}: Props) {
  return (
    <Card className="border-destructive/40">
      <CardHeader className="p-4">
        <CardTitle className="text-base text-destructive">
          Konto löschen
        </CardTitle>
        <CardDescription className="text-xs">
          Cloud-Projekte und Kontodaten in der Scriptony-Datenbank
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription className="text-xs">
            Deine Cloud-Projekte werden als gelöscht markiert,
            Integrations-Tokens und Profildaten in der Scriptony-Datenbank
            werden entfernt, das Appwrite-Konto wird gelöscht. Sichere wichtige
            Daten vorher (Export/Backup). Lokale Projekte auf diesem Rechner
            bleiben erhalten. Dateien in Appwrite-Storage-Buckets können separat
            verbleiben.
          </AlertDescription>
        </Alert>
        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={onDeleteDialogOpenChange}
        >
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="w-full h-11"
              disabled={isDemoMode}
            >
              <Trash2 className="size-4 mr-2" />
              Cloud-Konto löschen
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cloud-Konto wirklich löschen?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    Cloud-Projekte, Kontodaten und die Anmeldung werden
                    unwiderruflich entfernt.
                  </p>
                  <p>
                    Bitte exportiere oder sichere alles Wichtige, bevor du
                    fortfährst. Lokale Dateien auf diesem Gerät werden nicht
                    gelöscht.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="delete-password" className="text-sm">
                Aktuelles Passwort zur Bestätigung
              </Label>
              <Input
                id="delete-password"
                type="password"
                className="h-11"
                value={deletePassword}
                onChange={(e) => onDeletePasswordChange(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingAccount}>
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deletingAccount}
                onClick={(e) => {
                  e.preventDefault();
                  onConfirmDelete();
                }}
              >
                {deletingAccount ? "Wird gelöscht …" : "Endgültig löschen"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
