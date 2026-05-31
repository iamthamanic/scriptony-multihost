/**
 * Banner when cloud-only features need Appwrite config (T57 hybrid).
 *
 * Location: src/components/desktop/LocalCloudFeatureBanner.tsx
 */

import {
  canUseCloudFeatures,
  isLocalProfile,
} from "@/lib/api-adapter/runtime-dispatch";

interface LocalCloudFeatureBannerProps {
  feature: string;
}

export function LocalCloudFeatureBanner({
  feature,
}: LocalCloudFeatureBannerProps) {
  if (!isLocalProfile() || canUseCloudFeatures()) {
    return null;
  }

  return (
    <div
      className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground"
      role="status"
    >
      <strong className="text-foreground">{feature}</strong> benötigt eine
      Cloud- oder Self-hosted-Verbindung. Trage{" "}
      <code className="text-xs">VITE_APPWRITE_ENDPOINT</code> und{" "}
      <code className="text-xs">VITE_APPWRITE_PROJECT_ID</code> in{" "}
      <code className="text-xs">.env.local</code> ein oder wechsle in den
      Einstellungen den Modus.
    </div>
  );
}
