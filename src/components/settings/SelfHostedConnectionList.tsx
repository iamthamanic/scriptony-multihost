/**
 * List of saved self-hosted Appwrite servers (T41).
 */

import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import type { SelfHostedConnection } from "@/backend/self-hosted";

interface SelfHostedConnectionListProps {
  connections: SelfHostedConnection[];
  active: SelfHostedConnection | null;
  loading: boolean;
  activate: (id: string) => Promise<unknown>;
  remove: (id: string) => Promise<void>;
}

export function SelfHostedConnectionList({
  connections,
  active,
  loading,
  activate,
  remove,
}: SelfHostedConnectionListProps) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Lade Verbindungen…</p>;
  }

  if (connections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Noch keine Self-hosted-Server gespeichert.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {connections.map((conn) => (
        <li
          key={conn.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
        >
          <div>
            <p className="font-medium">{conn.name}</p>
            <p className="text-xs text-muted-foreground truncate max-w-md">
              {conn.endpoint}
            </p>
            {active?.id === conn.id ? (
              <Badge variant="secondary" className="mt-1">
                Aktiv
              </Badge>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={active?.id === conn.id}
              onClick={() => {
                void activate(conn.id)
                  .then(() => toast.success(`${conn.name} aktiviert`))
                  .catch((err: unknown) =>
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Aktivierung fehlgeschlagen",
                    ),
                  );
              }}
            >
              Aktivieren
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                void remove(conn.id).then(() => toast.success("Entfernt"));
              }}
            >
              Entfernen
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
