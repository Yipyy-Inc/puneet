"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Pin, PinOff, Lock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InternalNote } from "@/types/messaging";
import { toast } from "sonner";
import { useShellText, useShellLocale } from "@/lib/shell/use-shell-text";
import type { AppLocale } from "@/lib/language-settings";
import { formatRelative } from "@/lib/i18n/format";

// The SEVENTH hand-rolled relative clock found in this conversion. It is
// formatRelative: Intl, the reader's locale, and a date past 24 hours (§5q).
function relTime(iso: string, locale: AppLocale) {
  return formatRelative(iso, locale);
}

export function InternalNotesTab({
  threadId,
  initialNotes,
}: {
  threadId: string;
  initialNotes: InternalNote[];
}) {
  const t = useShellText("messaging");
  const locale = useShellLocale();
  const [notes, setNotes] = useState<InternalNote[]>(() =>
    [...initialNotes].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }),
  );
  const [body, setBody] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const addNote = () => {
    if (!body.trim()) return;
    const note: InternalNote = {
      id: `note-${Date.now()}`,
      threadId,
      body: body.trim(),
      author: "You",
      createdAt: new Date().toISOString(),
      pinned: false,
    };
    setNotes((prev) => [note, ...prev]);
    setBody("");
    setIsAdding(false);
    toast.success(t("internalNoteAdded"));
  };

  const togglePin = (id: string) => {
    setNotes((prev) => {
      const updated = prev.map((n) =>
        n.id === id ? { ...n, pinned: !n.pinned } : n,
      );
      return [...updated].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    });
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    toast.success(t("noteRemoved"));
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-amber-50/40 px-5 py-3">
        <div className="flex items-center gap-2">
          <Lock className="size-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-800">
            {t("staffOnlyNotes")}
          </span>
          <Badge className="bg-amber-100 text-[10px] text-amber-700">
            {notes.length}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 rounded-full border-amber-200 text-xs text-amber-700 hover:bg-amber-100"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="size-3.5" />
          {t("addNote")}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Compose area */}
        {isAdding && (
          <div className="border-border border-b bg-amber-50/30 p-4">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("addAStaffOnlyNote")}
              className="min-h-[80px] resize-none border-amber-200 bg-white text-sm focus-visible:ring-amber-300"
              autoFocus
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-full text-xs"
                onClick={() => {
                  setIsAdding(false);
                  setBody("");
                }}
              >
                {t("cancel")}
              </Button>
              <Button
                size="sm"
                className="h-8 rounded-full bg-amber-600 text-xs hover:bg-amber-700"
                disabled={!body.trim()}
                onClick={addNote}
              >
                {t("saveNote")}
              </Button>
            </div>
          </div>
        )}

        {/* Notes list */}
        {notes.length === 0 && !isAdding ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Lock className="size-10 text-slate-200" />
            <p className="mt-3 text-sm text-slate-400">
              {t("noInternalNotesYet")}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {t("staffNotesAreNeverVisible")}
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {notes.map((note) => (
              <div
                key={note.id}
                className={cn(
                  "relative border-b border-slate-100 p-4",
                  note.pinned && "bg-amber-50/50",
                )}
              >
                {note.pinned && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-amber-100 text-[9px] text-amber-700">
                      <Pin className="mr-1 size-2.5" />
                      {t("pinned")}
                    </Badge>
                  </div>
                )}
                <p className="pr-16 text-sm/relaxed text-slate-700">
                  {note.body}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-500">
                      {note.author}
                    </span>
                    <span>·</span>
                    <span>{relTime(note.createdAt, locale)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title={note.pinned ? t("unpin") : t("pin")}
                      onClick={() => togglePin(note.id)}
                      className="rounded-sm p-1 text-slate-300 hover:bg-amber-100 hover:text-amber-600"
                    >
                      {note.pinned ? (
                        <PinOff className="size-3.5" />
                      ) : (
                        <Pin className="size-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      title={t("deleteNote")}
                      onClick={() => deleteNote(note.id)}
                      className="rounded-sm p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"
                    >
                      <span className="text-xs">✕</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
