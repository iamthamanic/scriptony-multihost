/**
 * Reusable scene background image overlay for timeline clips.
 * Renders an absolutely positioned background-image layer with optional
 * darkening overlay to keep text readable.
 */
import { cn } from "../ui/utils";
import { useResolvedProjectAssetUrl } from "@/hooks/useResolvedProjectAssetUrl";

interface TimelineSceneImageProps {
  imageUrl?: string;
  className?: string;
  darken?: boolean;
}

export function TimelineSceneImage({
  imageUrl,
  className,
  darken = true,
}: TimelineSceneImageProps) {
  const resolvedUrl = useResolvedProjectAssetUrl(imageUrl);
  if (!resolvedUrl) return null;
  return (
    <div
      className={cn("absolute inset-0 rounded-[inherit] z-0", className)}
      style={{
        backgroundImage: `url("${resolvedUrl.replace(/"/g, '\\"')}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {darken && (
        <div className="absolute inset-0 rounded-[inherit] bg-black/20 dark:bg-black/40" />
      )}
    </div>
  );
}
