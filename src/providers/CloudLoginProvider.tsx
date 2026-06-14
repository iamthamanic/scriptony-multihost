/**
 * Cloud session provider — wraps useCloudLoginState + dialog.
 * Location: src/providers/CloudLoginProvider.tsx
 */

import { createContext, useContext, type ReactNode } from "react";
import { CloudLoginDialog } from "@/components/desktop/CloudLoginDialog";
import {
  useCloudLoginState,
  type CloudLoginState,
} from "@/hooks/useCloudLoginState";

const CloudLoginContext = createContext<CloudLoginState | null>(null);

export function CloudLoginProvider({ children }: { children: ReactNode }) {
  const value = useCloudLoginState();
  return (
    <CloudLoginContext.Provider value={value}>
      {children}
      <CloudLoginDialog />
    </CloudLoginContext.Provider>
  );
}

export function useCloudSession(): CloudLoginState {
  const ctx = useContext(CloudLoginContext);
  if (!ctx) {
    throw new Error("useCloudSession must be used within CloudLoginProvider");
  }
  return ctx;
}
