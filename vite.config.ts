import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import path from "path";
import fs from "node:fs";

type ManualChunkGroup = {
  name: string;
  includes: string[];
};

const MANUAL_CHUNK_GROUPS: ManualChunkGroup[] = [
  {
    name: "vendor-appwrite",
    includes: ["/node_modules/appwrite/"],
  },
  {
    name: "vendor-ui",
    includes: [
      "/node_modules/@radix-ui/",
      "/node_modules/lucide-react/",
      "/node_modules/sonner/",
      "/node_modules/cmdk/",
      "/node_modules/vaul/",
      "/node_modules/input-otp/",
      "/node_modules/react-day-picker/",
      "/node_modules/embla-carousel-react/",
    ],
  },
  {
    name: "vendor-motion-dnd",
    includes: [
      "/node_modules/motion/",
      "/node_modules/react-dnd/",
      "/node_modules/react-dnd-html5-backend/",
      "/node_modules/dnd-core/",
      "/node_modules/@react-dnd/",
    ],
  },
  {
    name: "vendor-charts",
    includes: ["/node_modules/recharts/", "/node_modules/d3-"],
  },
  {
    name: "vendor-pdf",
    includes: ["/node_modules/pdfjs-dist/"],
  },
  {
    name: "vendor-audio-media",
    includes: ["/node_modules/wavesurfer.js/"],
  },
  {
    name: "vendor-doc-import",
    includes: ["/node_modules/mammoth/"],
  },
  {
    name: "vendor-html-export",
    includes: ["/node_modules/html2canvas/", "/node_modules/dompurify/"],
  },
  {
    name: "vendor-jspdf",
    includes: ["/node_modules/jspdf/"],
  },
];

function getManualChunkName(id: string): string | undefined {
  const normalizedId = id.replace(/\\/g, "/");
  const match = MANUAL_CHUNK_GROUPS.find((group) =>
    group.includes.some((segment) => normalizedId.includes(segment)),
  );
  return match?.name;
}

const SCRIPTONY_AUDIO_STORY_FN = "scriptony-audio-story";

/**
 * Canonical `scriptony-*` HTTP function IDs (mirror of `BACKEND_FUNCTIONS` in api-gateway.ts).
 * Used only to fill missing domains in dev from an existing sibling URL like
 * …/scriptony-projects… → …/scriptony-editor-readmodel… (same deployment pattern).
 */
const SCRIPTONY_GATEWAY_FUNCTION_SLUGS = [
  "scriptony-projects",
  "scriptony-project-nodes",
  "scriptony-shots",
  "scriptony-clips",
  "scriptony-characters",
  "scriptony-style-guide",
  "scriptony-audio",
  SCRIPTONY_AUDIO_STORY_FN,
  "scriptony-beats",
  "scriptony-worldbuilding",
  "scriptony-ai",
  "scriptony-assistant",
  "scriptony-image",
  "scriptony-stage",
  "scriptony-stage2d",
  "scriptony-stage3d",
  "scriptony-style",
  "scriptony-sync",
  "scriptony-gym",
  "scriptony-assets",
  "scriptony-auth",
  "scriptony-editor-readmodel",
  "scriptony-jobs",
  "scriptony-superadmin",
  "scriptony-stats",
  "scriptony-logs",
  "scriptony-mcp-appwrite",
] as const;

/** Only these function IDs may register a dev HTTP proxy (mitigate SSRF via crafted env JSON). */
const DEV_PROXY_ALLOWED_KEYS = new Set<string>([
  ...SCRIPTONY_GATEWAY_FUNCTION_SLUGS,
  "make-server-3b52693b",
]);

/** Prefer longest template key first so `scriptony-project-nodes` beats `scriptony-projects` in URLs. */
function expandScriptonyFunctionDomainMap(
  domainMap: Record<string, string>,
): Record<string, string> {
  const out = { ...domainMap };
  const scriptonyEntries = Object.entries(domainMap).filter(
    ([key, url]) =>
      key.startsWith("scriptony-") &&
      typeof url === "string" &&
      /^https?:\/\//i.test(url.trim()),
  );
  if (scriptonyEntries.length === 0) {
    return out;
  }
  const preferredOrder = ["scriptony-projects", "scriptony-auth"];
  const sorted = [...scriptonyEntries].sort((a, b) => {
    const pa = preferredOrder.indexOf(a[0]);
    const pb = preferredOrder.indexOf(b[0]);
    if (pa !== -1 || pb !== -1)
      return (pa === -1 ? 999 : pa) - (pb === -1 ? 999 : pb);
    return b[0].length - a[0].length;
  });
  const template = sorted.find(([key, url]) => url.includes(key));
  if (!template) {
    return out;
  }
  const [templateKey, templateUrlRaw] = template;
  const templateUrl = templateUrlRaw.replace(/\/+$/, "");
  for (const slug of SCRIPTONY_GATEWAY_FUNCTION_SLUGS) {
    if (out[slug]?.trim()) continue;
    if (!templateUrl.includes(templateKey)) continue;
    out[slug] = templateUrl.split(templateKey).join(slug);
  }
  return out;
}

/** Dev: append NDJSON from VideoEditorTimeline debug fetch → .cursor/debug-47af82.log */
const scriptonyDebugIngestPlugin: import("vite").Plugin = {
  name: "scriptony-debug-ingest",
  configureServer(server) {
    const logPath = path.join(process.cwd(), ".cursor", "debug-47af82.log");
    server.middlewares.use("/__scriptony-debug-ingest", (req, res, next) => {
      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type, X-Debug-Session-Id",
        );
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        return void res.end();
      }
      if (req.method !== "POST") return next();
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        try {
          const body = Buffer.concat(chunks).toString("utf8");
          const dir = path.dirname(logPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.appendFileSync(logPath, body.endsWith("\n") ? body : `${body}\n`);
        } catch (e) {
          console.warn("[scriptony-debug-ingest]", e);
        }
        res.statusCode = 204;
        res.end();
      });
    });
  },
};

function isSafeHttpUrl(target: string): boolean {
  try {
    const u = new URL(target);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Dev proxy targets may only point at loopback, the Appwrite API host, or optional extras (SSRF mitigation). */
function collectAllowedProxyTargetHosts(
  env: Record<string, string>,
): Set<string> {
  const hosts = new Set<string>(["localhost", "127.0.0.1"]);
  const ep = env.VITE_APPWRITE_ENDPOINT?.trim();
  if (ep) {
    try {
      hosts.add(new URL(ep).hostname.toLowerCase());
    } catch {
      /* ignore */
    }
  }
  const extra = env.VITE_DEV_PROXY_EXTRA_HOSTS?.trim();
  if (extra) {
    for (const part of extra.split(",")) {
      const t = part.trim().toLowerCase();
      if (t) {
        hosts.add(t);
      }
    }
  }
  return hosts;
}

function isProxyTargetHostAllowed(
  targetUrl: string,
  allowedHosts: Set<string>,
): boolean {
  try {
    return allowedHosts.has(new URL(targetUrl).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isDev = mode === "development";

  // ── Dev proxy: route ALL function domains through localhost to avoid CORS ──
  // Appwrite's executor can return errors without CORS headers (cold starts, crashes).
  // By proxying through Vite's dev server, requests stay same-origin → no CORS issues.
  const proxy: Record<string, import("vite").ProxyOptions> = {};
  /** `loadEnv` already merges `.env`, `.env.local`, mode-specific files — no manual parse. */
  let resolvedFunctionDomainMapRaw =
    env.VITE_BACKEND_FUNCTION_DOMAIN_MAP?.trim() || "";

  /**
   * Image generation often needs several minutes. http-proxy defaults (e.g. 120s proxyTimeout) or
   * intermediate values can yield 408/HTML before Appwrite returns — use 0 to disable these timeouts in dev.
   */
  const longRunningProxyOpts = {
    timeout: 300000, // 5 Minuten
    proxyTimeout: 300000, // 5 Minuten
  } as const;

  const allowedProxyTargetHosts = collectAllowedProxyTargetHosts(env);

  function parseDomainMap(raw: string): Record<string, string> {
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    const normalizedDomainMapRaw =
      firstBrace >= 0 && lastBrace > firstBrace
        ? raw.slice(firstBrace, lastBrace + 1)
        : raw;

    try {
      return JSON.parse(normalizedDomainMapRaw) as Record<string, string>;
    } catch {
      const trimmed = normalizedDomainMapRaw.trim();
      if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
        throw new Error("Invalid domain map format");
      }
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return {};
      const out: Record<string, string> = {};
      for (const part of inner.split(",")) {
        const entry = part.trim();
        if (!entry) continue;
        const sep = entry.indexOf(":");
        if (sep <= 0) continue;
        const key = entry.slice(0, sep).trim().replace(/^"|"$/g, "");
        const value = entry
          .slice(sep + 1)
          .trim()
          .replace(/^"|"$/g, "");
        if (key && value) {
          out[key] = value;
        }
      }
      return out;
    }
  }

  function registerExpandedDomainMapProxies(expanded: Record<string, string>) {
    const sortedEntries = Object.entries(expanded)
      .filter(([funcName, target]) => funcName && target)
      .sort((a, b) => b[0].length - a[0].length);
    for (const [funcName, target] of sortedEntries) {
      if (!DEV_PROXY_ALLOWED_KEYS.has(funcName)) {
        console.warn(
          `[vite.config] Überspringe unbekannten Function-Key im Proxy: "${funcName}"`,
        );
        continue;
      }
      const cleanTarget = target.replace(/\/+$/, "");
      if (!isSafeHttpUrl(cleanTarget)) {
        console.warn(
          `[vite.config] Überspringe Proxy für "${funcName}": ungültige URL "${cleanTarget}"`,
        );
        continue;
      }
      if (!isProxyTargetHostAllowed(cleanTarget, allowedProxyTargetHosts)) {
        console.warn(
          `[vite.config] Überspringe Proxy für "${funcName}": Host nicht erlaubt (SSRF-Schutz) — Ziel "${cleanTarget}". Setze VITE_DEV_PROXY_EXTRA_HOSTS oder VITE_APPWRITE_ENDPOINT passend.`,
        );
        continue;
      }
      const prefix = `/__dev-proxy/${funcName}`;
      proxy[prefix] = {
        target: cleanTarget,
        changeOrigin: true,
        secure: false,
        ...longRunningProxyOpts,
        rewrite: (reqPath) => {
          if (!reqPath.startsWith(prefix)) {
            return reqPath;
          }
          const stripped = reqPath.slice(prefix.length);
          return stripped.length > 0 ? stripped : "/";
        },
      };
    }
  }

  function hydrateDevProxyFromDomainMapJson(domainMapJsonRaw: string): void {
    const domainMap = parseDomainMap(domainMapJsonRaw);
    const keyCountBefore = Object.keys(domainMap).length;
    const expanded = expandScriptonyFunctionDomainMap(domainMap);
    if (Object.keys(expanded).length > keyCountBefore) {
      console.warn(
        "[vite.config] Ergänzt VITE_BACKEND_FUNCTION_DOMAIN_MAP um fehlende scriptony-* URLs (Sibling-Muster wie scriptony-projects).",
      );
    }
    resolvedFunctionDomainMapRaw = JSON.stringify(expanded);
    registerExpandedDomainMapProxies(expanded);
  }

  // Parse / expand map and register dev-only HTTP proxies (never read .env.local in production builds).
  const domainMapRaw = resolvedFunctionDomainMapRaw;
  if (isDev && domainMapRaw) {
    try {
      hydrateDevProxyFromDomainMapJson(domainMapRaw);
    } catch {
      console.warn(
        "[vite.config] Could not parse VITE_BACKEND_FUNCTION_DOMAIN_MAP for dev proxy",
      );
    }
  }

  // Legacy: single-function proxy override (kept for backwards compatibility)
  const assistantProxyTarget =
    env.VITE_DEV_PROXY_SCRIPTONY_ASSISTANT_TARGET?.trim() ||
    env.DEV_PROXY_SCRIPTONY_ASSISTANT_TARGET?.trim();
  if (
    assistantProxyTarget &&
    isSafeHttpUrl(assistantProxyTarget) &&
    isProxyTargetHostAllowed(assistantProxyTarget, allowedProxyTargetHosts)
  ) {
    proxy["/__dev-proxy/scriptony-assistant"] = {
      target: assistantProxyTarget.replace(/\/+$/, ""),
      changeOrigin: true,
      secure: false,
      ...longRunningProxyOpts,
      rewrite: (p) => {
        const stripped = p.replace(/^\/__dev-proxy\/scriptony-assistant/, "");
        return stripped.length > 0 ? stripped : "/";
      },
    };
  }

  // Bridge proxy for System Status page (works in dev; production uses nginx)
  const bridgeTarget = env.VITE_BRIDGE_URL?.trim() || "http://127.0.0.1:9877";
  proxy["/bridge/health"] = {
    target: bridgeTarget,
    changeOrigin: true,
    secure: false,
  };
  proxy["/bridge/config"] = {
    target: bridgeTarget,
    changeOrigin: true,
    secure: false,
  };

  return {
    define:
      isDev && resolvedFunctionDomainMapRaw
        ? {
            "import.meta.env.VITE_BACKEND_FUNCTION_DOMAIN_MAP": JSON.stringify(
              resolvedFunctionDomainMapRaw,
            ),
          }
        : undefined,
    plugins: [react(), wasm(), topLevelAwait(), scriptonyDebugIngestPlugin],
    resolve: {
      extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
      /** One copy of React — avoids "Invalid hook call" / useState from null in dev. */
      dedupe: ["react", "react-dom", "scheduler", "sonner"],
      alias: {
        buffer: path.resolve(__dirname, "node_modules/buffer"),
        react: path.resolve(__dirname, "node_modules/react"),
        "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
        "wavesurfer.js@7.8.10": "wavesurfer.js",
        "vaul@1.1.2": "vaul",
        "sonner@2.0.3": "sonner",
        "recharts@2.15.2": "recharts",
        "react-resizable-panels@2.1.7": "react-resizable-panels",
        "react-hook-form@7.55.0": "react-hook-form",
        "react-easy-crop@5.0.8": "react-easy-crop",
        "react-day-picker@8.10.1": "react-day-picker",
        "lucide-react@0.487.0": "lucide-react",
        "input-otp@1.4.2": "input-otp",
        "hono@4.6.14": "hono",
        "hono@4": "hono",
        "figma:asset/f457350c3280dabb6ea90d22b03423bcf23f5ad9.png":
          path.resolve(
            __dirname,
            "./src/assets/f457350c3280dabb6ea90d22b03423bcf23f5ad9.png",
          ),
        "figma:asset/762fa3b0c4bc468cb3c0661e6181aee92a01370d.png":
          path.resolve(
            __dirname,
            "./src/assets/762fa3b0c4bc468cb3c0661e6181aee92a01370d.png",
          ),
        "figma:asset/5bbfb6c934162456ce6c992c152322cee414939e.png":
          path.resolve(
            __dirname,
            "./src/assets/5bbfb6c934162456ce6c992c152322cee414939e.png",
          ),
        "figma:asset/44d55a83c8fdb84cc42417330166e084e82bbcea.png":
          path.resolve(
            __dirname,
            "./src/assets/44d55a83c8fdb84cc42417330166e084e82bbcea.png",
          ),
        "embla-carousel-react@8.6.0": "embla-carousel-react",
        "cmdk@1.1.1": "cmdk",
        "class-variance-authority@0.7.1": "class-variance-authority",
        "@radix-ui/react-tooltip@1.1.8": "@radix-ui/react-tooltip",
        "@radix-ui/react-toggle@1.1.2": "@radix-ui/react-toggle",
        "@radix-ui/react-toggle-group@1.1.2": "@radix-ui/react-toggle-group",
        "@radix-ui/react-tabs@1.1.3": "@radix-ui/react-tabs",
        "@radix-ui/react-switch@1.1.3": "@radix-ui/react-switch",
        "@radix-ui/react-slot@1.1.2": "@radix-ui/react-slot",
        "@radix-ui/react-slider@1.2.3": "@radix-ui/react-slider",
        "@radix-ui/react-separator@1.1.2": "@radix-ui/react-separator",
        "@radix-ui/react-select@2.1.6": "@radix-ui/react-select",
        "@radix-ui/react-scroll-area@1.2.3": "@radix-ui/react-scroll-area",
        "@radix-ui/react-radio-group@1.2.3": "@radix-ui/react-radio-group",
        "@radix-ui/react-popover@1.1.6": "@radix-ui/react-popover",
        "@radix-ui/react-navigation-menu@1.2.5":
          "@radix-ui/react-navigation-menu",
        "@radix-ui/react-menubar@1.1.6": "@radix-ui/react-menubar",
        "@radix-ui/react-label@2.1.2": "@radix-ui/react-label",
        "@radix-ui/react-hover-card@1.1.6": "@radix-ui/react-hover-card",
        "@radix-ui/react-dropdown-menu@2.1.6": "@radix-ui/react-dropdown-menu",
        "@radix-ui/react-dialog@1.1.6": "@radix-ui/react-dialog",
        "@radix-ui/react-context-menu@2.2.6": "@radix-ui/react-context-menu",
        "@radix-ui/react-collapsible@1.1.3": "@radix-ui/react-collapsible",
        "@radix-ui/react-checkbox@1.1.4": "@radix-ui/react-checkbox",
        "@radix-ui/react-avatar@1.1.3": "@radix-ui/react-avatar",
        "@radix-ui/react-aspect-ratio@1.1.2": "@radix-ui/react-aspect-ratio",
        "@radix-ui/react-alert-dialog@1.1.6": "@radix-ui/react-alert-dialog",
        "@radix-ui/react-accordion@1.2.3": "@radix-ui/react-accordion",
        "functions/_shared/default-assistant-system-prompt": path.resolve(
          __dirname,
          "functions/_shared/default-assistant-system-prompt.ts",
        ),
        "@": path.resolve(__dirname, "./src"),
      },
    },
    publicDir: "public",
    optimizeDeps: {
      include: ["react", "react-dom", "scheduler", "mammoth", "pdfjs-dist"],
      exclude: ["@jsquash/webp"],
    },
    build: {
      target: "esnext",
      outDir: "build",
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            return getManualChunkName(id);
          },
        },
      },
    },
    server: {
      port: 3000,
      /**
       * Default `localhost` matches the Appwrite CORS origin (http://localhost:3000).
       * Using 127.0.0.1 would break CORS because browsers treat them as different origins.
       * `VITE_DEV_BIND_ALL=1` → `0.0.0.0` (e.g. phone on Wi‑Fi).
       */
      host:
        env.VITE_DEV_BIND_ALL === "1" || env.VITE_DEV_BIND_ALL === "true"
          ? true
          : "localhost",
      strictPort: true,
      open: true,
      proxy,
    },
  };
});
