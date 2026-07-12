/**
 * Banner when cloud-only features need Appwrite config (T57 hybrid).
 * Location: src/components/desktop/LocalCloudFeatureBanner.tsx
 */

import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import { useCloudSession } from "@/hooks/useCloudSession";

interface LocalCloudFeatureBannerProps {
  feature: string;
}

export function LocalCloudFeatureBanner({
  feature,
}: LocalCloudFeatureBannerProps) {
  const { hasSession, configOk, missingConfig, hybridReady } =
    useCloudSession();

  if (!isLocalProfile()) {
    return null;
  }

  if (!configOk) {
    return (
      <div
        className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground"
        role="status"
      >
        <strong className="text-foreground">{feature}</strong> benötigt Appwrite
        in <code className="text-xs">.env.local</code> (
        {missingConfig.join(", ")}
        ).
      </div>
    );
  }

  if (hybridReady) {
    return null;
  }

  if (!hasSession) {
    return (
      <div
        className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground"
        role="status"
      >
        <strong className="text-foreground">{feature}</strong> benötigt eine
        Cloud-Anmeldung (Schaltfläche neben Einstellungen in der Kopfleiste).
        Lokale Projekt-Daten bleiben verfügbar.
      </div>
    );
  }

  return null;
}
