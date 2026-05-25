/**
 * Hook for self-hosted Appwrite connections (T41).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SelfHostedConnection } from "@/backend/self-hosted";
import { SelfHostedConnectionService } from "@/backend/self-hosted/SelfHostedConnectionService";
import { useRuntimeController } from "@/runtime";
import type { RuntimeProfile } from "@/runtime/runtime-profile";

export function useSelfHostedConnection() {
  const { activateSelfHosted, setProfile, clearSelfHosted } =
    useRuntimeController();
  const service = useMemo(() => new SelfHostedConnectionService(), []);
  const [connections, setConnections] = useState<SelfHostedConnection[]>([]);
  const [active, setActive] = useState<SelfHostedConnection | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [list, activeConn] = await Promise.all([
        service.list(),
        service.getActive(),
      ]);
      setConnections(list);
      setActive(activeConn);
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const testConnection = useCallback(
    (endpoint: string, projectId: string) =>
      service.testConnection({ endpoint, projectId }),
    [service],
  );

  const saveAndActivate = useCallback(
    async (input: {
      name: string;
      endpoint: string;
      projectId: string;
      id?: string;
    }) => {
      const saved = await service.save(input);
      const activated = await service.activate(saved.id);
      activateSelfHosted(activated);
      await refresh();
      return activated;
    },
    [service, activateSelfHosted, refresh],
  );

  const activate = useCallback(
    async (id: string) => {
      const conn = await service.activate(id);
      activateSelfHosted(conn);
      await refresh();
      return conn;
    },
    [service, activateSelfHosted, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await service.remove(id);
      await refresh();
    },
    [service, refresh],
  );

  const switchProfile = useCallback(
    async (profile: RuntimeProfile) => {
      if (profile === "cloud") {
        clearSelfHosted();
        return;
      }
      await setProfile(profile);
    },
    [clearSelfHosted, setProfile],
  );

  return {
    connections,
    active,
    loading,
    refresh,
    testConnection,
    saveAndActivate,
    activate,
    remove,
    setProfile: switchProfile,
  };
}
