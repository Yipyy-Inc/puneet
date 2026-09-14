"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useSaveCareNote } from "@/lib/api/care-note";

type Props = {
  /** The booking's ref — the Daily Care guest id. */
  bookingRef: string;
  petName: string;
  /** The note staff set on the booking, when there is one. */
  careNote?: string;
  /** The owner's own notes — shown when no stay note has been set. */
  fallbackNote?: string;
};

/**
 * Stay-long care note editor (A4.5 / A8.4). Saved on the booking, so it shows
 * on every PetRow across Daily Care, on every device, for the whole stay. It
 * was a Map in one browser tab.
 */
export function PetCareNoteCard({
  bookingRef,
  petName,
  careNote,
  fallbackNote,
}: Props) {
  const effective = careNote || fallbackNote || "";
  const save = useSaveCareNote();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  function openEditor() {
    setDraft(effective);
    setOpen(true);
  }

  function handleSave() {
    const text = draft.trim();
    save.mutate(
      { bookingRef, careNote: text },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success(
            text
              ? `Care note saved for ${petName}.`
              : `Care note cleared for ${petName}.`,
          );
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
      <div className="flex items-start gap-2">
        <StickyNote className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-amber-700">Stay care note</p>
          {effective ? (
            <p className="mt-0.5 text-sm whitespace-pre-wrap">{effective}</p>
          ) : (
            <p className="text-muted-foreground mt-0.5 text-sm italic">
              No care note yet — e.g. &ldquo;Needs extra cuddle time&rdquo;.
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={openEditor}
          className="h-7 shrink-0 gap-1 text-xs"
        >
          <Pencil className="size-3.5" />
          {effective ? "Edit" : "Add"}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Care note · {petName}
            </DialogTitle>
            <DialogDescription>
              Persists for the whole stay and shows throughout Daily Care.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="e.g. Call owner if she refuses food twice"
            className="resize-none"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={save.isPending}>
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
