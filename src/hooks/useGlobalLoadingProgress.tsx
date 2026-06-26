/**
 * App-wide long-running load progress (5s+ → global % panel + status text).
 * Location: src/hooks/useGlobalLoadingProgress.tsx
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { GlobalLoadingProgressHost } from "@/components/GlobalLoadingProgressHost";
import {
  GLOBAL_LOADING_DETAIL_DELAY_MS,
  pickPrimaryLoadingTask,
  type ActiveLoadingTask,
  type LoadingProgressReporter,
  type LoadingProgressUpdate,
  type RunWithLoadingProgressOptions,
} from "@/lib/loading/global-loading-progress";

interface GlobalLoadingProgressContextValue {
  /** Wrap async work; reports progress to the global overlay after 5s. */
  runWithProgress: <T>(options: RunWithLoadingProgressOptions<T>) => Promise<T>;
  reportProgress: (id: string, update: LoadingProgressUpdate) => void;
  startTask: (
    id: string,
    options: { title: string; initial?: LoadingProgressUpdate },
  ) => void;
  endTask: (id: string) => void;
  activeTasks: ActiveLoadingTask[];
  primaryTask: ActiveLoadingTask | null;
}

const GlobalLoadingProgressContext =
  createContext<GlobalLoadingProgressContextValue | null>(null);

function createTask(
  id: string,
  title: string,
  initial?: LoadingProgressUpdate,
): ActiveLoadingTask {
  return {
    id,
    title,
    percent: initial?.percent ?? 3,
    message: initial?.message ?? "Wird geladen…",
    phase: initial?.phase,
    startedAt: Date.now(),
    detailVisible: false,
  };
}

export function GlobalLoadingProgressProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [tasks, setTasks] = useState<ActiveLoadingTask[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const lastProgressRef = useRef<Map<string, LoadingProgressUpdate>>(new Map());

  const clearDetailTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const scheduleDetailTimer = useCallback(
    (id: string) => {
      clearDetailTimer(id);
      const timer = setTimeout(() => {
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id !== id) return t;
            const cached = lastProgressRef.current.get(id);
            return {
              ...t,
              detailVisible: true,
              ...(cached
                ? {
                    percent: cached.percent,
                    message: cached.message,
                    phase: cached.phase,
                  }
                : {}),
            };
          }),
        );
      }, GLOBAL_LOADING_DETAIL_DELAY_MS);
      timersRef.current.set(id, timer);
    },
    [clearDetailTimer],
  );

  const startTask = useCallback(
    (
      id: string,
      options: { title: string; initial?: LoadingProgressUpdate },
    ) => {
      lastProgressRef.current.set(
        id,
        options.initial ?? { percent: 3, message: "Wird geladen…" },
      );
      setTasks((prev) => {
        const without = prev.filter((t) => t.id !== id);
        return [...without, createTask(id, options.title, options.initial)];
      });
      scheduleDetailTimer(id);
    },
    [scheduleDetailTimer],
  );

  const endTask = useCallback(
    (id: string) => {
      clearDetailTimer(id);
      lastProgressRef.current.delete(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    },
    [clearDetailTimer],
  );

  const reportProgress = useCallback(
    (id: string, update: LoadingProgressUpdate) => {
      lastProgressRef.current.set(id, update);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                percent: update.percent,
                message: update.message,
                phase: update.phase,
              }
            : t,
        ),
      );
    },
    [],
  );

  const runWithProgress = useCallback(
    async <T,>(options: RunWithLoadingProgressOptions<T>): Promise<T> => {
      startTask(options.id, {
        title: options.title,
        initial: {
          percent: options.initialPercent ?? 3,
          message: options.initialMessage ?? "Wird geladen…",
        },
      });
      try {
        return await options.run((update) =>
          reportProgress(options.id, update),
        );
      } finally {
        endTask(options.id);
      }
    },
    [startTask, endTask, reportProgress],
  );

  const primaryTask = useMemo(() => pickPrimaryLoadingTask(tasks), [tasks]);

  const value = useMemo(
    () => ({
      runWithProgress,
      reportProgress,
      startTask,
      endTask,
      activeTasks: tasks,
      primaryTask,
    }),
    [runWithProgress, reportProgress, startTask, endTask, tasks, primaryTask],
  );

  return (
    <GlobalLoadingProgressContext.Provider value={value}>
      {children}
      <GlobalLoadingProgressHost task={primaryTask} taskCount={tasks.length} />
    </GlobalLoadingProgressContext.Provider>
  );
}

export function useGlobalLoadingProgress(): GlobalLoadingProgressContextValue {
  const ctx = useContext(GlobalLoadingProgressContext);
  if (!ctx) {
    throw new Error(
      "useGlobalLoadingProgress must be used within GlobalLoadingProgressProvider",
    );
  }
  return ctx;
}
