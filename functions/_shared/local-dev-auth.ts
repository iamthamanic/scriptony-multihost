/**
 * Local desktop dev bearer token — shared contract between Tauri/local SPA and Functions.
 * Must stay in sync with src/lib/auth/local-dev-token.ts (frontend cannot import from functions/).
 */

export const LOCAL_DEV_BEARER = "local_scriptony_user" as const;
