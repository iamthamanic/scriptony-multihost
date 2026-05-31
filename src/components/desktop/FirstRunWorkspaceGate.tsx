/**
 * First-run gate: pick Scriptony workspace folder on desktop local mode (T44).
 *
 * Location: src/components/desktop/FirstRunWorkspaceGate.tsx
 */

import { useState } from "react";
import { FolderOpen, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { useLocalWorkspace } from "@/hooks/useLocalWorkspace";
import scriptonyLogo from "@/assets/scriptony-logo.png";

export function FirstRunWorkspaceGate() {
  const {
    chooseWorkspaceFolder,
    isLoading,
    loadError,
    workspaceRoot,
    refresh,
  } = useLocalWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const displayError = error ?? loadError;

  const onPick = async () => {
    setBusy(true);
    setError(null);
    try {
      const path = await chooseWorkspaceFolder();
      if (!path) return;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ordner konnte nicht gesetzt werden.",
      );
    } finally {
      setBusy(false);
    }
  };

  const pending = isLoading || busy;

  return (
    <div className="min-h-[calc(100dvh-8rem)] flex flex-col items-center justify-center gap-8 px-6">
      <img
        src={scriptonyLogo}
        alt="Scriptony"
        className="w-20 h-20 object-contain"
      />
      <div className="max-w-lg text-center space-y-3">
        <h1 className="text-2xl font-semibold">Workspace einrichten</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Wähle einen Ordner, in dem Scriptony deine lokalen Projekte ablegt.
          Jedes Projekt wird als Unterordner mit der Endung{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">
            .scriptony
          </code>{" "}
          gespeichert — z. B. unter{" "}
          <span className="font-medium">Dokumente/Scriptony</span>.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button size="lg" onClick={() => void onPick()} disabled={pending}>
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FolderOpen className="mr-2 h-4 w-4" />
          )}
          {workspaceRoot ? "Anderen Ordner wählen…" : "Ordner wählen…"}
        </Button>
        {workspaceRoot && loadError ? (
          <Button
            size="lg"
            variant="outline"
            onClick={() => void refresh()}
            disabled={pending}
          >
            Erneut laden
          </Button>
        ) : null}
      </div>
      {workspaceRoot ? (
        <p className="text-xs font-mono text-muted-foreground max-w-lg text-center break-all">
          Gewählt: {workspaceRoot}
        </p>
      ) : null}
      {displayError ? (
        <p className="text-sm text-destructive max-w-md text-center">
          {displayError}
        </p>
      ) : null}
    </div>
  );
}
