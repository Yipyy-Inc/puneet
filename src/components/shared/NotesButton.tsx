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

interface NotesButtonProps {
  entityType: NoteCategory;
  entityId: number;
  facilityId?: number;
  className?: string;
}

export function NotesButton({
  entityType,
  entityId,
  facilityId = 11,
  className,
}: NotesButtonProps) {
  const [open, setOpen] = useState(false);
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
            "h-8 gap-1.5 rounded-lg text-xs",
            hasPinned &&
              "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100",
            className,
          )}
        >
          {hasPinned ? (
            <Pin className="size-3.5" />
          ) : (
            <MessageSquare className="size-3.5" />
          )}
          Notes
          {noteCount > 0 && (
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                hasPinned
                  ? "bg-amber-200 text-amber-800"
                  : "bg-muted text-muted-foreground",
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
            compact
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
