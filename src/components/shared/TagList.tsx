"use client";

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { TagBadge } from "@/components/shared/TagBadge";
import { TagAssignmentPopover } from "@/components/shared/TagAssignmentPopover";
import { useTagsForEntity } from "@/hooks/use-tags-notes";
import type { TagType } from "@/types/tags";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useShellText } from "@/lib/shell/use-shell-text";

interface TagListProps {
  entityType: TagType;
  entityId: number;
  maxVisible?: number;
  compact?: boolean;
  editable?: boolean;
  isCustomerView?: boolean;
  className?: string;
}

export function TagList({
  entityType,
  entityId,
  maxVisible = 5,
  compact = false,
  editable = false,
  isCustomerView = false,
  className,
}: TagListProps) {
  const t = useShellText("shared");
  const { tags, assignments, assign, unassign } = useTagsForEntity(
    entityType,
    entityId,
  );
  const [overflowOpen, setOverflowOpen] = useState(false);

  // A second filter, not the boundary. Since 20260906221303 RLS refuses a
  // customer both the internal tag and the assignment that points at it, so a
  // call site that forgets `isCustomerView` no longer leaks anything — this
  // keeps the prop honest for a staff surface that wants the client's view.
  const visibleTags = isCustomerView
    ? tags.filter((t) => t.visibility === "client_visible")
    : tags;

  const assignmentByTagId = useMemo(
    () => new Map(assignments.map((a) => [a.tagId, a])),
    [assignments],
  );

  if (visibleTags.length === 0 && !editable) return null;

  const size = compact ? "sm" : "md";
  const shown = visibleTags.slice(0, maxVisible);
  const overflow = visibleTags.slice(maxVisible);

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {shown.map((tag) => {
        const assignment = assignmentByTagId.get(tag.id);
        return (
          <TagBadge
            key={tag.id}
            tag={tag}
            size={size}
            showRemove={editable && !isCustomerView}
            onRemove={
              editable && assignment ? () => unassign(assignment.id) : undefined
            }
          />
        );
      })}

      {overflow.length > 0 && (
        <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t("showMoreTags").replace(
                "{count}",
                String(overflow.length),
              )}
              className={cn(
                `border-border bg-muted text-muted-foreground hover:bg-accent inline-flex shrink-0 items-center rounded-full border font-medium transition-colors`,
                size === "sm" ? "h-5 px-1.5 text-[10px]" : "h-6 px-2 text-xs",
              )}
            >
              +{overflow.length}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto max-w-xs p-2" align="start">
            <div className="flex flex-wrap gap-1">
              {overflow.map((tag) => {
                const assignment = assignmentByTagId.get(tag.id);
                return (
                  <TagBadge
                    key={tag.id}
                    tag={tag}
                    size="md"
                    showRemove={editable && !isCustomerView}
                    onRemove={
                      editable && assignment
                        ? () => unassign(assignment.id)
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {editable && !isCustomerView && (
        <TagAssignmentPopover
          entityType={entityType}
          assignedTagIds={tags.map((t) => t.id)}
          onAssign={assign}
          onUnassign={(tagId) => {
            const assignment = assignmentByTagId.get(tagId);
            if (assignment) unassign(assignment.id);
          }}
        >
          <button
            type="button"
            className={cn(
              `border-muted-foreground/40 text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary inline-flex items-center justify-center rounded-full border border-dashed transition-colors`,
              size === "sm" ? "size-5" : "size-6",
            )}
            aria-label={t("addTag")}
            title={t("addTag")}
          >
            <Plus className={size === "sm" ? "h-2.5 w-2.5" : "size-3"} />
          </button>
        </TagAssignmentPopover>
      )}
    </div>
  );
}
