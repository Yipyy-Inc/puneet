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
import { useShellText, useShellLocale } from "@/lib/shell/use-shell-text";

interface NoteCardProps {
  note: Note;
  onEdit?: () => void;
  onDelete?: () => void;
  onTogglePin?: () => void;
  onToggleVisibility?: () => void;
  onViewHistory?: () => void;
  readOnly?: boolean;
}

// A note's kind, by CATALOGUE KEY; only the badge variant is decided here.
const SUBTYPE_STYLES: Record<
  string,
  { labelKey: string; variant: "default" | "info" | "destructive" | "success" }
> = {
  general: { labelKey: "noteGeneral", variant: "default" },
  behavior: { labelKey: "noteBehaviour", variant: "info" },
  medical: { labelKey: "noteMedical", variant: "destructive" },
  feeding: { labelKey: "noteFeeding", variant: "success" },
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
  const t = useShellText("shared");
  const locale = useShellLocale();
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
              {formatNoteDate(note.createdAt, locale)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {subtypeStyle && (
            <Badge variant={subtypeStyle.variant} className="text-[10px]">
              {t(subtypeStyle.labelKey)}
            </Badge>
          )}
          {note.visibility === "internal" ? (
            <Badge variant="secondary" className="gap-0.5 text-[10px]">
              <EyeOff className="h-2.5 w-2.5" />
              {t("badgeInternal")}
            </Badge>
          ) : (
            <Badge variant="info" className="gap-0.5 text-[10px]">
              <Eye className="h-2.5 w-2.5" />
              {t("badgeShared")}
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
          {expanded ? t("showLess") : t("showMore")}
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
                aria-label={t("viewEditHistory")}
              >
                <History className="size-3" />
                <span>
                  {note.updatedAt
                    ? t("editedOn").replace(
                        "{date}",
                        formatNoteDate(note.updatedAt, locale),
                      )
                    : t("edited")}
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
                  aria-label={note.isPinned ? t("unpinNote") : t("pinNote")}
                  title={note.isPinned ? t("unpin") : t("pin")}
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
                      ? t("makeVisible")
                      : t("makeInternal")
                  }
                  title={
                    note.visibility === "internal"
                      ? t("makeVisible")
                      : t("makeInternal")
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
                  aria-label={t("editNote")}
                  title={t("editNote")}
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
                      aria-label={t("deleteNote")}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("deleteNoteTitle")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("deleteNoteBody")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={onDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t("deleteNote")}
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
