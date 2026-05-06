/**
 * Storage-Connections: GET (list), DELETE (remove).
 * POST ist absichtlich nicht vorhanden — Connections werden ausschließlich
 * über den OAuth-Callback-Flow in routes/oauth.ts erstellt.
 * Dies verhindert Token-Injection (OWASP ASVS V2.1, A07:2021).
 */

import { Hono } from "hono";
import { Query } from "node-appwrite";
import { getRequiredEnv } from "../../_shared/env";

const app = new Hono();

app.get("/", async (c) => {
	const userId = c.get("userId");
	const db = c.get("db");
	const docs = await db.listDocuments(
		getRequiredEnv("APPWRITE_DATABASE_ID"),
		"storage_connections",
		[Query.equal("user_id", userId)],
	);
	return c.json({
		success: true,
		data: docs.documents.map((d) => ({
			id: d.$id,
			provider: d.provider,
			created_at: d.created_at,
		})),
	});
});

app.delete("/:id", async (c) => {
	const userId = c.get("userId");
	const id = c.req.param("id");
	const db = c.get("db");

	try {
		const doc = await db.getDocument(
			getRequiredEnv("APPWRITE_DATABASE_ID"),
			"storage_connections",
			id,
		);
		if (doc.user_id !== userId) {
			return c.json(
				{
					success: false,
					error: { code: "FORBIDDEN", message: "Not your connection" },
				},
				403,
			);
		}
	} catch {
		return c.json(
			{
				success: false,
				error: { code: "NOT_FOUND", message: "Connection not found" },
			},
			404,
		);
	}

	await db.deleteDocument(
		getRequiredEnv("APPWRITE_DATABASE_ID"),
		"storage_connections",
		id,
	);
	return c.json({ success: true });
});

export default app;
