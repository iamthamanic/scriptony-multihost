/**
 * Ensures a local .scriptony project session is open before ProjectsPage (T54/T59).
 * REFACTORED: extracted useEnsureLocalProjectOpen hook (T26).
 */

import { type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { useEnsureLocalProjectOpen } from "@/hooks/useEnsureLocalProjectOpen";

interface LocalProjectOpenGuardProps {
  projectId: string;
  onNavigate: (page: string, id?: string) => void;
  children: ReactNode;
}

export function LocalProjectOpenGuard({
  projectId,
  onNavigate,
  children,
}: LocalProjectOpenGuardProps) {
  const { opening, openError, sessionMatches } = useEnsureLocalProjectOpen(projectId);

  if (opening) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Projekt wird geöffnet…</p>
      </div>
    );
  }

  if (openError || !sessionMatches) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {openError ??
            "Dieses Projekt konnte nicht geöffnet werden. Bitte erneut aus der Projektliste wählen."}
        </p>
        <Button onClick={() => onNavigate("projekte")}>Zur Projektliste</Button>
      </div>
    );
  }

  return <>{children}</>;
}
