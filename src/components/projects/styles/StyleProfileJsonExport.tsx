/**
 * Copy / download JSON export for a style profile.
 * Location: src/components/projects/styles/StyleProfileJsonExport.tsx
 */

import { Download, Copy } from "lucide-react";
import { Button } from "../../ui/button";
import type { StyleProfileExport } from "@/lib/api/style-profile-api";
import { toast } from "sonner";

interface StyleProfileJsonExportProps {
  exportData: StyleProfileExport | null;
  loading?: boolean;
  onExport: () => void;
}

export function StyleProfileJsonExport({
  exportData,
  loading,
  onExport,
}: StyleProfileJsonExportProps) {
  const handleCopy = async () => {
    if (!exportData) {
      onExport();
      return;
    }
    await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    toast.success("JSON in Zwischenablage kopiert");
  };

  const handleDownload = () => {
    if (!exportData) {
      onExport();
      return;
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportData.profile.name.replace(/\s+/g, "-")}-style-profile.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Download gestartet");
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => void handleCopy()}
      >
        <Copy className="size-4 mr-2" aria-hidden />
        Kopieren
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={handleDownload}
      >
        <Download className="size-4 mr-2" aria-hidden />
        Download
      </Button>
    </div>
  );
}
