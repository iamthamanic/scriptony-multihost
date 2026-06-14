/**
 * Cloud account profile + security UI (logic in useCloudAccountSettings).
 * Location: src/components/settings/CloudAccountSettingsSection.tsx
 */

import { LogOut } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCloudAccountSettings } from "@/hooks/useCloudAccountSettings";
import { CloudAccountProfileCard } from "./cloud-account/CloudAccountProfileCard";
import { CloudAccountPasswordCard } from "./cloud-account/CloudAccountPasswordCard";
import { CloudAccountDeleteCard } from "./cloud-account/CloudAccountDeleteCard";

export function CloudAccountSettingsSection() {
  const s = useCloudAccountSettings();

  if (s.loadingProfile) {
    return (
      <p className="text-sm text-muted-foreground px-1">
        Profil wird geladen …
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {s.isDemoMode ? (
        <Card className="border-accent bg-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🎭</div>
              <div>
                <p className="text-sm font-medium">Demo Mode aktiv</p>
                <p className="text-xs text-muted-foreground">
                  Du nutzt die App ohne Authentifizierung. Daten werden nicht
                  gespeichert.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <CloudAccountProfileCard
        title={s.t("settings.profile")}
        nameLabel={s.t("auth.name")}
        emailLabel={s.t("auth.email")}
        saveLabel={s.t("common.save")}
        name={s.name}
        email={s.email}
        isDemoMode={s.isDemoMode}
        savingProfile={s.savingProfile}
        onNameChange={s.setName}
        onSave={() => void s.handleSaveProfile()}
      />

      <CloudAccountPasswordCard
        oldPassword={s.oldPassword}
        newPassword={s.newPassword}
        confirmPassword={s.confirmPassword}
        isDemoMode={s.isDemoMode}
        changingPassword={s.changingPassword}
        onOldPasswordChange={s.setOldPassword}
        onNewPasswordChange={s.setNewPassword}
        onConfirmPasswordChange={s.setConfirmPassword}
        onSubmit={() => void s.handleChangePassword()}
      />

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Zwei-Faktor (2FA)</CardTitle>
          <CardDescription className="text-xs">
            Demnächst verfügbar
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-sm text-muted-foreground">
            2FA wird in einer späteren Version angebunden.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Aktive Sitzung</CardTitle>
          <CardDescription className="text-xs">
            Diese Cloud-Anmeldung auf dem Gerät
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Aktuelles Gerät</p>
              <p className="text-xs text-muted-foreground">Diese Sitzung</p>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">
              Aktuell
            </Badge>
          </div>
        </CardContent>
      </Card>

      <CloudAccountDeleteCard
        isDemoMode={s.isDemoMode}
        deletePassword={s.deletePassword}
        deletingAccount={s.deletingAccount}
        deleteDialogOpen={s.deleteDialogOpen}
        onDeletePasswordChange={s.setDeletePassword}
        onDeleteDialogOpenChange={s.setDeleteDialogOpen}
        onConfirmDelete={() => void s.handleDeleteAccount()}
      />

      <Button
        onClick={() => void s.handleLogout()}
        variant="destructive"
        className="w-full h-11"
        disabled={s.cloudBusy}
      >
        <LogOut className="size-4 mr-2" />
        {s.isDemoMode
          ? "Demo Mode beenden"
          : s.isDesktopCloud
            ? "Cloud abmelden"
            : s.t("auth.logout")}
      </Button>
    </div>
  );
}
