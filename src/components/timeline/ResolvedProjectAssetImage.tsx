/**
 * Renders a local assets/… path or remote URL via convertFileSrc when needed.
 */

import { useResolvedProjectAssetUrl } from "@/hooks/useResolvedProjectAssetUrl";

interface ResolvedProjectAssetImageProps {
  url?: string | null;
  alt: string;
  className?: string;
}

export function ResolvedProjectAssetImage({
  url,
  alt,
  className,
}: ResolvedProjectAssetImageProps) {
  const resolved = useResolvedProjectAssetUrl(url);
  if (!resolved) return null;
  return <img src={resolved} alt={alt} className={className} />;
}
