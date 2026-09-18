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
import type { TagType } from "@/types/tags";
import { cn } from "@/lib/utils";
import { useStaffText } from "@/lib/staff/use-staff-text";

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
  const { t } = useStaffText("recordButtons");
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
            "gap-1.5 text-sm",
            hasAlert && "border-destructive text-destructive",
            className,
          )}
        >
          <Tags className="size-4" />
          {t("tags")}
          {count > 0 && (
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                hasAlert
                  ? "bg-wash-error text-destructive"
                  : "bg-muted text-ink-secondary",
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
        <p className="text-ink-tertiary mb-3 text-xs font-bold tracking-[.06em] uppercase">
          {t("tags")}
        </p>
        <TagList
          entityType={entityType}
          entityId={entityId}
          editable
          maxVisible={20}
        />
        {count === 0 && (
          <p className="text-ink-secondary mt-2 text-center text-sm">
            {t("noTags")}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
