/**
 * CloudSessionIndicator — Axis 2: Appwrite login on desktop without switching runtime profile.
 * Location: src/components/desktop/CloudSessionIndicator.tsx
 */

import { Cloud, LogIn, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCloudSession } from "@/hooks/useCloudSession";
import { CloudAuthTargetBadge } from "./CloudAuthTargetBadge";

export function CloudSessionIndicator() {
  const {
    visible,
    hasSession,
    busy,
    configOk,
    hybridReady,
    authTarget,
    openLoginDialog,
    logout,
  } = useCloudSession();

  if (!visible) {
    return null;
  }

  if (hasSession) {
    const targetLabel = authTarget === "selfHosted" ? "Self Host" : "Managed";
    return (
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              disabled={busy}
              aria-label={`Cloud abmelden (${targetLabel})`}
              onClick={() => void logout()}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4 text-primary" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Cloud angemeldet ({targetLabel})
            {hybridReady ? " — KI/TTS verfügbar" : ""}
          </TooltipContent>
        </Tooltip>
        <CloudAuthTargetBadge target={authTarget} />
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          disabled={busy}
          aria-label="Bei Scriptony Cloud anmelden"
          onClick={openLoginDialog}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogIn className="size-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {configOk
          ? "Cloud anmelden (KI, TTS, Sync) — Arbeit bleibt lokal"
          : "Cloud anmelden — Managed oder Self Host im Dialog"}
      </TooltipContent>
    </Tooltip>
  );
}
