/**
 * Preset genre pills + optional custom genres (same button style). "+" opens popover to add a label.
 * Location: used on ProjectsPage (new project + project detail edit).
 */
import {
  useId,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../ui/utils";
import {
  PROJECT_PRESET_GENRE_SET,
  PROJECT_PRESET_GENRES,
} from "@/lib/projects/projects-page-utils";

export type GenrePillGridProps = {
  selected: string[];
  onSelectedChange: Dispatch<SetStateAction<string[]>>;
  customPool: string[];
  onCustomPoolChange: Dispatch<SetStateAction<string[]>>;
  compact?: boolean;
};

export function GenrePillGrid({
  selected,
  onSelectedChange,
  customPool,
  onCustomPoolChange,
  compact,
}: GenrePillGridProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const inputId = useId();

  const displayGenres = useMemo(() => {
    const extras = customPool.filter((g) => !PROJECT_PRESET_GENRE_SET.has(g));
    return [...PROJECT_PRESET_GENRES, ...extras];
  }, [customPool]);

  const toggle = (genre: string) => {
    onSelectedChange((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  };

  const addCustom = () => {
    const name = draft.trim();
    if (!name) return;
    const lower = name.toLowerCase();
    const exists = displayGenres.some((g) => g.toLowerCase() === lower);
    if (exists) {
      toast.error("Dieses Genre gibt es schon.");
      return;
    }
    onCustomPoolChange((prev) => [...prev, name]);
    onSelectedChange((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setDraft("");
    setAddOpen(false);
  };

  const pillBase = compact
    ? "px-3 py-1.5 rounded-lg border transition-all text-sm"
    : "px-4 py-2 rounded-lg border transition-all text-sm";

  return (
    <div className="flex flex-wrap gap-2">
      {displayGenres.map((genre) => (
        <button
          key={genre}
          type="button"
          onClick={() => toggle(genre)}
          className={cn(
            pillBase,
            selected.includes(genre)
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-border hover:border-primary/50",
          )}
        >
          {genre}
        </button>
      ))}
      <Popover open={addOpen} onOpenChange={setAddOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              pillBase,
              "border-dashed bg-background border-border hover:border-primary/50 inline-flex items-center justify-center min-w-[2.5rem]",
            )}
            aria-label="Eigenes Genre hinzufügen"
          >
            <Plus className="size-4 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <div className="space-y-2">
            <Label htmlFor={inputId}>Eigenes Genre</Label>
            <Input
              id={inputId}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="z. B. Cyberpunk"
              className="h-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={addCustom}
            >
              Hinzufügen
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
