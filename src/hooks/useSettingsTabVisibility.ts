/**
 * Which Settings tabs are visible (cloud session on desktop, Appwrite user in browser).
 * Location: src/hooks/useSettingsTabVisibility.ts
 */

import { useMemo, useRef, useEffect } from "react";
import { getCloudAuthTarget } from "@/lib/auth/cloud-appwrite-target";
import {
  isLocalProfile,
  getRuntimeProfile,
} from "@/lib/api-adapter/runtime-dispatch";
import { resolveSettingsTabVisibility } from "@/lib/settings/settings-tab-visibility";
import { useCloudSession } from "@/providers/CloudLoginProvider";
import { useAuth } from "./useAuth";

export function useSettingsTabVisibility() {
  const { user, loading: authLoading } = useAuth();
  const { hasSession, visible: cloudSessionTracked } = useCloudSession();

  const visibility = useMemo(
    () =>
      resolveSettingsTabVisibility({
        isLocalProfile: isLocalProfile(),
        cloudSessionTracked,
        hasSession,
        user,
        authLoading,
        authTarget: getCloudAuthTarget(),
        runtimeProfile: getRuntimeProfile(),
      }),
    [cloudSessionTracked, hasSession, user, authLoading],
  );

  return visibility;
}

/** Switch to profile tab once when cloud session becomes available. */
export function useSyncSettingsTabOnCloudLogin(
  showProfileTab: boolean,
  setActiveTab: (tab: string) => void,
) {
  const hadProfileTab = useRef(showProfileTab);

  useEffect(() => {
    if (showProfileTab && !hadProfileTab.current) {
      setActiveTab("profile");
    }
    hadProfileTab.current = showProfileTab;
  }, [showProfileTab, setActiveTab]);
}
