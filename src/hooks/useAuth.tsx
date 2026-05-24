import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  getOAuthRedirectTarget,
  getPasswordResetRedirectTarget,
} from "../lib/auth/auth-redirect";
import { getAuthClient, setAuthRuntime } from "../lib/auth/getAuthClient";
import { useRuntime } from "../runtime";
import { getAuthToken } from "../lib/auth/getAuthToken";
import { buildAuthProfileFromSession } from "../lib/auth/auth-profile";

interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "superadmin";
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: "google" | "github") => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const runtime = useRuntime();

  // Sync runtime with auth singleton so non-React call sites reuse it (DRY).
  useEffect(() => {
    setAuthRuntime(runtime);
  }, [runtime]);

  // Check for existing session on mount and listen for auth changes
  useEffect(() => {
    checkSession();

    // Listen for auth state changes via adapter (pass runtime for consistency)
    const unsubscribe = getAuthClient(runtime).onAuthStateChange(
      async (session) => {
        console.log(
          "Auth state changed:",
          session ? "SIGNED_IN" : "SIGNED_OUT",
        );

        const profile = buildAuthProfileFromSession(session);
        setUser(profile);
      },
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [runtime]);

  const checkSession = async () => {
    try {
      const session = await getAuthClient(runtime).getSession();

      if (!session) {
        setUser(null);
        return;
      }

      setUser(buildAuthProfileFromSession(session));
    } catch (error) {
      console.error("Error checking session:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      const session = await getAuthClient(runtime).signUp(email, password, {
        displayName: name,
        metadata: {
          name,
          role: "user",
        },
        redirectTo: getOAuthRedirectTarget(runtime),
      });

      if (session) {
        const profile = buildAuthProfileFromSession(session);
        setUser(profile);
        return;
      }

      await signIn(email, password);
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);

      const session = await getAuthClient(runtime).signInWithPassword(
        email,
        password,
      );
      setUser(buildAuthProfileFromSession(session));
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithOAuth = async (provider: "google" | "github") => {
    try {
      setLoading(true);

      await getAuthClient(runtime).signInWithOAuth(provider, {
        redirectTo: getOAuthRedirectTarget(runtime),
      });

      // OAuth redirects to provider, so no need to update state here
      // The onAuthStateChange listener will handle the session after redirect
    } catch (error) {
      console.error("OAuth sign in error:", { provider, error });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await getAuthClient(runtime).signOut();
      setUser(null);
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      if (!user) throw new Error("No user logged in");

      await getAuthClient(runtime).updateUser({
        data: {
          name: updates.name || user.name,
          avatar: updates.avatar || user.avatar,
        },
      });

      setUser({ ...user, ...updates });
    } catch (error) {
      console.error("Update profile error:", error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await getAuthClient(runtime).resetPasswordForEmail(
        email,
        getPasswordResetRedirectTarget(runtime),
      );
    } catch (error) {
      console.error("Password reset error:", error);
      throw error;
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      await getAuthClient(runtime).updateUser({
        password: newPassword,
      });
    } catch (error) {
      console.error("Update password error:", error);
      throw error;
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    try {
      return await getAuthToken();
    } catch (error) {
      console.error("Error getting access token:", error);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signInWithOAuth,
        signOut,
        updateProfile,
        resetPassword,
        updatePassword,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// Legacy export removed - use getAuthClient() instead
