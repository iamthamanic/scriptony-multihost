/**
 * Local Runtime Auth Adapter
 *
 * Provides a no-op / dummy auth implementation for solo local usage.
 * No login screen is needed; the app boots straight into the workspace.
 *
 * Security: this is intentional — local mode is single-user file-system
 * access only. No remote services are called. Cloud / self-hosted modes
 * still require real authentication.
 */

import type { AuthClient, AuthSession, AuthUserProfile } from "./AuthClient";

const LOCAL_USER_PROFILE: AuthUserProfile = {
  id: "local-user",
  email: "",
  name: "Local User",
  role: "user",
  avatar: undefined,
  metadata: { mode: "local" },
};

const LOCAL_SESSION: AuthSession = {
  accessToken: null,
  userId: "local-user",
  profile: LOCAL_USER_PROFILE,
  raw: null,
};

/** AuthClient for local (offline, single-user) runtime. */
export class LocalAuthAdapter implements AuthClient {
  /* ---------- Session ---------- */

  async getSession(): Promise<AuthSession | null> {
    return LOCAL_SESSION;
  }

  /* ---------- Auth ---------- */

  async signUp(): Promise<AuthSession | null> {
    return LOCAL_SESSION;
  }

  async signInWithPassword(): Promise<AuthSession> {
    return LOCAL_SESSION;
  }

  async signInWithOAuth(): Promise<void> {
    throw new Error("OAuth is not available in local runtime");
  }

  async signOut(): Promise<void> {
    // No-op: local mode has no server session to invalidate.
  }

  async updateUser(): Promise<void> {
    // No-op: local mode stores no mutable profile (Phase 2).
  }

  async resetPasswordForEmail(): Promise<void> {
    // No-op: local mode has no email backend.
  }

  /* ---------- Subscriptions ---------- */

  onAuthStateChange(cb: (session: AuthSession | null) => void): () => void {
    // Immediately emit the local session synchronously so consumers fire once.
    cb(LOCAL_SESSION);

    // No recurring polling needed; local session never changes.
    return () => {
      /* unsubscribe is a no-op */
    };
  }
}
