/**
 * BackendProvider + useScriptonyBackend()
 *
 * T35: React Context für Domain-Backend.
 * Nutzt RuntimeProvider (T34) um das korrekte Backend zu instantiieren.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ScriptonyBackend } from "./ScriptonyBackend";
import { useRuntime } from "@/runtime";
import { createBackend } from "./create-backend";

const BackendContext = createContext<ScriptonyBackend | null>(null);

export interface BackendProviderProps {
	children: ReactNode;
	/** Optional: override backend (für Tests). */
	backend?: ScriptonyBackend;
}

export function BackendProvider({ children, backend }: BackendProviderProps) {
	const runtime = useRuntime();

	const resolved = useMemo(() => {
		if (backend) return backend;
		if (!runtime) {
			throw new Error("BackendProvider must be nested inside RuntimeProvider");
		}
		return createBackend(runtime);
	}, [backend, runtime]);

	return (
		<BackendContext.Provider value={resolved}>
			{children}
		</BackendContext.Provider>
	);
}

export function useScriptonyBackend(): ScriptonyBackend {
	const ctx = useContext(BackendContext);
	if (!ctx) {
		throw new Error("useScriptonyBackend must be used inside BackendProvider");
	}
	return ctx;
}
