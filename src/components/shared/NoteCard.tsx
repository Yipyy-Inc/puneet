"use client";

import { useState } from "react";
import {
  Eye,
  EyeOff,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  History,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Note } from "@/data/tags-notes";
import { cn } from "@/lib/utils";
import { formatNoteDate } from "@/lib/format-utils";

interface NoteCardProps {
  note: Note;
  onEdit?: () => void;
  onDelete?: () => void;
  onTogglePin?: () => void;
  onToggleVisibility?: () => void;
  onViewHistory?: () => void;
  readOnly?: boolean;
}

const SUBTYPE_STYLES: Record<
  string,
  { label: string; variant: "default" | "info" | "destructive" | "success" }
> = {
  general: { label: "General", variant: "default" },
  behavior: { label: "Behavior", variant: "info" },
  medical: { label: "Medical", variant: "destructive" },
  feeding: { label: "Feeding", variant: "success" },
};

export function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleVisibility,
  onViewHistory,
  readOnly = false,
}: NoteCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = note.content.length > 200;
  const displayContent =
    isLong && !expanded ? note.content.slice(0, 200) + "..." : note.content;
  const hasEdits = note.editHistory.length > 0;
  const subtypeStyle = note.subType ? SUBTYPE_STYLES[note.subType] : null;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        note.isPinned && "border-primary/30 bg-primary/5",
      )}
    >
      {/* Header */}
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="bg-muted flex size-6 shrink-0 items-center justify-center rounded-full">
            <User className="text-muted-foreground size-3" />
          </div>
          <div className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {note.createdBy}
            </span>
            <span className="text-muted-foreground text-xs">
              {formatNoteDate(note.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {subtypeStyle && (
            <Badge variant={subtypeStyle.variant} className="text-[10px]">
              {subtypeStyle.label}
            </Badge>
          )}
          {note.visibility === "internal" ? (
            <Badge variant="secondary" className="gap-0.5 text-[10px]">
              <EyeOff className="h-2.5 w-2.5" />
              Internal
            </Badge>
          ) : (
            <Badge variant="info" className="gap-0.5 text-[10px]">
              <Eye className="h-2.5 w-2.5" />
              Shared
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-sm/relaxed whitespace-pre-wrap">{displayContent}</p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-primary mt-1 text-xs hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}

      {/* Footer — edited indicator + actions */}
      {(!readOnly || hasEdits) && (
        <div className="border-border/50 mt-2 flex items-center justify-between border-t pt-2">
          <div className="flex items-center gap-1">
            {hasEdits && (
              <button
                type="button"
                onClick={onViewHistory}
                className="text-muted-foreground hover:text-primary flex cursor-pointer items-center gap-0.5 text-xs transition-colors hover:underline"
                aria-label="View edit history"
              >
                <History className="size-3" />
                <span>
                  Edited
                  {note.updatedAt ? ` ${formatNoteDate(note.updatedAt)}` : ""}
                </span>
              </button>
            )}
          </div>
          {!readOnly && (
            <div className="flex items-center gap-0.5">
              {onTogglePin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  onClick={onTogglePin}
                  aria-label={note.isPinned ? "Unpin note" : "Pin note"}
                  title={note.isPinned ? "Unpin" : "Pin"}
                >
                  {note.isPinned ? (
                    <PinOff className="size-4" />
                  ) : (
                    <Pin className="size-4" />
                  )}
                </Button>
              )}
              {onToggleVisibility && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  onClick={onToggleVisibility}
                  aria-label={
                    note.visibility === "internal"
                      ? "Make visible to customer"
                      : "Make internal only"
                  }
                  title={
                    note.visibility === "internal"
                      ? "Make visible to customer"
                      : "Make internal only"
                  }
                >
                  {note.visibility === "internal" ? (
                    <Eye className="size-4" />
                  ) : (
                    <EyeOff className="size-4" />
                  )}
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  onClick={onEdit}
                  aria-label="Edit note"
                  title="Edit note"
                >
                  <Pencil className="size-4" />
                </Button>
              )}
              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive size-7 p-0"
                      aria-label="Delete note"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Note</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this note. This action
                        cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={onDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
