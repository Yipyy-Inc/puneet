"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallTags } from "@/hooks/use-call-tags";
import { tagColorClasses } from "@/lib/calling/call-tags";

/**
 * Multi-select call-tag picker (light theme) for the call-log side panel.
 * Shows the chosen tags as removable pills plus a popover to toggle any tag
 * from the manager-defined taxonomy.
 */
export function CallTagSelect({
  selected,
  onChange,
  className,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}) {
  const { tags } = useCallTags();
  const [open, setOpen] = useState(false);

  const toggle = (id: string) =>
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );

  const chosen = tags.filter((t) => selected.includes(t.id));

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {chosen.map((t) => {
        const c = tagColorClasses(t.color);
        return (
          <span
            key={t.id}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
              c.pill,
            )}
          >
            {t.name}
            <button
              type="button"
              onClick={() => toggle(t.id)}
              className="hover:opacity-70"
              aria-label={`Remove ${t.name}`}
            >
              <X className="size-3" />
            </button>
          </span>
        );
      })}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 gap-1 rounded-full px-2 text-xs"
          >
            <Plus className="size-3" />
            {chosen.length === 0 ? "Add tag" : "Tag"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-60 p-1">
          <div className="max-h-64 overflow-y-auto">
            {tags.length === 0 && (
              <p className="p-2 text-xs text-muted-foreground">
                No tags defined yet. Add them in Settings → Call Tags.
              </p>
            )}
            {tags.map((t) => {
              const c = tagColorClasses(t.color);
              const on = selected.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <span className={cn("size-2.5 shrink-0 rounded-full", c.solid)} />
                  <span className="flex-1 truncate">{t.name}</span>
                  {on && <Check className="size-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
