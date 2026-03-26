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
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs font-medium text-primary uppercase tracking-wider">
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
                <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
              )}
              {/* Timeline dot */}
              <div className="absolute left-0 top-1 flex items-center justify-center h-6 w-6 rounded-full bg-muted border border-border">
                <User className="h-3 w-3 text-muted-foreground" />
              </div>

              <div className="pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{edit.editedBy}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatNoteDate(edit.editedAt)}
                  </span>
                </div>

                {/* Previous content */}
                <div className="rounded border bg-red-50/50 dark:bg-red-950/20 p-2 mb-1">
                  <span className="text-[10px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">
                    Previous
                  </span>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-0.5">
                    {edit.previousContent}
                  </p>
                </div>

                {/* New content */}
                <div className="rounded border bg-green-50/50 dark:bg-green-950/20 p-2">
                  <span className="text-[10px] font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">
                    Changed to
                  </span>
                  <p className="text-xs whitespace-pre-wrap mt-0.5">
                    {edit.newContent}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {sortedEdits.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No edit history
          </p>
        )}
      </div>
    </Modal>
  );
}
