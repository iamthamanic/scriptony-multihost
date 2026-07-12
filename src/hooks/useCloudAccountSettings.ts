/**
 * Cloud account settings actions (profile, password, delete, logout).
 * Location: src/hooks/useCloudAccountSettings.ts
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteCloudAccount,
  getAccountSettingsAuthClient,
  loadAccountSettingsProfile,
} from "@/lib/auth/account-settings-client";
import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useCloudSession } from "@/providers/CloudLoginProvider";
import { useRuntime } from "@/runtime";

export function useCloudAccountSettings() {
  const { t } = useTranslation();
  const runtime = useRuntime();
  const { signOut: appSignOut } = useAuth();
  const { logout: cloudLogout, busy: cloudBusy } = useCloudSession();
  const isDemoMode = localStorage.getItem("scriptony_demo_mode") === "true";
  const isDesktopCloud = isLocalProfile();

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const reloadProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const profile = await loadAccountSettingsProfile(runtime);
      if (profile) {
        setName(profile.name);
        setEmail(profile.email);
      }
    } catch (err) {
      console.error("[useCloudAccountSettings] load profile:", err);
      toast.error("Profil konnte nicht geladen werden.");
    } finally {
      setLoadingProfile(false);
    }
  }, [runtime]);

  useEffect(() => {
    void reloadProfile();
  }, [reloadProfile]);

  const handleSaveProfile = useCallback(async () => {
    if (isDemoMode) {
      toast.success(t("common.success"), {
        description: "Demo Mode: Änderungen werden nicht gespeichert",
      });
      return;
    }
    setSavingProfile(true);
    try {
      const client = await getAccountSettingsAuthClient(runtime);
      await client.updateUser({ data: { name: name.trim() || email } });
      await reloadProfile();
      toast.success(t("common.success"), {
        description: "Profil erfolgreich aktualisiert",
      });
    } catch {
      toast.error(t("common.error"), {
        description: "Fehler beim Aktualisieren des Profils",
      });
    } finally {
      setSavingProfile(false);
    }
  }, [isDemoMode, t, runtime, name, email, reloadProfile]);

  const handleChangePassword = useCallback(async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Bitte alle Passwort-Felder ausfüllen.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Neues Passwort und Wiederholung stimmen nicht überein.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Das neue Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    setChangingPassword(true);
    try {
      const client = await getAccountSettingsAuthClient(runtime);
      await client.updateUser({
        password: newPassword,
        oldPassword,
      });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Passwort wurde geändert.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Passwort konnte nicht geändert werden.";
      toast.error(message);
    } finally {
      setChangingPassword(false);
    }
  }, [oldPassword, newPassword, confirmPassword, runtime]);

  const handleLogout = useCallback(async () => {
    try {
      if (isDemoMode) {
        localStorage.removeItem("scriptony_demo_mode");
        window.location.reload();
        return;
      }
      if (isDesktopCloud) {
        await cloudLogout();
      } else {
        await appSignOut();
        toast.success(t("auth.logoutSuccess"));
      }
    } catch {
      toast.error(t("common.error"));
    }
  }, [isDemoMode, isDesktopCloud, cloudLogout, appSignOut, t]);

  const handleDeleteAccount = useCallback(async () => {
    if (!deletePassword.trim()) {
      toast.error("Bitte dein aktuelles Passwort zur Bestätigung eingeben.");
      return;
    }
    setDeletingAccount(true);
    try {
      await deleteCloudAccount(deletePassword);
      setDeleteDialogOpen(false);
      setDeletePassword("");
      try {
        if (isDesktopCloud) {
          await cloudLogout();
        } else {
          await appSignOut();
        }
      } catch {
        /* session invalid after user deletion */
      }
      toast.success("Cloud-Konto wurde gelöscht.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Konto konnte nicht gelöscht werden.";
      toast.error(message);
    } finally {
      setDeletingAccount(false);
    }
  }, [deletePassword, runtime, email, isDesktopCloud, cloudLogout, appSignOut]);

  return {
    t,
    isDemoMode,
    isDesktopCloud,
    cloudBusy,
    loadingProfile,
    name,
    setName,
    email,
    savingProfile,
    oldPassword,
    setOldPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    changingPassword,
    deletePassword,
    setDeletePassword,
    deletingAccount,
    deleteDialogOpen,
    setDeleteDialogOpen,
    handleSaveProfile,
    handleChangePassword,
    handleLogout,
    handleDeleteAccount,
  };
}
