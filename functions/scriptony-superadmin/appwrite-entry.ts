/**
 * Appwrite Function Entry: scriptony-superadmin
 * Legacy T16 Superadmin Routes — zentraler Router.
 */

import {
	createAppwriteHandler,
	getPathname,
} from "../_shared/appwrite-handler";
import type { RequestLike, ResponseLike } from "../_shared/http";
import usersHandler from "./superadmin/users";
import analyticsHandler from "./superadmin/analytics";
import organizationsHandler from "./superadmin/organizations";
import statsHandler from "./superadmin/stats";

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
	const pathname = getPathname(req);

	// Health check
	if (pathname === "/" || pathname === "/health") {
		res.statusCode = 200;
		res.setHeader("Content-Type", "application/json");
		res.end(
			JSON.stringify({
				status: "ok",
				service: "scriptony-superadmin",
				version: "1.0.0",
				timestamp: new Date().toISOString(),
			}),
		);
		return;
	}

	// /superadmin/users
	if (pathname === "/users" || pathname === "/superadmin/users") {
		await usersHandler(req, res);
		return;
	}

	// /superadmin/analytics
	if (pathname === "/analytics" || pathname === "/superadmin/analytics") {
		await analyticsHandler(req, res);
		return;
	}

	// /superadmin/organizations
	if (
		pathname === "/organizations" ||
		pathname === "/superadmin/organizations"
	) {
		await organizationsHandler(req, res);
		return;
	}

	// /superadmin/stats
	if (pathname === "/stats" || pathname === "/superadmin/stats") {
		await statsHandler(req, res);
		return;
	}

	res.statusCode = 404;
	res.setHeader("Content-Type", "application/json");
	res.end(JSON.stringify({ error: "Not found", path: pathname }));
}

export default createAppwriteHandler(dispatch);
