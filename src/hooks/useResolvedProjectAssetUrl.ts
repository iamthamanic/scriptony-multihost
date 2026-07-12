/**
 * Resolve assets/… paths to Tauri WebView URLs for <img> / preview display.
 */

import { useEffect, useState } from "react";
import { resolveLocalProjectAssetPath } from "@/lib/local-asset-display-url";

export function useResolvedProjectAssetUrl(
  urlOrPath: string | undefined | null,
): string {
  const [resolved, setResolved] = useState("");

  useEffect(() => {
    let active = true;
    setResolved("");

    void resolveLocalProjectAssetPath(urlOrPath).then((url) => {
      if (active) setResolved(url);
    });

    return () => {
      active = false;
    };
  }, [urlOrPath]);

  return resolved;
}
