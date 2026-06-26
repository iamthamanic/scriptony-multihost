/**
 * MVE Text Block Audio Action Button — single tooltip-wrapped icon button for
 * the audio menu (T28). Extracted to keep MveTextBlockAudioMenu under 150
 * lines.
 *
 * Location: src/components/structure/timeline/mve/MveAudioActionButton.tsx
 */

import { Button } from "../../../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../ui/tooltip";
import type { LucideIcon } from "lucide-react";

export interface MveAudioActionButtonProps {
  icon: LucideIcon;
  label: string;
  tooltip: string;
  disabled?: boolean;
  variant?: "ghost" | "outline" | "destructive" | "secondary";
  className?: string;
  onClick: () => void;
  isLoading?: boolean;
  testId?: string;
}

export function MveAudioActionButton({
  icon: Icon,
  label,
  tooltip,
  disabled,
  variant = "ghost",
  className,
  onClick,
  isLoading,
  testId,
}: MveAudioActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant={variant}
          className={className}
          disabled={disabled}
          onClick={onClick}
          aria-label={label}
          data-testid={testId}
        >
          {isLoading ? (
            <span className="size-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <Icon className="size-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
