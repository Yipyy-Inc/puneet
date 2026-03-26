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
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted shrink-0">
            <User className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-medium truncate block">
              {note.createdBy}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatNoteDate(note.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {subtypeStyle && (
            <Badge variant={subtypeStyle.variant} className="text-[10px]">
              {subtypeStyle.label}
            </Badge>
          )}
          {note.visibility === "internal" ? (
            <Badge variant="secondary" className="text-[10px] gap-0.5">
              <EyeOff className="h-2.5 w-2.5" />
              Internal
            </Badge>
          ) : (
            <Badge variant="info" className="text-[10px] gap-0.5">
              <Eye className="h-2.5 w-2.5" />
              Shared
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-sm whitespace-pre-wrap leading-relaxed">
        {displayContent}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline mt-1"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}

      {/* Footer — edited indicator + actions */}
      {(!readOnly || hasEdits) && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1">
            {hasEdits && (
              <button
                type="button"
                onClick={onViewHistory}
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors hover:underline cursor-pointer"
                aria-label="View edit history"
              >
                <History className="h-3 w-3" />
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
                  className="h-8 w-8 p-0"
                  onClick={onTogglePin}
                  aria-label={note.isPinned ? "Unpin note" : "Pin note"}
                  title={note.isPinned ? "Unpin" : "Pin"}
                >
                  {note.isPinned ? (
                    <PinOff className="h-4 w-4" />
                  ) : (
                    <Pin className="h-4 w-4" />
                  )}
                </Button>
              )}
              {onToggleVisibility && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
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
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={onEdit}
                  aria-label="Edit note"
                  title="Edit note"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      aria-label="Delete note"
                    >
                      <Trash2 className="h-4 w-4" />
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
