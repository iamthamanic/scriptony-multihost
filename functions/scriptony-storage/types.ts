/**
 * Hono-Context-Typen für scriptony-storage.
 */

import type { Databases } from "node-appwrite";

declare module "hono" {
	interface ContextVariableMap {
		userId: string;
		db: Databases;
	}
}
