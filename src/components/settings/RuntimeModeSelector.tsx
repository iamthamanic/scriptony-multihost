/**
 * Runtime profile selector: local / cloud / self-hosted (T41).
 */

import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useRuntime } from "@/runtime";
import { toast } from "sonner";
import type { RuntimeProfile } from "@/runtime/runtime-profile";
import type { SelfHostedConnection } from "@/backend/self-hosted";

interface RuntimeModeSelectorProps {
  active: SelfHostedConnection | null;
  setProfile: (profile: RuntimeProfile) => Promise<void>;
}

export function RuntimeModeSelector({
  active,
  setProfile,
}: RuntimeModeSelectorProps) {
  const runtime = useRuntime();

  const onChange = (value: string) => {
    const profile = value as RuntimeProfile;
    void (async () => {
      try {
        if (profile === "selfHosted" && !active) {
          toast.error(
            "Bitte zuerst einen Self-hosted-Server speichern und aktivieren.",
          );
          return;
        }
        await setProfile(profile);
        toast.success(`Modus: ${profile}`);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Moduswechsel fehlgeschlagen",
        );
      }
    })();
  };

  return (
    <div className="space-y-2 max-w-sm">
      <Label>Scriptony-Modus</Label>
      <Select value={runtime.profile} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Modus wählen" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="cloud">Scriptony Cloud</SelectItem>
          <SelectItem value="local">Lokal (.scriptony)</SelectItem>
          <SelectItem value="selfHosted" disabled={!active}>
            Self-hosted Appwrite
          </SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Aktuell: {runtime.profile}
        {runtime.selfHostedEndpoint ? ` — ${runtime.selfHostedEndpoint}` : ""}
      </p>
    </div>
  );
}
