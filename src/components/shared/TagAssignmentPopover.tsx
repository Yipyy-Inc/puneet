"use client";

import { useState } from "react";
import { Search, Check, Plus } from "lucide-react";
import { resolveIcon } from "@/lib/service-registry";
import { getContrastTextColor } from "@/lib/color-utils";
import { getTagsByType } from "@/data/tags-notes";
import type { TagType } from "@/data/tags-notes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TagAssignmentPopoverProps {
  entityType: TagType;
  assignedTagIds: string[];
  onAssign: (tagId: string) => void;
  onUnassign: (tagId: string) => void;
  children: React.ReactNode;
}

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Critical",
  warning: "Warning",
  informational: "Info",
};

export function TagAssignmentPopover({
  entityType,
  assignedTagIds,
  onAssign,
  onUnassign,
  children,
}: TagAssignmentPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const allTags = getTagsByType(entityType);
  const filtered = allTags.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description?.toLowerCase().includes(search.toLowerCase()) ?? false),
  );

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setSearch("");
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-72 max-w-[calc(100vw-2rem)] p-0"
        align="start"
      >
        <div className="border-b p-2">
          <div className="relative">
            <Search
              className="text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              placeholder="Search tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>
        </div>

        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No tags found
            </p>
          )}
          {filtered.map((tag) => {
            const isAssigned = assignedTagIds.includes(tag.id);
            const Icon = resolveIcon(tag.icon);
            const textColor = getContrastTextColor(tag.color);

            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  if (isAssigned) {
                    onUnassign(tag.id);
                  } else {
                    onAssign(tag.id);
                  }
                }}
                className={cn(
                  `hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors`,
                  isAssigned && "bg-accent/50",
                )}
              >
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: tag.color, color: textColor }}
                >
                  <Icon className="size-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium">{tag.name}</span>
                    <span
                      className={cn(
                        "rounded-sm px-1 text-[10px] tracking-wider uppercase",
                        tag.priority === "critical" &&
                          `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`,
                        tag.priority === "warning" &&
                          `bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400`,
                        tag.priority === "informational" &&
                          `bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400`,
                      )}
                    >
                      {PRIORITY_LABELS[tag.priority]}
                    </span>
                  </div>
                  {tag.description && (
                    <p className="text-muted-foreground truncate text-xs">
                      {tag.description}
                    </p>
                  )}
                </div>
                {isAssigned && (
                  <Check className="text-primary size-4 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Create new tag link */}
        <div className="border-t p-2">
          <a
            href="/facility/dashboard/settings?tab=tags-notes"
            className="text-primary hover:bg-accent flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          >
            <Plus className="size-3" />
            Create new tag
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}
