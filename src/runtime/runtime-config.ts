import type { RuntimeProfile } from "./runtime-profile";

/**
 * Scriptony Runtime Configuration
 *
 * Immutable snapshot of the current execution environment.
 * UI components must read this via useRuntime() and never perform their own detection.
 */
export interface RuntimeConfig {
  /** Canonical runtime mode. */
  profile: RuntimeProfile;

  /** Whether the app is running inside Tauri/Electron frame. */
  isDesktop: boolean;

  /** Whether the app is running in a true browser (not a desktop shell). */
  isBrowser: boolean;

  /** Whether the app is running on a mobile native shell (Capacitor). */
  isMobile: boolean;

  /** Appwrite endpoint (cloud or self-hosted). */
  appwriteEndpoint?: string;

  /** Appwrite project ID. */
  appwriteProjectId?: string;

  /** Custom endpoint override for self-hosted installations. */
  selfHostedEndpoint?: string;
}
