/**
 * Form to test and save a self-hosted Appwrite connection (T41).
 */

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";

interface SelfHostedConnectionFormProps {
  testConnection: (
    endpoint: string,
    projectId: string,
  ) => Promise<{ ok: boolean; message?: string }>;
  saveAndActivate: (input: {
    name: string;
    endpoint: string;
    projectId: string;
  }) => Promise<unknown>;
}

export function SelfHostedConnectionForm({
  testConnection,
  saveAndActivate,
}: SelfHostedConnectionFormProps) {
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);

  const handleTest = async () => {
    setBusy(true);
    try {
      const result = await testConnection(endpoint, projectId);
      if (result.ok) {
        toast.success("Verbindung erfolgreich");
      } else {
        toast.error(result.message ?? "Verbindung fehlgeschlagen");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      await saveAndActivate({ name, endpoint, projectId });
      toast.success("Self-hosted Server gespeichert und aktiviert");
      setName("");
      setEndpoint("");
      setProjectId("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sh-name">Name</Label>
        <Input
          id="sh-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Studio Appwrite"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sh-endpoint">Endpoint</Label>
        <Input
          id="sh-endpoint"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          placeholder="https://appwrite.example.com/v1"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sh-project">Project ID</Label>
        <Input
          id="sh-project"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="69abc..."
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={handleTest}
        >
          Verbindung testen
        </Button>
        <Button type="button" disabled={busy} onClick={handleSave}>
          Speichern & aktivieren
        </Button>
      </div>
    </div>
  );
}
