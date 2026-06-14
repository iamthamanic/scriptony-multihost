/**
 * Form to test and save a self-hosted Appwrite connection (T41).
 */

import { useState } from "react";
import { toast } from "sonner";
import { SelfHostedServerFields } from "@/components/auth/SelfHostedServerFields";

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
  const [values, setValues] = useState({
    name: "",
    endpoint: "",
    projectId: "",
  });
  const [busy, setBusy] = useState(false);

  const handleTest = async () => {
    setBusy(true);
    try {
      const result = await testConnection(values.endpoint, values.projectId);
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
      await saveAndActivate(values);
      toast.success("Self-hosted Server gespeichert und aktiviert");
      setValues({ name: "", endpoint: "", projectId: "" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SelfHostedServerFields
      values={values}
      onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
      busy={busy}
      onTest={() => void handleTest()}
      onSave={() => void handleSave()}
      saveLabel="Speichern & aktivieren"
    />
  );
}
