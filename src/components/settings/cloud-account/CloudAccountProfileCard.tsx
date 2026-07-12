/**
 * Cloud account profile fields (name, email, avatar placeholder).
 * Location: src/components/settings/cloud-account/CloudAccountProfileCard.tsx
 */

import { User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  title: string;
  nameLabel: string;
  emailLabel: string;
  saveLabel: string;
  name: string;
  email: string;
  isDemoMode: boolean;
  savingProfile: boolean;
  onNameChange: (value: string) => void;
  onSave: () => void;
};

export function CloudAccountProfileCard({
  title,
  nameLabel,
  emailLabel,
  saveLabel,
  name,
  email,
  isDemoMode,
  savingProfile,
  onNameChange,
  onSave,
}: Props) {
  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-xs">
          Dein Scriptony-Cloud-Konto
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <User className="size-8" />
          </div>
          <Button variant="secondary" size="sm" className="h-9" disabled>
            Avatar ändern
          </Button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cloud-name" className="text-sm">
            {nameLabel}
          </Label>
          <Input
            id="cloud-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="h-11"
            disabled={isDemoMode}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cloud-email" className="text-sm">
            {emailLabel}
          </Label>
          <Input
            id="cloud-email"
            value={email}
            disabled
            className="bg-muted h-11"
          />
          <p className="text-xs text-muted-foreground">
            Kann nicht geändert werden
          </p>
        </div>
        <Button
          onClick={onSave}
          className="w-full h-11"
          disabled={savingProfile || isDemoMode}
        >
          {saveLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
