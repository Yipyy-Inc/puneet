"use client";

import { useState } from "react";
import { MessageSquare, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotesList } from "@/components/shared/NotesList";
import { useNotesForEntity } from "@/hooks/use-tags-notes";
import type { NoteCategory } from "@/data/tags-notes";
import { cn } from "@/lib/utils";
import { useStaffText } from "@/lib/staff/use-staff-text";

interface NotesButtonProps {
  entityType: NoteCategory;
  entityId: number;
  facilityId?: number;
  className?: string;
  /** Forwarded to NotesList — see the note on its own prop. Staff by default. */
  audience?: "staff" | "customer";
}

export function NotesButton({
  entityType,
  entityId,
  facilityId = 11,
  className,
  audience = "staff",
}: NotesButtonProps) {
  const [open, setOpen] = useState(false);
  const { t } = useStaffText("recordButtons");
  const { noteCount, pinnedNotes } = useNotesForEntity(
    entityType,
    entityId,
    facilityId,
  );
  const hasPinned = pinnedNotes.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5 text-sm",
            hasPinned && "border-warning text-warning",
            className,
          )}
        >
          {hasPinned ? (
            <Pin className="size-4" />
          ) : (
            <MessageSquare className="size-4" />
          )}
          {t("notes")}
          {noteCount > 0 && (
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                hasPinned
                  ? "bg-wash-warning text-warning"
                  : "bg-muted text-ink-secondary",
              )}
            >
              {noteCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[400px] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-[420px] overflow-y-auto p-4">
          <NotesList
            category={entityType}
            entityId={entityId}
            facilityId={facilityId}
            audience={audience}
            compact
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
