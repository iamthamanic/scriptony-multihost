/**
 * Connection UI for local workspace storage (Desktop Speicher tab).
 *
 * Location: src/components/settings/LocalStorageProviderPanel.tsx
 */

import { FolderOpen, Link2 } from "lucide-react";
import { Button } from "../ui/button";
import { useLocalWorkspace } from "@/hooks/useLocalWorkspace";

export function LocalStorageProviderPanel() {
  const { workspaceRoot, chooseWorkspaceFolder, isLoading } =
    useLocalWorkspace();

  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-3 space-y-3">
      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Link2 className="size-4" />
        Workspace-Ordner
      </p>
      {workspaceRoot ? (
        <p className="text-xs font-mono break-all text-foreground">
          {workspaceRoot}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Noch kein Workspace gewählt. Beim ersten Start der Desktop-App wirst
          du aufgefordert, einen Ordner zu wählen.
        </p>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isLoading}
        onClick={() => void chooseWorkspaceFolder()}
      >
        <FolderOpen className="size-3 mr-1" />
        {workspaceRoot ? "Workspace wechseln" : "Workspace wählen"}
      </Button>
    </div>
  );
}
