/**
 * Email/password login form for Scriptony Cloud (Axis 2).
 * Location: src/components/auth/CloudCredentialsForm.tsx
 */

import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCloudCredentialsForm,
  type CloudCredentialsMode,
} from "./useCloudCredentialsForm";

export type { CloudCredentialsMode };

interface CloudCredentialsFormProps {
  busy: boolean;
  disabled?: boolean;
  disabledHintId?: string;
  disabledHint?: string;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
}

function CloudCredentialsModeLinks({
  mode,
  setMode,
  fieldsDisabled,
}: {
  mode: CloudCredentialsMode;
  setMode: (m: CloudCredentialsMode) => void;
  fieldsDisabled: boolean;
}) {
  if (mode === "login") {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Noch kein Konto?{" "}
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={() => setMode("register")}
          disabled={fieldsDisabled}
        >
          Registrieren
        </button>
      </p>
    );
  }
  if (mode === "register") {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Bereits ein Konto?{" "}
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={() => setMode("login")}
          disabled={fieldsDisabled}
        >
          Anmelden
        </button>
      </p>
    );
  }
  return (
    <p className="text-center text-sm text-muted-foreground">
      <button
        type="button"
        className="text-primary hover:underline"
        onClick={() => setMode("login")}
        disabled={fieldsDisabled}
      >
        Zurück zur Anmeldung
      </button>
    </p>
  );
}

export function CloudCredentialsForm({
  busy,
  disabled = false,
  disabledHintId = "cloud-cred-disabled-hint",
  disabledHint = "Bitte zuerst den Self-Host-Server speichern.",
  onSignIn,
  onSignUp,
  onResetPassword,
}: CloudCredentialsFormProps) {
  const form = useCloudCredentialsForm({
    disabled,
    onSignIn,
    onSignUp,
    onResetPassword,
  });
  const fieldsDisabled = busy || disabled;

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => void form.handleSubmit(e)}
        className="space-y-4"
        aria-describedby={disabled ? disabledHintId : undefined}
      >
        <div className="space-y-2">
          <Label htmlFor="cloud-cred-email">E-Mail</Label>
          <Input
            id="cloud-cred-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => form.setEmail(e.target.value)}
            required
            disabled={fieldsDisabled}
          />
        </div>

        {form.mode === "register" ? (
          <div className="space-y-2">
            <Label htmlFor="cloud-cred-name">Name</Label>
            <Input
              id="cloud-cred-name"
              value={form.name}
              onChange={(e) => form.setName(e.target.value)}
              placeholder="Anzeigename"
              disabled={fieldsDisabled}
            />
          </div>
        ) : null}

        {form.mode !== "forgot" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="cloud-cred-password">Passwort</Label>
              {form.mode === "login" ? (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => form.setMode("forgot")}
                  disabled={fieldsDisabled}
                >
                  Passwort vergessen?
                </button>
              ) : null}
            </div>
            <div className="relative">
              <Input
                id="cloud-cred-password"
                type={form.showPassword ? "text" : "password"}
                autoComplete={
                  form.mode === "register" ? "new-password" : "current-password"
                }
                value={form.password}
                onChange={(e) => form.setPassword(e.target.value)}
                required
                disabled={fieldsDisabled}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
                onClick={() => form.setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={
                  form.showPassword ? "Passwort verbergen" : "Passwort anzeigen"
                }
              >
                {form.showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={fieldsDisabled}>
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Bitte warten…
            </>
          ) : form.mode === "register" ? (
            "Konto erstellen"
          ) : form.mode === "forgot" ? (
            "Link senden"
          ) : (
            "Anmelden"
          )}
        </Button>
      </form>

      {disabled ? (
        <p
          id={disabledHintId}
          className="text-sm text-muted-foreground"
          role="status"
        >
          {disabledHint}
        </p>
      ) : null}

      <CloudCredentialsModeLinks
        mode={form.mode}
        setMode={form.setMode}
        fieldsDisabled={fieldsDisabled}
      />
    </div>
  );
}
