/**
 * Settings section for self-hosted Appwrite + runtime mode (T41).
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Server } from "lucide-react";
import { SelfHostedConnectionForm } from "./SelfHostedConnectionForm";
import { SelfHostedConnectionList } from "./SelfHostedConnectionList";
import { RuntimeModeSelector } from "./RuntimeModeSelector";
import { useSelfHostedConnection } from "@/hooks/useSelfHostedConnection";

export function SelfHostedConnectionSection() {
  const connection = useSelfHostedConnection();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="size-5" />
          Self-hosted Appwrite
        </CardTitle>
        <CardDescription>
          Eigenen Appwrite-Server verbinden. Die UI-Einstellung ersetzt
          VITE_APPWRITE_* für Self-hosted nach Aktivierung.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RuntimeModeSelector
          active={connection.active}
          setProfile={connection.setProfile}
        />
        <SelfHostedConnectionForm
          testConnection={connection.testConnection}
          saveAndActivate={connection.saveAndActivate}
        />
        <SelfHostedConnectionList
          connections={connection.connections}
          active={connection.active}
          loading={connection.loading}
          activate={connection.activate}
          remove={connection.remove}
        />
      </CardContent>
    </Card>
  );
}
