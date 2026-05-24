import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/safe-area.css";
import { installShellAuthListeners } from "./lib/shell/install-shell-auth-listeners";
import { client } from "./lib/appwrite/appwrite";
import { detectRuntime } from "./runtime/detect-runtime";

// Render immediately — never block on async setup
createRoot(document.getElementById("root")!).render(<App />);

// Run non-critical async setup in the background
void (async () => {
  try {
    await installShellAuthListeners();
  } catch {
    // Non-critical — app works without these
  }
})();

// Health check: only for cloud / self-hosted; skip in local mode
if (detectRuntime().profile !== "local") {
  client
    .ping()
    .then(() => {
      console.log("[Appwrite] ping OK — SDK reachability check passed.");
    })
    .catch((err: unknown) => {
      console.warn(
        "[Appwrite] ping failed (check endpoint / CORS / network):",
        err,
      );
    });
}
