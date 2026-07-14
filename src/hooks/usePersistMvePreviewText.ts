/**
 * Debounced auto-save for MVE voice profile preview text.
 * Location: src/hooks/usePersistMvePreviewText.ts
 */

import { useEffect, useRef } from "react";
import { updateMveVoiceProfile } from "@/lib/api-adapter/mve-adapter";

export function usePersistMvePreviewText(params: {
  profileId?: string | null;
  previewText: string;
  enabled?: boolean;
  debounceMs?: number;
  onPersisted?: (previewText: string) => void;
}): void {
  const {
    profileId,
    previewText,
    enabled = true,
    debounceMs = 700,
    onPersisted,
  } = params;
  const lastPersistedRef = useRef("");
  const sessionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const sessionKey = enabled && profileId ? `${profileId}:open` : null;
    if (sessionKey !== sessionKeyRef.current) {
      sessionKeyRef.current = sessionKey;
      if (sessionKey) {
        lastPersistedRef.current = previewText.trim();
      }
    }
  }, [enabled, profileId, previewText]);

  useEffect(() => {
    if (!enabled || !profileId) return;

    const trimmed = previewText.trim();
    if (!trimmed || trimmed === lastPersistedRef.current) return;

    const timer = window.setTimeout(() => {
      void updateMveVoiceProfile(profileId, { previewText: trimmed })
        .then(() => {
          lastPersistedRef.current = trimmed;
          onPersisted?.(trimmed);
        })
        .catch(() => {
          // Silent — footer save remains available.
        });
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [debounceMs, enabled, onPersisted, previewText, profileId]);
}
