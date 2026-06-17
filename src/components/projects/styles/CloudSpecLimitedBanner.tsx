/**
 * Banner when full style spec editing is unavailable (cloud-only summary).
 * Location: src/components/projects/styles/CloudSpecLimitedBanner.tsx
 */

import { Cloud } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";

export function CloudSpecLimitedBanner() {
  return (
    <Alert className="border-primary/30 bg-primary/5">
      <Cloud className="size-4 text-primary" aria-hidden />
      <AlertTitle className="text-primary">Eingeschränkter Modus</AlertTitle>
      <AlertDescription>
        Die volle Style-Spec ist hier nicht bearbeitbar. Öffne ein lokales
        .scriptony-Projekt oder melde dich in der Cloud an.
      </AlertDescription>
    </Alert>
  );
}
