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

export function CloudSessionIndicator() {
  const {
    visible,
    checking,
    hasSession,
    busy,
    configOk,
    hybridReady,
    login,
    logout,
  } = useCloudSession();

  if (!visible) {
    return null;
  }

  if (checking) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="size-9"
        disabled
        aria-label="Cloud"
      >
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </Button>
    );
  }

  if (!configOk) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 opacity-50"
            disabled
            aria-label="Cloud nicht konfiguriert"
          >
            <Cloud className="size-4 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Cloud (Hybrid): Appwrite in .env.local konfigurieren
        </TooltipContent>
      </Tooltip>
    );
  }

  if (hasSession) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            disabled={busy}
            aria-label="Cloud abmelden"
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
          Cloud angemeldet
          {hybridReady ? " — KI/TTS verfügbar" : ""}
        </TooltipContent>
      </Tooltip>
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
          onClick={() => void login()}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogIn className="size-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        Cloud anmelden (KI, TTS, Sync) — Arbeit bleibt lokal
      </TooltipContent>
    </Tooltip>
  );
}
