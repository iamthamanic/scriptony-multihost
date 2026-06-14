/**
 * Cloud login modal: Managed vs Self-Host tabs; network only on Save / Login.
 * Location: src/components/desktop/CloudLoginDialog.tsx
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CloudCredentialsForm } from "@/components/auth/CloudCredentialsForm";
import { SelfHostedServerFields } from "@/components/auth/SelfHostedServerFields";
import type { CloudAuthTarget } from "@/lib/auth/cloud-appwrite-target";
import { isInsecureAppwriteEndpoint } from "@/lib/auth/cloud-appwrite-target";
import { useCloudSession } from "@/providers/CloudLoginProvider";

export function CloudLoginDialog() {
  const {
    loginDialogOpen,
    closeLoginDialog,
    busy,
    authTarget,
    setAuthTarget,
    activeSelfHosted,
    credentialsReady,
    signInWithCredentials,
    signUpWithCredentials,
    resetPassword,
    saveSelfHostedServer,
    testSelfHostedServer,
  } = useCloudSession();

  const [shValues, setShValues] = useState({
    name: "",
    endpoint: "",
    projectId: "",
  });

  useEffect(() => {
    if (!loginDialogOpen) return;
    if (activeSelfHosted) {
      setShValues({
        name: activeSelfHosted.name,
        endpoint: activeSelfHosted.endpoint,
        projectId: activeSelfHosted.projectId,
      });
    }
  }, [loginDialogOpen, activeSelfHosted]);

  const handleOpenChange = (open: boolean) => {
    if (!open) closeLoginDialog();
  };

  const onTabChange = (value: string) => {
    void setAuthTarget(value as CloudAuthTarget);
  };

  if (!loginDialogOpen) {
    return null;
  }

  const selfHostCredentialsDisabled =
    authTarget === "selfHosted" && !credentialsReady;
  const showHttpWarning =
    authTarget === "selfHosted" &&
    shValues.endpoint.trim() &&
    isInsecureAppwriteEndpoint(shValues.endpoint);

  return (
    <Dialog open={loginDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scriptony Cloud</DialogTitle>
          <DialogDescription className="sr-only">
            Anmeldung für Scriptony Cloud
          </DialogDescription>
        </DialogHeader>

        <Tabs value={authTarget} onValueChange={onTabChange}>
          <TabsList className="w-full">
            <TabsTrigger value="managed" className="flex-1">
              Managed
            </TabsTrigger>
            <TabsTrigger value="selfHosted" className="flex-1">
              Self Host
            </TabsTrigger>
          </TabsList>

          <TabsContent value="managed" className="space-y-4 mt-4">
            {!credentialsReady ? (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Managed Cloud:{" "}
                <code className="text-xs">VITE_APPWRITE_ENDPOINT</code> und{" "}
                <code className="text-xs">VITE_APPWRITE_PROJECT_ID</code> in{" "}
                <code className="text-xs">.env.local</code> setzen — oder Tab
                Self Host nutzen.
              </p>
            ) : null}
            <CloudCredentialsForm
              busy={busy}
              disabled={!credentialsReady}
              disabledHintId="cloud-managed-cred-hint"
              disabledHint="Managed Cloud: Appwrite-Variablen in .env.local setzen."
              onSignIn={signInWithCredentials}
              onSignUp={signUpWithCredentials}
              onResetPassword={resetPassword}
            />
          </TabsContent>

          <TabsContent value="selfHosted" className="space-y-4 mt-4">
            {showHttpWarning ? (
              <Alert variant="destructive">
                <AlertDescription>
                  Unverschlüsseltes HTTP — nur für lokale Tests empfohlen. In
                  Produktion HTTPS verwenden.
                </AlertDescription>
              </Alert>
            ) : null}
            <SelfHostedServerFields
              idPrefix="cloud-sh"
              showName={false}
              values={shValues}
              onChange={(patch) => setShValues((v) => ({ ...v, ...patch }))}
              busy={busy}
              onTest={() =>
                void testSelfHostedServer(
                  shValues.endpoint,
                  shValues.projectId,
                ).then((r) => {
                  if (r.ok) toast.success("Verbindung erfolgreich");
                  else toast.error(r.message ?? "Verbindung fehlgeschlagen");
                })
              }
              onSave={() =>
                void saveSelfHostedServer({
                  name: shValues.name,
                  endpoint: shValues.endpoint,
                  projectId: shValues.projectId,
                })
              }
              saveLabel="Speichern"
            />
            {activeSelfHosted ? (
              <p className="text-xs text-muted-foreground">
                Gespeichert: {activeSelfHosted.endpoint}
              </p>
            ) : null}
            <CloudCredentialsForm
              busy={busy}
              disabled={selfHostCredentialsDisabled}
              disabledHintId="cloud-selfhost-cred-hint"
              disabledHint="Bitte zuerst den Self-Host-Server speichern (Speichern-Button oben)."
              onSignIn={signInWithCredentials}
              onSignUp={signUpWithCredentials}
              onResetPassword={resetPassword}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
