/**
 * State and submit handler for CloudCredentialsForm.
 * Location: src/components/auth/useCloudCredentialsForm.ts
 */

import { useState } from "react";

export type CloudCredentialsMode = "login" | "register" | "forgot";

type UseCloudCredentialsFormParams = {
  disabled: boolean;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
};

export function useCloudCredentialsForm({
  disabled,
  onSignIn,
  onSignUp,
  onResetPassword,
}: UseCloudCredentialsFormParams) {
  const [mode, setMode] = useState<CloudCredentialsMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || disabled) return;

    if (mode === "forgot") {
      await onResetPassword(email.trim());
      setMode("login");
      return;
    }

    if (!password) return;

    if (mode === "register") {
      await onSignUp(
        email.trim(),
        password,
        name.trim() || email.split("@")[0] || "User",
      );
      return;
    }

    await onSignIn(email.trim(), password);
  };

  return {
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    name,
    setName,
    showPassword,
    setShowPassword,
    handleSubmit,
  };
}
