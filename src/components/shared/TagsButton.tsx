"use client";

import { useState } from "react";
import { Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TagList } from "@/components/shared/TagList";
import { useTagsForEntity } from "@/hooks/use-tags-notes";
import type { TagType } from "@/data/tags-notes";
import { cn } from "@/lib/utils";

interface TagsButtonProps {
  entityType: TagType;
  entityId: number;
  className?: string;
}

export function TagsButton({
  entityType,
  entityId,
  className,
}: TagsButtonProps) {
  const [open, setOpen] = useState(false);
  const { tags, hasCritical, hasWarning } = useTagsForEntity(
    entityType,
    entityId,
  );
  const count = tags.length;
  const hasAlert = hasCritical || hasWarning;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-1.5 rounded-lg text-xs",
            hasAlert &&
              "border-red-300 bg-red-50 text-red-700 hover:bg-red-100",
            className,
          )}
        >
          <Tags className="size-3.5" />
          Tags
          {count > 0 && (
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                hasAlert
                  ? "bg-red-200 text-red-800"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[320px] p-4"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
          Tags
        </p>
        <TagList
          entityType={entityType}
          entityId={entityId}
          editable
          maxVisible={20}
        />
        {count === 0 && (
          <p className="text-muted-foreground mt-2 text-center text-xs">
            No tags assigned
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
