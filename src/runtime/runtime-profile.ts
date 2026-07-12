/**
 * Scriptony Runtime Profile
 *
 * Central type for the three runtime environments.
 * Local = solo desktop, no account or cloud needed.
 * Cloud = hosted Appwrite, standard web app.
 * SelfHosted = user-managed Appwrite or custom backend endpoint.
 */
export type RuntimeProfile = "local" | "cloud" | "selfHosted";
