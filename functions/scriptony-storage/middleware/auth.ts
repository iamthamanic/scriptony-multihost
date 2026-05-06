/**
 * Hono-Middleware: Auth + DB Setup für scriptony-storage.
 */

import { createMiddleware } from "hono/factory";
import { Client, Databases, Account } from "node-appwrite";
import { getRequiredEnv } from "../../_shared/env";

export const authDbMiddleware = createMiddleware(async (c, next) => {
	const authHeader = c.req.header("authorization") || "";
	const token = authHeader.replace(/^Bearer\s+/i, "");
	if (!token) {
		return c.json(
			{
				success: false,
				error: { code: "UNAUTHORIZED", message: "Missing token" },
			},
			401,
		);
	}

	const client = new Client()
		.setEndpoint(getRequiredEnv("APPWRITE_ENDPOINT"))
		.setProject(getRequiredEnv("APPWRITE_PROJECT_ID"))
		.setJWT(token);

	try {
		const account = new Account(client);
		const user = await account.get();
		c.set("userId", user.$id);

		const dbClient = new Client()
			.setEndpoint(getRequiredEnv("APPWRITE_ENDPOINT"))
			.setProject(getRequiredEnv("APPWRITE_PROJECT_ID"))
			.setKey(getRequiredEnv("APPWRITE_API_KEY"));
		c.set("db", new Databases(dbClient));

		await next();
	} catch {
		return c.json(
			{
				success: false,
				error: { code: "UNAUTHORIZED", message: "Invalid token" },
			},
			401,
		);
	}
});
