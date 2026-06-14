/**
 * Change password for cloud account (Axis 2).
 * Location: src/components/settings/cloud-account/CloudAccountPasswordCard.tsx
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
  isDemoMode: boolean;
  changingPassword: boolean;
  onOldPasswordChange: (v: string) => void;
  onNewPasswordChange: (v: string) => void;
  onConfirmPasswordChange: (v: string) => void;
  onSubmit: () => void;
};

export function CloudAccountPasswordCard({
  oldPassword,
  newPassword,
  confirmPassword,
  isDemoMode,
  changingPassword,
  onOldPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: Props) {
  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-base">Passwort ändern</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        <div className="space-y-2">
          <Label className="text-sm">Altes Passwort</Label>
          <Input
            type="password"
            className="h-11"
            value={oldPassword}
            onChange={(e) => onOldPasswordChange(e.target.value)}
            autoComplete="current-password"
            disabled={isDemoMode}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Neues Passwort</Label>
          <Input
            type="password"
            className="h-11"
            value={newPassword}
            onChange={(e) => onNewPasswordChange(e.target.value)}
            autoComplete="new-password"
            disabled={isDemoMode}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Neues Passwort wiederholen</Label>
          <Input
            type="password"
            className="h-11"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            autoComplete="new-password"
            disabled={isDemoMode}
          />
        </div>
        <Button
          className="w-full h-11"
          onClick={onSubmit}
          disabled={changingPassword || isDemoMode}
        >
          Passwort ändern
        </Button>
      </CardContent>
    </Card>
  );
}
