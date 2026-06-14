/**
 * Pure rules for Settings tab visibility (testable without React).
 * Location: src/lib/settings/settings-tab-visibility.ts
 */

import type { CloudAuthTarget } from "@/lib/auth/cloud-appwrite-target";
import { isCloudAppUser } from "@/lib/auth/is-cloud-app-user";
import type { RuntimeProfile } from "@/runtime/runtime-profile";

export type SettingsTabVisibilityInput = {
  isLocalProfile: boolean;
  cloudSessionTracked: boolean;
  hasSession: boolean;
  user: { id: string; email?: string } | null;
  authLoading: boolean;
  authTarget: CloudAuthTarget;
  runtimeProfile: RuntimeProfile;
};

export function resolveSettingsTabVisibility(
  input: SettingsTabVisibilityInput,
): {
  hasCloudAccountSession: boolean;
  showProfileTab: boolean;
  showSubscriptionTab: boolean;
  defaultTab: string;
} {
  const hasCloudAccountSession = input.isLocalProfile
    ? input.cloudSessionTracked && input.hasSession
    : isCloudAppUser(input.user);

  const managedTarget = input.isLocalProfile
    ? input.authTarget === "managed"
    : input.runtimeProfile === "cloud";

  const showProfileTab = hasCloudAccountSession && !input.authLoading;
  const showSubscriptionTab = hasCloudAccountSession && managedTarget;
  const defaultTab = showProfileTab ? "profile" : "preferences";

  return {
    hasCloudAccountSession,
    showProfileTab,
    showSubscriptionTab,
    defaultTab,
  };
}
