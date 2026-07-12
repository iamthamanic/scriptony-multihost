/**
 * Badge showing active cloud-auth target (Managed vs Self Host) when logged in.
 * Location: src/components/desktop/CloudAuthTargetBadge.tsx
 */

import { Badge } from "@/components/ui/badge";
import type { CloudAuthTarget } from "@/lib/auth/cloud-appwrite-target";

interface CloudAuthTargetBadgeProps {
  target: CloudAuthTarget;
}

export function CloudAuthTargetBadge({ target }: CloudAuthTargetBadgeProps) {
  const label = target === "selfHosted" ? "Self Host" : "Managed";
  return (
    <Badge
      variant="outline"
      className="h-5 px-1.5 text-[10px] font-medium uppercase tracking-wide"
    >
      {label}
    </Badge>
  );
}
