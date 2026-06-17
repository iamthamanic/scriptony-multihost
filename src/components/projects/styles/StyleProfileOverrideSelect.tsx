/**
 * Dropdown to pick a style profile override (Step 4 timeline UI).
 * Location: src/components/projects/styles/StyleProfileOverrideSelect.tsx
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { useProjectStyleProfiles } from "@/hooks/useProjectStyleProfiles";

interface StyleProfileOverrideSelectProps {
  projectId: string;
  value?: string | null;
  onChange: (profileId: string | null) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

export function StyleProfileOverrideSelect({
  projectId,
  value,
  onChange,
  label,
  disabled,
  className,
}: StyleProfileOverrideSelectProps) {
  const { data: profiles } = useProjectStyleProfiles(projectId);

  return (
    <div className={className}>
      <label className="text-xs text-muted-foreground block mb-1">
        {label}
      </label>
      <Select
        value={value ?? "__none__"}
        disabled={disabled}
        onValueChange={(next) => onChange(next === "__none__" ? null : next)}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Kein Override" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— Kein Override —</SelectItem>
          {(profiles ?? []).map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
              {p.isActiveForProject ? " (aktiv)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
