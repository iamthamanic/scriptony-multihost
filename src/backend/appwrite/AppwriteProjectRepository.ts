/**
 * AppwriteProjectRepository
 *
 * Wrappt Appwrite SDK (Databases). Kein duplizierter HTTP-Code.
 * T35: Backend-Boundary.
 */

import type {
	Project,
	ProjectRepository,
	CreateProjectPayload,
	UpdateProjectPayload,
} from "../ScriptonyBackend";
import { databases } from "@/lib/appwrite/appwrite";
import { Query, ID } from "appwrite";
import { getAuthClient } from "@/lib/auth/getAuthClient";

const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || "scriptony";
const COLLECTION_ID =
	import.meta.env.VITE_APPWRITE_COLLECTION_PROJECTS || "projects";

export class AppwriteProjectRepository implements ProjectRepository {
	async list(): Promise<Project[]> {
		const auth = getAuthClient();
		const session = await auth.getSession();
		if (!session?.userId) throw new Error("Auth required");

		// The existing 'projects' collection stores the owner in a 'userId' field
		// (established schema), not Appwrite's built-in $permissions/created_by.
		const result = await databases.listDocuments(DB_ID, COLLECTION_ID, [
			Query.equal("userId", session.userId),
			Query.orderDesc("$createdAt"),
		]);

		return result.documents.map(normalizeProject);
	}

	async get(id: string): Promise<Project | null> {
		try {
			const doc = await databases.getDocument(DB_ID, COLLECTION_ID, id);
			const auth = getAuthClient();
			const session = await auth.getSession();
			if (session?.userId && doc.userId !== session.userId) {
				return null;
			}
			return normalizeProject(doc);
		} catch (error) {
			// Appwrite throws { code: 404, type: "document_not_found" } for missing docs.
			// Only swallow genuine not-found errors; propagate everything else (network, auth, permission).
			const appwriteErr = error as { code?: number; type?: string };
			if (
				appwriteErr.code === 404 ||
				appwriteErr.type === "document_not_found"
			) {
				return null;
			}
			throw error;
		}
	}

	async create(payload: CreateProjectPayload): Promise<Project> {
		const auth = getAuthClient();
		const session = await auth.getSession();
		if (!session?.userId) throw new Error("Auth required");

		const doc = await databases.createDocument(
			DB_ID,
			COLLECTION_ID,
			ID.unique(),
			{
				name: payload.name,
				description: payload.description ?? "",
				projectType: payload.projectType ?? "",
				userId: session.userId,
			},
		);
		return normalizeProject(doc);
	}

	async update(id: string, payload: UpdateProjectPayload): Promise<Project> {
		const auth = getAuthClient();
		const session = await auth.getSession();
		if (!session?.userId) throw new Error("Auth required");

		// Ownership-Check vor dem Update
		const existing = await databases.getDocument(DB_ID, COLLECTION_ID, id);
		if (existing.userId !== session.userId) {
			throw new Error("Forbidden: Not project owner");
		}

		const patch: Record<string, unknown> = {};
		if (payload.name !== undefined) patch.name = payload.name;
		if (payload.description !== undefined)
			patch.description = payload.description;
		if (payload.projectType !== undefined)
			patch.projectType = payload.projectType;

		const doc = await databases.updateDocument(DB_ID, COLLECTION_ID, id, patch);
		return normalizeProject(doc);
	}

	async delete(id: string): Promise<void> {
		const auth = getAuthClient();
		const session = await auth.getSession();
		if (!session?.userId) throw new Error("Auth required");

		// Ownership-Check vor dem Löschen
		const existing = await databases.getDocument(DB_ID, COLLECTION_ID, id);
		if (existing.userId !== session.userId) {
			throw new Error("Forbidden: Not project owner");
		}

		await databases.deleteDocument(DB_ID, COLLECTION_ID, id);
	}
}

function normalizeProject(raw: Record<string, unknown>): Project {
	return {
		$id: String(raw.$id ?? raw.id ?? ""),
		name: String(raw.name ?? ""),
		description: raw.description ? String(raw.description) : undefined,
		projectType: raw.projectType ? String(raw.projectType) : undefined,
		userId: String(raw.userId ?? ""),
		createdAt: String(raw.$createdAt ?? raw.createdAt ?? ""),
		updatedAt: String(raw.$updatedAt ?? raw.updatedAt ?? ""),
	};
}
