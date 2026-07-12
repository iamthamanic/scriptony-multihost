/**
 * Blender export panel — desktop only (T42).
 */

import { useEffect, useState } from "react";
import { Box } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { useRuntime } from "@/runtime";
import { useScriptonyBackend } from "@/backend";
import { useLocalProjectOptional } from "@/hooks/useLocalProject";
import { toast } from "sonner";

export function BlenderExportPanel() {
  const runtime = useRuntime();
  const backend = useScriptonyBackend();
  const localProject = useLocalProjectOptional()?.project ?? null;
  const [available, setAvailable] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!runtime.isDesktop) return;
    void backend.blender.isAvailable().then(setAvailable);
    void backend.blender.getInstalledVersion().then(setVersion);
  }, [backend.blender, runtime.isDesktop]);

  if (!runtime.isDesktop) {
    return null;
  }

  const handleExport = async () => {
    if (!localProject) {
      toast.error("Zuerst ein lokales .scriptony-Projekt öffnen.");
      return;
    }
    setBusy(true);
    try {
      const exportDir = `${localProject.dirPath}/exports/blender`;
      const result = await backend.blender.exportProject({
        source: "local",
        projectDir: localProject.dirPath,
        projectId: localProject.projectId,
        exportDir,
      });
      toast.success(`Export erstellt: ${result.manifestPath}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Blender-Export fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Box className="size-5" />
          Blender Export
        </CardTitle>
        <CardDescription>
          Export-Paket für Blender (Desktop). Live-Sync folgt in einem späteren
          Ticket.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Blender: {available ? "gefunden" : "nicht gefunden"}
          {version ? ` (${version})` : ""}
        </p>
        <Button
          type="button"
          disabled={busy || !available}
          onClick={handleExport}
        >
          Export für Blender
        </Button>
      </CardContent>
    </Card>
  );
}
