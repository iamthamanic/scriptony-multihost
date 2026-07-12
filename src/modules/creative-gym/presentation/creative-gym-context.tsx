/**
 * React context: Creative Gym deps + mode (composition root per user).
 * Location: src/modules/creative-gym/presentation/creative-gym-context.tsx
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { CreativeGymDeps } from "../application/creative-gym-deps";
import type { CreativeGymMode } from "../domain/types";
import * as UC from "../application/use-cases";
import {
  createCreativeGymDeps,
  LocalStorageModeResolver,
  resolveCreativeGymMode,
} from "../application/wiring";
import { createGymProgressRepository } from "../infrastructure/repositories/create-gym-progress-repository";

export type GymUserDisplay = {
  name: string;
  email: string;
  avatar?: string;
};

export type GymProgressOverview = Awaited<
  ReturnType<typeof UC.getProgressOverviewUseCase>
>;

const Ctx = createContext<{
  deps: CreativeGymDeps;
  mode: CreativeGymMode;
  setMode: (m: CreativeGymMode) => void;
  gymUser?: GymUserDisplay;
  progressOverview: GymProgressOverview | null;
} | null>(null);

export function CreativeGymProvider({
  userId,
  gymUser,
  children,
}: {
  userId: string;
  gymUser?: GymUserDisplay;
  children: ReactNode;
}) {
  const [mode, setModeState] = useState<CreativeGymMode>("integrated");

  useEffect(() => {
    void resolveCreativeGymMode().then(setModeState);
  }, []);

  const setMode = useCallback((m: CreativeGymMode) => {
    LocalStorageModeResolver.setMode(m);
    setModeState(m);
  }, []);

  const [deps, setDeps] = useState<CreativeGymDeps | null>(null);
  const [depsError, setDepsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDepsError(null);
    void (async () => {
      try {
        const progress = await createGymProgressRepository(userId);
        if (!cancelled) {
          setDeps(createCreativeGymDeps(userId, mode, progress));
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "Creative Gym konnte nicht geladen werden.";
          setDepsError(message);
          setDeps(null);
          toast.error(message);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, mode]);

  const [progressOverview, setProgressOverview] =
    useState<GymProgressOverview | null>(null);

  useEffect(() => {
    if (!deps) return;
    let cancelled = false;
    void UC.getProgressOverviewUseCase(deps)
      .then((overview) => {
        if (!cancelled) setProgressOverview(overview);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof Error
              ? err.message
              : "Fortschritt konnte nicht geladen werden.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [deps]);

  const value = useMemo(() => {
    if (!deps) return null;
    return {
      deps,
      mode,
      setMode,
      gymUser,
      progressOverview,
    };
  }, [deps, mode, setMode, gymUser, progressOverview]);

  if (depsError) {
    return (
      <div
        className="flex min-h-[12rem] items-center justify-center p-6 text-sm text-destructive"
        role="alert"
      >
        {depsError}
      </div>
    );
  }

  if (!value) {
    return (
      <div
        className="flex min-h-[12rem] items-center justify-center gap-2 text-muted-foreground"
        role="status"
        aria-label="Creative Gym wird geladen"
      >
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">Creative Gym wird geladen…</span>
      </div>
    );
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCreativeGym() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCreativeGym requires CreativeGymProvider");
  return v;
}
