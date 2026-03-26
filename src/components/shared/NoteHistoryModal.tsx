"use client";

import { Modal } from "@/components/ui/modal";
import { User } from "lucide-react";
import type { NoteEdit } from "@/data/tags-notes";
import { formatNoteDate } from "@/lib/format-utils";

interface NoteHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  edits: NoteEdit[];
  currentContent: string;
}

export function NoteHistoryModal({
  open,
  onOpenChange,
  edits,
  currentContent,
}: NoteHistoryModalProps) {
  const sortedEdits = [...edits].sort(
    (a, b) => new Date(b.editedAt).getTime() - new Date(a.editedAt).getTime(),
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      type="details"
      title="Edit History"
      size="md"
    >
      <div className="space-y-4" role="region" aria-label="Edit history">
        {/* Current version */}
        <div className="border-primary/20 bg-primary/5 rounded-lg border p-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="text-primary text-xs font-medium tracking-wider uppercase">
              Current Version
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{currentContent}</p>
        </div>

        {/* Edit history timeline */}
        <ol className="list-none space-y-0" aria-label="Previous versions">
          {sortedEdits.map((edit, index) => (
            <li key={edit.id} className="relative pl-6">
              {/* Timeline line */}
              {index < sortedEdits.length - 1 && (
                <div className="bg-border absolute top-6 bottom-0 left-[11px] w-px" />
              )}
              {/* Timeline dot */}
              <div className="border-border bg-muted absolute top-1 left-0 flex size-6 items-center justify-center rounded-full border">
                <User className="text-muted-foreground size-3" />
              </div>

              <div className="pb-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-medium">{edit.editedBy}</span>
                  <span className="text-muted-foreground text-xs">
                    {formatNoteDate(edit.editedAt)}
                  </span>
                </div>

                {/* Previous content */}
                <div className="mb-1 rounded-sm border bg-red-50/50 p-2 dark:bg-red-950/20">
                  <span className="text-[10px] font-medium tracking-wider text-red-600 uppercase dark:text-red-400">
                    Previous
                  </span>
                  <p className="text-muted-foreground mt-0.5 text-xs whitespace-pre-wrap">
                    {edit.previousContent}
                  </p>
                </div>

                {/* New content */}
                <div className="rounded-sm border bg-green-50/50 p-2 dark:bg-green-950/20">
                  <span className="text-[10px] font-medium tracking-wider text-green-600 uppercase dark:text-green-400">
                    Changed to
                  </span>
                  <p className="mt-0.5 text-xs whitespace-pre-wrap">
                    {edit.newContent}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {sortedEdits.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No edit history
          </p>
        )}
      </div>
    </Modal>
  );
}
