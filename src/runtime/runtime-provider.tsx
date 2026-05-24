import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import type { RuntimeConfig } from "./runtime-config";
import { detectRuntime } from "./detect-runtime";

const RuntimeContext = createContext<RuntimeConfig | null>(null);

/**
 * Provides the immutable runtime snapshot to the React tree.
 *
 * This is evaluated once on mount and never changes during the session.
 * Components must use useRuntime() instead of their own detection logic.
 */
export function RuntimeProvider({ children }: { children: ReactNode }) {
	const runtime = useMemo(() => detectRuntime(), []);
	return (
		<RuntimeContext.Provider value={runtime}>
			{children}
		</RuntimeContext.Provider>
	);
}

/**
 * React hook to access the current runtime configuration.
 *
 * @throws if called outside a RuntimeProvider.
 */
export function useRuntime(): RuntimeConfig {
	const ctx = useContext(RuntimeContext);
	if (!ctx) {
		throw new Error(
			"useRuntime must be used within a RuntimeProvider. Wrap <App /> with <RuntimeProvider>.",
		);
	}
	return ctx;
}
