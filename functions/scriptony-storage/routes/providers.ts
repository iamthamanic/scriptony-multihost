/**
 * GET /storage/providers — Liste verfügbarer Provider
 */

import { Hono } from "hono";
import { PROVIDERS } from "../services/providers";
import { getOptionalEnv } from "../../_shared/env";

const app = new Hono();

app.get("/", (c) => {
	const configured = Object.entries(PROVIDERS)
		.filter(([_, cfg]) => !!getOptionalEnv(cfg.clientIdEnv))
		.map(([key, cfg]) => ({ key, label: cfg.label, authUrl: cfg.authUrl }));
	return c.json({ success: true, data: configured });
});

export default app;
